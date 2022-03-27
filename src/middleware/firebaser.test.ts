import keys from "../keys";
import axios, { AxiosResponse } from "axios";
import { firebaseAuth } from "../database";

export const getIDToken = async () => {
  const customToken: string = await firebaseAuth.createCustomToken(
    keys.USER_ID
  );
  const response: AxiosResponse = await axios.post(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${keys.FIREBASE_API_KEY}`,
    {
      token: customToken,
      returnSecureToken: true,
    }
  );
  return response.data.idToken;
};

describe("Obtain a custom Firebase Token", () => {
  it("Should return a custom Firebase Token", async () => {
    console.log(await getIDToken());
  });
});
