import { google } from "googleapis";

import { connectDB } from "@/lib/mongodb";
import { createGoogleOAuthClient } from "@/lib/google-calendar/oauth";

import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";

type GetGoogleCalendarClientParams = {
  businessId: string;
};

export async function getGoogleCalendarClient({
  businessId,
}: GetGoogleCalendarClientParams) {
  await connectDB();

  const integration =
    await GoogleCalendarIntegration.findOne({
      businessId,
      connected: true,
    });

  if (!integration) {
    return null;
  }

  if (!integration.refreshToken) {
    throw new Error(
      "Google Calendar refresh token is missing. Reconnect Google Calendar."
    );
  }

  const oauthClient =
    createGoogleOAuthClient();

  oauthClient.setCredentials({
    access_token:
      integration.accessToken || undefined,

    refresh_token:
      integration.refreshToken,

    expiry_date:
      integration.expiryDate
        ? new Date(
            integration.expiryDate
          ).getTime()
        : undefined,

    scope:
      integration.scope || undefined,

    token_type:
      integration.tokenType || undefined,
  });

  /*
   * Google may refresh the access token
   * automatically when an API request is
   * made.
   *
   * Save any new credentials Google gives
   * us back to MongoDB.
   */
  oauthClient.on(
    "tokens",
    async (tokens) => {
      try {
        const update: Record<
          string,
          unknown
        > = {
          lastSyncError: null,
        };

        if (tokens.access_token) {
          update.accessToken =
            tokens.access_token;
        }

        if (tokens.refresh_token) {
          update.refreshToken =
            tokens.refresh_token;
        }

        if (tokens.expiry_date) {
          update.expiryDate =
            new Date(
              tokens.expiry_date
            );
        }

        if (tokens.scope) {
          update.scope =
            tokens.scope;
        }

        if (tokens.token_type) {
          update.tokenType =
            tokens.token_type;
        }

        await GoogleCalendarIntegration.updateOne(
          {
            _id: integration._id,
          },
          {
            $set: update,
          }
        );
      } catch (error) {
        console.error(
          "Unable to save refreshed Google Calendar credentials:",
          error
        );
      }
    }
  );

  const calendar =
    google.calendar({
      version: "v3",
      auth: oauthClient,
    });

  return {
    calendar,

    oauthClient,

    integration,

    calendarId:
      integration.calendarId ||
      "primary",
  };
}