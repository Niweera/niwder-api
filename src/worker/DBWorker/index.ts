import FirebaseService from "../Services/FirebaseService";
import DBService from "../Services/DBService";

FirebaseService.attachDBListeners(DBService.listenToRemovalsCB);

const shutDownDBWorker = () => {
  FirebaseService.removeListeners(DBService.listenToRemovalsCB);
  process.exit(0);
};

process.on("SIGINT", shutDownDBWorker);
process.on("SIGTERM", shutDownDBWorker);
