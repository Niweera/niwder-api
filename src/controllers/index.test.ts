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
