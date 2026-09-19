import {
  NextRequest,
  NextResponse,
} from "next/server";

import { google } from "googleapis";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { createGoogleOAuthClient } from "@/lib/google-calendar/oauth";

import {
  encryptToken,
} from "@/lib/security/token-encryption";

import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    await connectDB();

    /*
     * Business must still be logged in
     * when Google redirects back.
     */
    const business =
      await requireBusiness();

    if (!business) {
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }

    const searchParams =
      request.nextUrl.searchParams;

    const code =
      searchParams.get("code");

    const returnedState =
      searchParams.get("state");

    const googleError =
      searchParams.get("error");

    /*
     * User denied/cancelled Google's
     * authorization screen.
     */
    if (googleError) {
      console.error(
        "Google OAuth returned error:",
        googleError
      );

      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?googleCalendar=cancelled",
          request.url
        )
      );
    }

    if (
      !code ||
      !returnedState
    ) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?googleCalendar=invalid",
          request.url
        )
      );
    }

    /*
     * Read the state that our Connect
     * route stored before redirecting
     * the business to Google.
     */
    const storedState =
      request.cookies.get(
        "google_calendar_oauth_state"
      )?.value;

    if (
      !storedState ||
      storedState !== returnedState
    ) {
      console.error(
        "Google Calendar OAuth state mismatch."
      );

      return NextResponse.redirect(
        new URL(
          "/dashboard/settings?googleCalendar=invalid_state",
          request.url
        )
      );
    }

    /*
     * Exchange Google's temporary
     * authorization code for tokens.
     */
    const oauthClient =
      createGoogleOAuthClient();

    const {
      tokens,
    } =
      await oauthClient.getToken(
        code
      );

    oauthClient.setCredentials(
      tokens
    );

    /*
     * Get the Google account email
     * so the dashboard can show which
     * account is connected.
     */
    const oauth2 =
      google.oauth2({
        version: "v2",
        auth: oauthClient,
      });

    const userInfo =
      await oauth2.userinfo.get();

    const googleEmail =
      userInfo.data.email ??
      null;

    /*
     * Load the existing integration.
     *
     * Google may not always return a new
     * refresh token during reconnect.
     */
    const existingIntegration =
      await GoogleCalendarIntegration.findOne({
        businessId:
          business._id,
      });

    /*
     * Encrypt the new access token before
     * it is stored in MongoDB.
     */
    const encryptedAccessToken =
      tokens.access_token
        ? encryptToken(
            tokens.access_token
          )
        : null;

    /*
     * Prefer Google's newly-issued refresh
     * token.
     *
     * If Google did not return one, preserve
     * the existing value. encryptToken()
     * safely handles both:
     *
     * - legacy plaintext token -> encrypted
     * - already encrypted token -> unchanged
     */
    const refreshTokenSource =
      tokens.refresh_token ??
      existingIntegration
        ?.refreshToken ??
      null;

    const encryptedRefreshToken =
      refreshTokenSource
        ? encryptToken(
            refreshTokenSource
          )
        : null;

    /*
     * Store/update this business's
     * Google Calendar connection.
     *
     * accessToken and refreshToken are now
     * encrypted before entering MongoDB.
     */
    await GoogleCalendarIntegration.findOneAndUpdate(
      {
        businessId:
          business._id,
      },
      {
        $set: {
          googleEmail,

          calendarId:
            existingIntegration
              ?.calendarId ||
            "primary",

          accessToken:
            encryptedAccessToken,

          refreshToken:
            encryptedRefreshToken,

          expiryDate:
            tokens.expiry_date
              ? new Date(
                  tokens.expiry_date
                )
              : null,

          scope:
            tokens.scope ??
            null,

          tokenType:
            tokens.token_type ??
            null,

          connected: true,

          connectedAt:
            new Date(),

          lastSyncError:
            null,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    const response =
      NextResponse.redirect(
        new URL(
          "/dashboard/settings?googleCalendar=connected",
          request.url
        )
      );

    /*
     * OAuth state is single-use.
     * Remove it after successful
     * verification.
     */
    response.cookies.set(
      "google_calendar_oauth_state",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Google Calendar callback error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?googleCalendar=error",
        request.url
      )
    );
  }
}