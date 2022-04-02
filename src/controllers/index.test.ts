import request from "supertest";
import { app } from "../server";
import { getIDToken } from "../middleware/firebaser.test";

//const file =
//"https://mega.nz/file/1wQXkIyR#mTci1QDs5cjg5-rhxjrYU5QxUbN_OLkuuwyYyWvQIyo";
//const folder = "https://mega.nz/folder/xspkCBpa#a0oa70caa9nvTpufH6bm6g";
//const folderFolder =
//"https://mega.nz/folder/xspkCBpa#a0oa70caa9nvTpufH6bm6g/folder/h1pQjY4D";
const folderFile =
  "https://mega.nz/folder/xspkCBpa#a0oa70caa9nvTpufH6bm6g/file/txpSSQZZ";

//const gDriveFile =
//  "https://drive.google.com/file/d/17uhXkmL2-FvmET_-Y63hB-ExumqzFB4-/view?usp=sharing";
const gDriveFoldr =
  "https://drive.google.com/drive/folders/1aqq4tcKu2im0rp7if7j_dlDTQIl4Q2LR?usp=sharing";

const directLink = "https://ipv4.download.thinkbroadband.com/1GB.zip";

describe("POST /mega-to-gdrive", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post("/api/mega-to-gdrive")
      .send({
        url: folderFile,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});

describe("POST /gdrive-to-mega", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post("/api/gdrive-to-mega")
      .send({
        url: gDriveFoldr,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});

describe("POST /direct-to-gdrive", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post("/api/direct-to-gdrive")
      .send({
        url: directLink,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});
