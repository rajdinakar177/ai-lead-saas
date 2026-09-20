import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireBusiness } from "@/lib/auth";

import { createGoogleOAuthClient } from "@/lib/google-calendar/oauth";
import { decryptToken } from "@/lib/security/token-encryption";

import { GoogleCalendarIntegration } from "@/models/GoogleCalendarIntegration";
import { validateRequestOrigin } from "@/lib/security/origin-protection";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const originError = validateRequestOrigin(request);

    if (originError) {
      return originError;
    }
    const business = await requireBusiness();

    await connectDB();

    const integration = await GoogleCalendarIntegration.findOne({
      businessId: business._id,
    });

    if (!integration) {
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }

    /*
     * Try to revoke Google's credentials.
     *
     * Tokens are encrypted at rest in
     * MongoDB, so decrypt the selected
     * token before sending it to Google.
     *
     * decryptToken() also supports legacy
     * plaintext tokens during migration.
     *
     * Revocation is an external operation,
     * so failure here must not prevent
     * Leadquivo from locally disconnecting.
     */
    const storedTokenToRevoke = integration.refreshToken || integration.accessToken;

    if (storedTokenToRevoke) {
      try {
        const tokenToRevoke = decryptToken(storedTokenToRevoke);

        const oauthClient = createGoogleOAuthClient();

        await oauthClient.revokeToken(tokenToRevoke);
      } catch (revokeError) {
        console.error("Google Calendar token revocation failed:", revokeError);
      }
    }

    /*
     * Remove credentials from Leadquivo.
     *
     * Keep:
     * - businessId
     * - googleEmail
     * - calendarId
     *
     * This gives us useful integration
     * history while removing credentials.
     */
    integration.connected = false;
    integration.connectedAt = null;

    integration.accessToken = null;

    integration.refreshToken = null;

    integration.expiryDate = null;

    integration.scope = null;

    integration.tokenType = null;

    integration.lastSyncError = null;

    await integration.save();

    return NextResponse.json({
      success: true,
      connected: false,
    });
  } catch (error) {
    console.error("Google Calendar disconnect error:", error);

    return NextResponse.json(
      {
        error: "Unable to disconnect Google Calendar.",
      },
      {
        status: 500,
      },
    );
  }
}
