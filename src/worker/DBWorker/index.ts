import FirebaseService from "../Services/FirebaseService";
import DBService from "../Services/DBService";

FirebaseService.attachDBListeners(DBService.listenToRemovalsCB);

const shutDownDBWorker = () => {
  FirebaseService.removeListeners(DBService.listenToRemovalsCB);
  process.exit(0);
};

process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught exception:", err.message);
});
process.on("SIGINT", shutDownDBWorker);
process.on("SIGTERM", shutDownDBWorker);
