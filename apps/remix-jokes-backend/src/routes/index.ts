import express from "express";

import message from "./message";
import auth from "./auth";
import jokes from "./jokes";
import user from "./user";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).send("OK");
});

router.use("/message", message);
router.use("/auth", auth);
router.use("/jokes", jokes);
router.use("/user", user);

export default router;
