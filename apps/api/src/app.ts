import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { adminRouter } from "./routes/admin.routes";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { publicRouter } from "./routes/public.routes";

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/admin", adminRouter);
  app.use("/", publicRouter);
  app.use(errorHandler);
  return app;
}
