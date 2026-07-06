import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use(errorHandler);
  return app;
}
