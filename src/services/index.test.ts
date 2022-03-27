import Service from "./index";
import keys from "../keys";

describe("Main Service Tests", () => {
  it("Should add a job to mega-to-gdrive queue", async () => {
    const service: Service = new Service();
    await service.megaToGDrive(
      `https://niweera.gq?q=${new Date().getTime()}`,
      keys.USER_ID
    );
  });
});
