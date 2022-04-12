import dotenv from "dotenv";
import express from "express";
import { db } from "../db.server";
import { authorizationRequired } from "./auth";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const router = express.Router();

// Get's the user from the database. It get's the ID from the JWT token.
router.get("/", authorizationRequired, async (req, res) => {
  const userId = req.user.userId;
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (user?.id) {
    return res.status(200).json({ user });
  } else {
    return res.status(404).json({ message: "User not found" });
  }
});

router.get(
  "/by-username/:username",
  authorizationRequired,
  async (req, res) => {
    const user = await db.user.findUnique({
      where: { username: req.params.username },
    });

    if (user?.id) {
      return res.status(200).json({ user });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  }
);

export default router;
