import { execSync } from "child_process";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function freePort(p: number) {
  try {
    execSync(`fuser -k ${p}/tcp`, { stdio: "ignore" });
  } catch {
    // nothing was using the port — fine
  }
}

function startServer(attempt = 1) {
  const server = app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attempt <= 3) {
      logger.warn({ port, attempt }, "Port in use — freeing and retrying...");
      freePort(port);
      setTimeout(() => startServer(attempt + 1), 1500);
    } else {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
  });
}

startServer();
