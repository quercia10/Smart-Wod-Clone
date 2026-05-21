const http = require("http");
const net = require("net");

const proxy = http.createServer((req, res) => {
  const opts = {
    hostname: "localhost",
    port: 5000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: "localhost:5000" },
  };
  const p = http.request(opts, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  p.on("error", () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(p);
});

proxy.on("upgrade", (req, sock, head) => {
  const conn = net.connect(5000, "localhost", () => {
    const hdrs = Object.entries({ ...req.headers, host: "localhost:5000" })
      .map(([k, v]) => k + ": " + v)
      .join("\r\n");
    conn.write("GET " + req.url + " HTTP/1.1\r\n" + hdrs + "\r\n\r\n");
    if (head && head.length) conn.write(head);
    conn.pipe(sock);
    sock.pipe(conn);
  });
  conn.on("error", () => sock.destroy());
  sock.on("error", () => conn.destroy());
});

proxy.listen(22961, () => console.log("WS proxy 22961 -> 5000 ready"));
