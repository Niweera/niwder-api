import keys from "../keys";
import { Auth, google } from "googleapis";
import FirebaseService from "./FirebaseService";
import { AccessDeniedError } from "../errors";

export default class OAuthService {
  private readonly client: Auth.OAuth2Client;
  private readonly firebaseService: FirebaseService;

  constructor() {
    this.client = new google.auth.OAuth2(
      keys.GOOGLE_DRIVE_CLIENT_ID,
      keys.GOOGLE_DRIVE_CLIENT_SECRET,
      keys.GOOGLE_DRIVE_REDIRECT_URI
    );

    this.firebaseService = new FirebaseService();
  }

  getRedirectURL = async (uid: string): Promise<string> => {
    /**
     * Remove permissions if needed a new refresh token
     * https://myaccount.google.com/u/6/permissions?pageId=none
     */
    const scopes: string[] = ["https://www.googleapis.com/auth/drive"];

    await this.firebaseService.requestRefreshToken(uid);

    return this.client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: uid,
      prompt: "consent",
    });
  };

  revokeAuthorization = async (uid: string): Promise<string> => {
    await this.firebaseService.revokeRefreshToken(uid);
    return "https://myaccount.google.com/u/0/permissions?pageId=none";
  };

  handleCallback = async (
    code: string,
    uid: string,
    error: string
  ): Promise<string> => {
    if (error) return `${keys.OAUTH_REDIRECT_URL}?error=${error}`;

    if (!code || !uid) throw new AccessDeniedError("Access Denied");

    const isRequesting = await this.firebaseService.checkForRequesting(uid);

    if (isRequesting) {
      const response = await this.client.getToken(code);
      await this.firebaseService.recordRefreshToken(
        uid,
        response.tokens.refresh_token
      );
      return keys.OAUTH_REDIRECT_URL;
    } else {
      throw new AccessDeniedError("Access Denied");
    }
  };
}
