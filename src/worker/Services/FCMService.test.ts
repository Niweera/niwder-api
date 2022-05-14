import FCMService from "./FCMService";

describe("FCMService", () => {
  it("FCMService Get FCMKeys", async () => {
    const fcmService = new FCMService("XkTRX228vwZR3JvCp8mglcNBHeW2");
    await fcmService.sendFCM(
      "10MB.zip",
      "https://drive.google.com/file/d/1Troq3bl_s2bSlmOjNsR-hnUfAhyN4ZGM/view?usp=drivesdk"
    );
  });

  it("Send FCM Error", async () => {
    const fcmService = new FCMService("XkTRX228vwZR3JvCp8mglcNBHeW2");
    await fcmService.sendErrorMessage({
      job: "https://drive.google.com/file/d/1Troq3bl_s2bSlmOjNsR-hnUfAhyN4ZGM/view?usp=drivesdk",
      error: "Attributes could not be decrypted with provided key.",
    });
  });
});
