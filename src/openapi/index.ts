import swaggerUi from "swagger-ui-express";
import openAPIJSON from "./openapi.json";
import type { Application } from "express";

const ServeOpenAPI = (app: Application): void => {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openAPIJSON, {
      explorer: false,
      customSiteTitle: "Niwder API Docs",
    })
  );
};

export default ServeOpenAPI;
