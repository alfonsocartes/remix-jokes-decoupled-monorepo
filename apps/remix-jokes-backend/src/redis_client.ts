import { createClient } from "redis";

const client = createClient();

client.on("connect", () => {
  console.log("Redis client connected");
});

client.on("ready", () => {
  console.log("Redis client ready");
});

client.on("end", () => {
  console.log("Redis client disconnected");
});

client.on("error", (err) => {
  console.error(err.message);
});

process.on("SIGINT", () => {
  client.quit();
});

export default client;
