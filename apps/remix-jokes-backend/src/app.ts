import { json, urlencoded } from "body-parser";
import express from "express";
import morgan from "morgan"; // Logging middleware
import cors from "cors";
import routes from "./routes";
import redisClient from "./redis_client";

const app = express();

// setup
app.disable("x-powered-by");
app.use(morgan("dev"));
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(cors());

// redis
redisClient.connect();

// routes
app.use("/", routes);

export default app;
