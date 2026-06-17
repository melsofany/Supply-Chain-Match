import http from "http";
import { createConnection } from "net";

const TARGET_PORT = 5000;
const LISTEN_PORT = 8081;

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${TARGET_PORT}` },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    console.error("Proxy HTTP error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Bad Gateway");
    }
  });

  req.pipe(proxy, { end: true });
});

// Handle WebSocket upgrades (needed for Vite HMR)
server.on("upgrade", (req, socket, head) => {
  const targetSocket = createConnection(TARGET_PORT, "127.0.0.1", () => {
    const headers = [
      `${req.method} ${req.url} HTTP/1.1`,
      `Host: 127.0.0.1:${TARGET_PORT}`,
      ...Object.entries(req.headers)
        .filter(([k]) => k.toLowerCase() !== "host")
        .map(([k, v]) => `${k}: ${v}`),
      "",
      "",
    ].join("\r\n");

    targetSocket.write(headers);
    if (head && head.length) targetSocket.write(head);
    targetSocket.pipe(socket);
    socket.pipe(targetSocket);
  });

  targetSocket.on("error", (err) => {
    console.error("Proxy WS error:", err.message);
    socket.destroy();
  });

  socket.on("error", () => targetSocket.destroy());
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`Proxy ${LISTEN_PORT} → ${TARGET_PORT} (HTTP + WebSocket)`);
});
