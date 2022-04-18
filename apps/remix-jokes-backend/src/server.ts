import { Socket } from "net";
import app from "./app";

const port = process.env.PORT || 5001;

const server = app.listen(port, () => {
  console.log(`api running on ${port}`);
});

process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);

let connections: Socket[] = [];

server.on("connection", (connection) => {
  connections.push(connection);
  connection.on(
    "close",
    () => (connections = connections.filter((curr) => curr !== connection))
  );
});

function shutDown() {
  console.log("Received kill signal, shutting down gracefully");
  server.close(() => {
    console.log("Closed out remaining connections");
    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);

  connections.forEach((curr) => curr.end());
  setTimeout(() => connections.forEach((curr) => curr.destroy()), 5000);
}
