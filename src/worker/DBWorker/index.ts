import FirebaseService from "../Services/FirebaseService";
import DBService from "../Services/DBService";

FirebaseService.attachDBListeners(DBService.listenToRemovalsCB);

process.on("SIGINT", () => {
  FirebaseService.removeListeners(DBService.listenToRemovalsCB);
  process.exit(0);
});

process.on("SIGTERM", () => {
  FirebaseService.removeListeners(DBService.listenToRemovalsCB);
  process.exit(0);
});
