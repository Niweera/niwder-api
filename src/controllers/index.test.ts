import request from "supertest";
import { app } from "../server";
import { getIDToken } from "../middleware/firebaser.test";
import keys from "../keys";

const file =
  "https://mega.nz/file/o540lZQT#QtGNvAYWNGoX54Q5Bn4xhCNuvQnzMW5q7JhVlwAEuSw";
//const folder = "https://mega.nz/folder/xspkCBpa#a0oa70caa9nvTpufH6bm6g";
//const folderFolder =
//"https://mega.nz/folder/xspkCBpa#a0oa70caa9nvTpufH6bm6g/folder/h1pQjY4D";
// const folderFile =
//   "https://mega.nz/folder/xspkCBpa#a0oa70caa9nvTpufH6bm6g/file/txpSSQZZ";

//const gDriveFile =
//  "https://drive.google.com/file/d/17uhXkmL2-FvmET_-Y63hB-ExumqzFB4-/view?usp=sharing";
const gDriveFoldr =
  "https://drive.google.com/drive/folders/1aqq4tcKu2im0rp7if7j_dlDTQIl4Q2LR?usp=sharing";

const directLink =
  "https://github.com/denoland/deno/releases/download/v1.20.4/deno-x86_64-unknown-linux-gnu.zip";

describe("POST /mega to gdrive", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post(`/api/${keys.MEGA_TO_GDRIVE_QUEUE}`)
      .send({
        url: file,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});

describe("POST /gdrive to mega", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post(`/api/${keys.GDRIVE_TO_MEGA_QUEUE}`)
      .send({
        url: gDriveFoldr,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});

describe("POST /direct to gdrive", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post(`/api/${keys.DIRECT_TO_GDRIVE_QUEUE}`)
      .send({
        url: directLink,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});

describe("POST /direct to mega", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post(`/api/${keys.DIRECT_TO_MEGA_QUEUE}`)
      .send({
        url: directLink,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});
