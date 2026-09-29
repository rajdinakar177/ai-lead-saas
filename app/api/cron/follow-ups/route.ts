import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { canFollowUp, getNextFollowUpAt, MAX_FOLLOW_UPS } from "@/lib/follow-up";

import { sendSmsReply } from "@/lib/sms/send-sms-reply";
import { safeLogger } from "@/lib/security/safe-logger";
import { Lead } from "@/models/Lead";
import { Message } from "@/models/Message";
import { Business } from "@/models/Business";
import { hasSubscriptionFeature } from "@/lib/subscription-access";

/* =========================================================
   SETTINGS
   ========================================================= */

/*
 * While a follow-up is being processed, temporarily move
 * nextFollowUpAt into the future.
 *
 * This acts like a small processing lock / lease.
 *
 * If the process crashes before finishing, the lead becomes
 * eligible again after this period.
 */
const CLAIM_DURATION_MS = 5 * 60 * 1000;

/* =========================================================
   FOLLOW-UP MESSAGES
   ========================================================= */

function getFollowUpMessage(followUpCount: number, service?: string | null) {
  const serviceText = service ? ` about your ${service} request` : "";

  if (followUpCount === 0) {
    return `Hi! Just checking in${serviceText}. Are you still looking for help?`;
  }

  if (followUpCount === 1) {
    return `Hi again! We wanted to follow up${serviceText}. Let us know if you'd still like to continue.`;
  }

  return `Just one last follow-up${serviceText}. If you still need help, reply here anytime and we'll be happy to assist.`;
}

/* =========================================================
   AUTHORIZATION
   ========================================================= */

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    safeLogger.error("CRON_SECRET is not configured.");

    return false;
  }

  const authorization = request.headers.get("authorization");

  return authorization === `Bearer ${cronSecret}`;
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(request: Request) {
  try {
    /* =====================================================
       VERIFY CRON SECRET
       ===================================================== */

    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    await connectDB();

    const startedAt = new Date();

    /* =====================================================
       FIND POSSIBLE DUE LEADS

       This is only the candidate list.

       Each lead must still be atomically claimed below
       before a follow-up can be sent.
       ===================================================== */

    const dueLeads = await Lead.find({
      "followUp.enabled": true,

      "followUp.nextFollowUpAt": {
        $ne: null,

        $lte: startedAt,
      },

      "followUp.count": {
        $lt: MAX_FOLLOW_UPS,
      },

      status: {
        $in: ["new", "warm", "hot", "qualified"],
      },

      phone: {
        $exists: true,

        $nin: [null, ""],
      },
    })
      .sort({
        "followUp.nextFollowUpAt": 1,
      })
      .limit(100)
      .select("_id businessId followUp")
      .lean();

    let claimed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    /* =====================================================
       PROCESS CANDIDATES
       ===================================================== */

    for (const candidate of dueLeads) {
      const business = await Business.findById(candidate.businessId).lean();

      if (!business) {
        await Lead.updateOne(
          {
            _id: candidate._id,
          },
          {
            $set: {
              "followUp.enabled": false,
              "followUp.nextFollowUpAt": null,
            },
          },
        );

        skipped++;

        continue;
      }

      const automatedFollowUpsEnabled = hasSubscriptionFeature(
        business.subscription,
        "automatedFollowUps",
      );

      if (!automatedFollowUpsEnabled) {
        await Lead.updateOne(
          {
            _id: candidate._id,
          },
          {
            $set: {
              "followUp.enabled": false,
              "followUp.nextFollowUpAt": null,
            },
          },
        );

        skipped++;

        continue;
      }
      /*
       * We remember the exact state seen in the candidate.
       *
       * The atomic claim below requires that the database
       * still has the same follow-up count and due timestamp.
       */
      const candidateCount = candidate.followUp?.count ?? 0;

      const originalNextFollowUpAt = candidate.followUp?.nextFollowUpAt;

      if (!originalNextFollowUpAt) {
        skipped++;

        continue;
      }

      const claimUntil = new Date(Date.now() + CLAIM_DURATION_MS);

      /* ===================================================
         ATOMIC CLAIM

         Only ONE cron worker can successfully change this
         exact due follow-up into the temporary claim time.

         If another worker already claimed it, MongoDB
         returns null.
         =================================================== */

      const lead = await Lead.findOneAndUpdate(
        {
          _id: candidate._id,

          "followUp.enabled": true,

          "followUp.count": candidateCount,

          "followUp.nextFollowUpAt": originalNextFollowUpAt,

          status: {
            $in: ["new", "warm", "hot", "qualified"],
          },

          phone: {
            $exists: true,

            $nin: [null, ""],
          },
        },
        {
          $set: {
            "followUp.nextFollowUpAt": claimUntil,
          },
        },
        {
          returnDocument: "after",
        },
      );

      /* ===================================================
         ANOTHER WORKER ALREADY CLAIMED / CHANGED LEAD
         =================================================== */

      if (!lead) {
        skipped++;

        continue;
      }
      claimed++;

      try {
        const followUpCount = lead.followUp?.count ?? 0;

        /* =================================================
           FINAL SAFETY CHECK
           ================================================= */

        if (!canFollowUp(lead.status, lead.phone)) {
          await Lead.updateOne(
            {
              _id: lead._id,

              "followUp.nextFollowUpAt": claimUntil,
            },
            {
              $set: {
                "followUp.enabled": false,

                "followUp.nextFollowUpAt": null,
              },
            },
          );

          skipped++;

          continue;
        }

        /* =================================================
           VERIFY CLAIM STILL BELONGS TO THIS WORKER

           A customer may have replied after this cron
           initially found the lead.

           The SMS/web chat route changes nextFollowUpAt when
           that happens.

           If our temporary claim timestamp is no longer
           present, stop and do not send the stale follow-up.
           ================================================= */

        const stillClaimed = await Lead.findOne({
          _id: lead._id,

          "followUp.enabled": true,

          "followUp.count": followUpCount,

          "followUp.nextFollowUpAt": claimUntil,

          status: {
            $in: ["new", "warm", "hot", "qualified"],
          },

          phone: {
            $exists: true,

            $nin: [null, ""],
          },
        });

        if (!stillClaimed) {
          skipped++;

          continue;
        }

        /* =================================================
           BUILD FOLLOW-UP MESSAGE
           ================================================= */

        const followUpMessage = getFollowUpMessage(followUpCount, stillClaimed.service);

        /* =================================================
           SEND SMS
           ================================================= */

        await sendSmsReply({
          business,

          to: stillClaimed.phone,

          body: followUpMessage,
        });

        /* =================================================
           SAVE OUTBOUND MESSAGE
           ================================================= */

        await Message.create({
          leadId: stillClaimed._id,

          sender: "ai",

          content: followUpMessage,
        });

        /* =================================================
           UPDATE FOLLOW-UP STATE
           ================================================= */

        const sentAt = new Date();

        const newCount = followUpCount + 1;

        const nextFollowUpAt =
          newCount >= MAX_FOLLOW_UPS ? null : getNextFollowUpAt(newCount, sentAt);

        /* =================================================
           FINALIZE ONLY IF WE STILL OWN THE CLAIM

           This prevents this worker from overwriting a
           customer reply that changed the follow-up state.
           ================================================= */

        const updateResult = await Lead.updateOne(
          {
            _id: stillClaimed._id,

            "followUp.count": followUpCount,

            "followUp.nextFollowUpAt": claimUntil,
          },
          {
            $set: {
              "followUp.count": newCount,

              "followUp.lastFollowUpAt": sentAt,

              "followUp.enabled": newCount < MAX_FOLLOW_UPS,

              "followUp.nextFollowUpAt": nextFollowUpAt,
            },
          },
        );

        if (updateResult.modifiedCount === 0) {
          safeLogger.warn("Follow-up sent but final state changed before completion.", {
            leadId: stillClaimed._id.toString(),
          });
        }

        sent++;
      } catch (error) {
        failed++;

        safeLogger.error("Follow-up processing failed.", error, {
          leadId: lead._id.toString(),
        });

        /* =================================================
           RELEASE / RETRY CLAIM AFTER FAILURE

           Only restore the original due time if our claim
           is still present.

           If the customer replied in the meantime, their
           newer follow-up state will not be overwritten.
           ================================================= */

        try {
          await Lead.updateOne(
            {
              _id: lead._id,

              "followUp.count": candidateCount,

              "followUp.nextFollowUpAt": claimUntil,
            },
            {
              $set: {
                "followUp.nextFollowUpAt": originalNextFollowUpAt,
              },
            },
          );
        } catch (releaseError) {
          safeLogger.error("Unable to release failed follow-up claim.", releaseError, {
            leadId: lead._id.toString(),
          });
        }
      }
    }

    /* =====================================================
       RESULT
       ===================================================== */

    return NextResponse.json({
      success: true,

      checked: dueLeads.length,

      claimed,

      sent,

      skipped,

      failed,

      processedAt: startedAt.toISOString(),
    });
  } catch (error) {
    safeLogger.error("Follow-up cron error.", error);

    return NextResponse.json(
      {
        error: "Unable to process follow-ups.",
      },
      {
        status: 500,
      },
    );
  }
}
