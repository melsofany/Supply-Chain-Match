import { execSync } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const PID_FILE = path.join("/tmp", `api-server-${port}.pid`);

function killPrevious() {
  // Kill the previously recorded PID
  try {
    const oldPid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (oldPid && oldPid !== process.pid) {
      try { execSync(`kill -9 ${oldPid} 2>/dev/null`, { stdio: "ignore" }); } catch {}
    }
  } catch {}
  // Also free port directly
  try { execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: "ignore" }); } catch {}
}

function writePid() {
  try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch {}
}

function isPortFree(p: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => { probe.close(); resolve(true); });
    probe.listen(p, "0.0.0.0");
  });
}

async function waitUntilPortFree(p: number, maxMs = 10000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isPortFree(p)) return;
    try { execSync(`fuser -k ${p}/tcp 2>/dev/null`, { stdio: "ignore" }); } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Port ${p} still busy after ${maxMs}ms`);
}

async function main() {
  killPrevious();
  writePid();

  logger.info({ port }, "Waiting for port to be free...");
  await waitUntilPortFree(port);
  logger.info({ port }, "Port free — starting server");

  app.listen(port, (err?: Error) => {
    if (err) { logger.error({ err }, "Listen error"); process.exit(1); }
    logger.info({ port }, "Server listening");
  });

  process.on("SIGTERM", () => { try { fs.unlinkSync(PID_FILE); } catch {} process.exit(0); });
  process.on("SIGINT",  () => { try { fs.unlinkSync(PID_FILE); } catch {} process.exit(0); });
}

main().catch((err) => { logger.error({ err }, "Fatal startup error"); process.exit(1); });
