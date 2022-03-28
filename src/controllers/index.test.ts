import request from "supertest";
import { app } from "../server";
import { getIDToken } from "../middleware/firebaser.test";

describe("POST /mega-to-gdrive", () => {
  it("Should return HTTP 204", async () => {
    const res: request.Response = await request(app)
      .post("/api/mega-to-gdrive")
      .send({
        url: `https://mega.nz/folder/U0Q1kTpL#TbQNV7_6G3x8w_9Fma_THw`,
      })
      .set("Authorization", `Bearer ${await getIDToken()}`);

    expect(res.status).toBe(204);
  });
});
