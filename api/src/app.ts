import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { uploadRouter } from "./routes/upload";
import { tradesRouter } from "./routes/trades";
import { pnlRouter } from "./routes/pnl";
import { importsRouter } from "./routes/imports";
import { syncRouter } from "./routes/sync";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/upload", uploadRouter);
  app.use("/api/trades", tradesRouter);
  app.use("/api/pnl", pnlRouter);
  app.use("/api/imports", importsRouter);
  app.use("/api/sync", syncRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    const status = (err && err.status) || 500;
    res.status(status).json({
      error: err?.message || "internal error",
    });
  };
  app.use(errorHandler);

  return app;
}
