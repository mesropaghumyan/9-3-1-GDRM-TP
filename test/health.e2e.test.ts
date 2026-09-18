import request from "supertest";
import { createApp } from "../src/app";

describe("GET /health", () => {
  it("renvoie un statut 200 avec { status: 'ok' }", async () => {
    // Arrange
    const app = createApp();

    // Act
    const response = await request(app).get("/health");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("propage un identifiant de corrélation dans l'en-tête de réponse", async () => {
    // Arrange
    const app = createApp();
    const incomingCorrelationId = "test-correlation-id";

    // Act
    const response = await request(app)
      .get("/health")
      .set("X-Correlation-Id", incomingCorrelationId);

    // Assert
    expect(response.headers["x-correlation-id"]).toBe(incomingCorrelationId);
  });
});
