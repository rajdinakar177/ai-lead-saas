import { google } from "googleapis";

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google Calendar OAuth environment variables are not configured.",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];
export function getGoogleCalendarAuthorizationUrl(state: string) {
  const oauthClient = createGoogleOAuthClient();

  return oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
    include_granted_scopes: true,
  });
}
