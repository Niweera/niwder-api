import dotenv from "dotenv";

dotenv.config();

export default {
  PORT: process.env.PORT || 8080,
  USER_ID: process.env.USER_ID,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  MAIN_QUEUE: "main-queue",
  MEGA_TO_GDRIVE_QUEUE: "mega-to-gdrive",
  GDRIVE_TO_MEGA_QUEUE: "gdrive-to-mega",
  DIRECT_TO_GDRIVE_QUEUE: "direct-to-gdrive",
  DIRECT_TO_MEGA_QUEUE: "direct-to-mega",
  GOOGLE_DRIVE_CLIENT_ID: process.env.GOOGLE_DRIVE_CLIENT_ID,
  GOOGLE_DRIVE_CLIENT_SECRET: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  GOOGLE_DRIVE_REFRESH_TOKEN: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  GOOGLE_DRIVE_REDIRECT_URI: "https://niwder-api.niweera.gq/api/oauth/callback",
  OAUTH_REDIRECT_URL: "https://niwder.niweera.gq/transfers",
};
