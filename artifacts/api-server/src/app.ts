import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { initLedger } from "./lib/ledger-service";
import { errorMiddleware } from "./middlewares/error.middleware";
import { seedAdmin } from "./scripts/seed-admin";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(errorMiddleware);

initLedger().catch((err) => {
  logger.error({ err }, "Failed to initialize LedgerStack Core accounting system");
});

seedAdmin().catch((err) => {
  logger.error({ err }, "Failed to seed admin user");
});

export default app;
