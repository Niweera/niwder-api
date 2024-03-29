import dotenv from "dotenv";

dotenv.config();

export default {
  PORT: process.env.PORT || 8080,
  USER_ID: process.env.USER_ID,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  BULL_UI_USERNAME: process.env.BULL_UI_USERNAME,
  BULL_UI_PASSWORD: process.env.BULL_UI_PASSWORD,
  LOGDNA_INGESTION_KEY: process.env.LOGDNA_INGESTION_KEY,
  MAIN_QUEUE: "main-queue",
  TORRENTS_QUEUE: "torrents-queue",
  MEGA_TO_GDRIVE_QUEUE: "mega-to-gdrive",
  GDRIVE_TO_MEGA_QUEUE: "gdrive-to-mega",
  DIRECT_TO_GDRIVE_QUEUE: "direct-to-gdrive",
  DIRECT_TO_MEGA_QUEUE: "direct-to-mega",
  GDRIVE_TO_DIRECT_QUEUE: "gdrive-to-direct",
  MEGA_TO_DIRECT_QUEUE: "mega-to-direct",
  TORRENTS_TO_GDRIVE_QUEUE: "torrents-to-gdrive",
  TORRENTS_TO_MEGA_QUEUE: "torrents-to-mega",
  TORRENTS_TO_DIRECT_QUEUE: "torrents-to-direct",
  GOOGLE_DRIVE_CLIENT_ID: process.env.GOOGLE_DRIVE_CLIENT_ID,
  GOOGLE_DRIVE_CLIENT_SECRET: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  GOOGLE_DRIVE_REDIRECT_URI: "https://niwder-api.niweera.gq/api/oauth/callback",
  NIWDER_FILE_DIRECT_LINK_HOST: "https://niwder-files-0.niweera.gq/api/file",
  OAUTH_REDIRECT_URL: "https://niwder.niweera.gq/transfers",
  GDRIVE_FOLDER_NAME: "Niwder",
  MEGA_FOLDER_NAME: "Niwder",
  SOCKET_IO_CORS: ["http://localhost:9091", "https://niwder.niweera.gq"],
};
