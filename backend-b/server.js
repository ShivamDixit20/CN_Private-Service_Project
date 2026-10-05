const http = require("http");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Backend", "B");
  res.setHeader("Cache-Control", "max-age=60");

  if (req.url === "/api/status") {
    res.writeHead(200);
    res.end(JSON.stringify({
      backend: "B",
      status: "ok"
    }));
    return;
  }

  if (req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: "CN Project Backend B",
      backend: "B"
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({error: "Not Found"}));
});

server.listen(3002, "0.0.0.0", () => {
  console.log("BACKEND B RUNNING");
  console.log("Port: 3002");
});
