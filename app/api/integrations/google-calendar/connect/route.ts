import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { getCurrentBusiness } from "@/lib/auth";

import { getGoogleCalendarAuthorizationUrl } from "@/lib/google-calendar/oauth";
import { safeLogger } from "@/lib/security/safe-logger";
import { hasSubscriptionFeature } from "@/lib/subscription-access";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const business = await getCurrentBusiness();

    if (!business) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        },
      );
    }
    const googleCalendarEnabled = hasSubscriptionFeature(business.subscription, "googleCalendar");

    if (!googleCalendarEnabled) {
      return NextResponse.json(
        {
          error: "Google Calendar integration requires the Pro plan.",
          code: "PRO_FEATURE_REQUIRED",
        },
        {
          status: 403,
        },
      );
    }
    /*
     * Generate a cryptographically
     * secure OAuth state.
     *
     * Do NOT expose the business ID
     * inside the state value.
     */
    const state = randomBytes(32).toString("hex");

    const authorizationUrl = getGoogleCalendarAuthorizationUrl(state);

    const response = NextResponse.redirect(authorizationUrl);

    /*
     * Store state in an httpOnly cookie.
     *
     * Google will return the same state
     * to our callback. The callback must
     * match it before accepting tokens.
     */
    response.cookies.set("google_calendar_oauth_state", state, {
      httpOnly: true,

      secure: process.env.NODE_ENV === "production",

      sameSite: "lax",

      path: "/",

      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    safeLogger.error("Google Calendar connect error.", error);

    return NextResponse.json(
      {
        error: "Unable to connect Google Calendar.",
      },
      {
        status: 500,
      },
    );
  }
}
