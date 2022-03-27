import * as firebase from "firebase-admin";
import * as serviceAccount from "../keys/serviceAccountKey.json";
import type { ServiceAccount } from "firebase-admin";
import type { auth } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { Database, getDatabase } from "firebase-admin/database";

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount as ServiceAccount),
  databaseURL: "https://niwder-io-default-rtdb.firebaseio.com/",
});

export const firebaseAuth: auth.Auth = getAuth();
export const db: Database = getDatabase();

export default firebase;
