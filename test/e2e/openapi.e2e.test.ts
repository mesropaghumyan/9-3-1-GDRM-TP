import request from "supertest";
import { createApp } from "../../src/app";

describe("Documentation OpenAPI", () => {
  it("get_openapiJsonRenvoieLeDocumentAvecLesEndpointsDuContrat", async () => {
    const app = createApp();

    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.paths).toHaveProperty("/health");
    expect(response.body.paths).toHaveProperty("/forecast");
  });

  it("get_docsRenvoieLaPageSwaggerUi", async () => {
    const app = createApp();

    const response = await request(app).get("/docs/");

    expect(response.status).toBe(200);
    expect(response.type).toBe("text/html");
  });
});
