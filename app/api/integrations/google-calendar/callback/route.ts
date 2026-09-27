import { NextRequest, NextResponse } from "next/server";

import { google } from "googleapis";

import { connectDB } from "@/lib/mongodb";
import { getCurrentBusiness } from "@/lib/auth";
import { createGoogleOAuthClient } from "@/lib/google-calendar/oauth";
import { encryptToken } from "@/lib/security/token-encryption";
import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";
import crypto from "crypto";
import { safeLogger } from "@/lib/security/safe-logger";
export const dynamic = "force-dynamic";
function safeStateEqual(storedState: string, returnedState: string) {
  const storedBuffer = Buffer.from(storedState);
  const returnedBuffer = Buffer.from(returnedState);

  if (storedBuffer.length !== returnedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, returnedBuffer);
}
/* =========================================
   CLEAR OAUTH STATE COOKIE
========================================= */

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set("google_calendar_oauth_state", "", {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    path: "/",

    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    /*
     * Business must still be logged in
     * when Google redirects back.
     */
    const business = await getCurrentBusiness();

    if (!business) {
      return clearOAuthStateCookie(NextResponse.redirect(new URL("/login", request.url)));
    }

    const searchParams = request.nextUrl.searchParams;

    const code = searchParams.get("code");

    const returnedState = searchParams.get("state");

    const googleError = searchParams.get("error");

    /*
     * User denied/cancelled Google's
     * authorization screen.
     */
    if (googleError) {
      safeLogger.warn("Google OAuth authorization was not completed.");
      return clearOAuthStateCookie(
        NextResponse.redirect(new URL("/dashboard/settings?googleCalendar=cancelled", request.url)),
      );
    }

    /*
     * Google must return both the
     * authorization code and state.
     */
    if (!code || !returnedState) {
      return clearOAuthStateCookie(
        NextResponse.redirect(new URL("/dashboard/settings?googleCalendar=invalid", request.url)),
      );
    }

    /*
     * Read the state that our Connect
     * route stored before redirecting
     * the business to Google.
     */
    const storedState = request.cookies.get("google_calendar_oauth_state")?.value;

    /*
     * Reject callback if the returned
     * state does not match our cookie.
     *
     * Clear the cookie so the state
     * cannot be reused.
     */
    if (!storedState || !safeStateEqual(storedState, returnedState)) {
      safeLogger.warn("Google Calendar OAuth state mismatch.");

      return clearOAuthStateCookie(
        NextResponse.redirect(
          new URL("/dashboard/settings?googleCalendar=invalid_state", request.url),
        ),
      );
    }

    /*
     * Exchange Google's temporary
     * authorization code for tokens.
     */
    const oauthClient = createGoogleOAuthClient();

    const { tokens } = await oauthClient.getToken(code);

    oauthClient.setCredentials(tokens);

    /*
     * Get Google account email.
     */
    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauthClient,
    });

    const userInfo = await oauth2.userinfo.get();

    const googleEmail = userInfo.data.email ?? null;

    /*
     * Load only this authenticated
     * business's integration.
     */
    const existingIntegration = await GoogleCalendarIntegration.findOne({
      businessId: business._id,
    });

    /*
     * Encrypt access token before
     * storing it in MongoDB.
     */
    const encryptedAccessToken = tokens.access_token ? encryptToken(tokens.access_token) : null;

    /*
     * Prefer Google's newly issued
     * refresh token.
     *
     * Google may omit a refresh token
     * during reconnect, so preserve the
     * existing one when necessary.
     */
    const refreshTokenSource = tokens.refresh_token ?? existingIntegration?.refreshToken ?? null;

    const encryptedRefreshToken = refreshTokenSource ? encryptToken(refreshTokenSource) : null;

    /*
     * Save only this authenticated
     * business's Google integration.
     */
    await GoogleCalendarIntegration.findOneAndUpdate(
      {
        businessId: business._id,
      },
      {
        $set: {
          googleEmail,

          calendarId: existingIntegration?.calendarId || "primary",

          accessToken: encryptedAccessToken,

          refreshToken: encryptedRefreshToken,

          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,

          scope: tokens.scope ?? null,

          tokenType: tokens.token_type ?? null,

          connected: true,

          connectedAt: new Date(),

          lastSyncError: null,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    /*
     * Successful connection.
     */
    const response = NextResponse.redirect(
      new URL("/dashboard/settings?googleCalendar=connected", request.url),
    );

    /*
     * OAuth state is single-use.
     */
    return clearOAuthStateCookie(response);
  } catch (error) {
    safeLogger.error("Google Calendar callback error.", error);
    return NextResponse.redirect(new URL("/dashboard/settings?googleCalendar=error", request.url));
  }
}
