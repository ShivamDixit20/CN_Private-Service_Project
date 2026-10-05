const http = require("http");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Backend", "A");
  res.setHeader("Cache-Control", "max-age=60");

  if (req.url === "/api/status") {
    res.writeHead(200);
    res.end(JSON.stringify({
      backend: "A",
      status: "ok"
    }));
    return;
  }

  if (req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: "CN Project Backend A",
      backend: "A"
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({error: "Not Found"}));
});

server.listen(3001, "0.0.0.0", () => {
  console.log("BACKEND A RUNNING");
  console.log("Port: 3001");
});
