import request from "supertest";
import { app } from "../server";
import { getIDToken } from "../middleware/firebaser.test";

describe("POST /mega-to-gdrive", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post("/api/mega-to-gdrive")
      .send({
        url: `https://mega.nz/file/1wQXkIyR#mTci1QDs5cjg5-rhxjrYU5QxUbN_OLkuuwyYyWvQIyo`,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});
