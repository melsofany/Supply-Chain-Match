import http from "http";

const TARGET_PORT = 5000;
const LISTEN_PORT = 8081;

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Bad Gateway");
  });

  req.pipe(proxy, { end: true });
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`Proxy listening on ${LISTEN_PORT} → ${TARGET_PORT}`);
});
