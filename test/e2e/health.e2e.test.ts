import request from "supertest";
import { createApp } from "../../src/app";

describe("GET /health", () => {
  it("renvoie un statut 200 avec { status: 'ok' }", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("propage un identifiant de corrélation dans l'en-tête de réponse", async () => {
    const app = createApp();
    const incomingCorrelationId = "test-correlation-id";

    const response = await request(app)
      .get("/health")
      .set("X-Correlation-Id", incomingCorrelationId);

    expect(response.headers["x-correlation-id"]).toBe(incomingCorrelationId);
  });
});
