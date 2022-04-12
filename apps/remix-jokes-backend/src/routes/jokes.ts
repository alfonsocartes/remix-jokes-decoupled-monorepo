import express from "express";
import { db } from "../db.server";
import { authorizationRequired } from "./auth";

const router = express.Router();

router.get("/", async (req, res) => {
  const jokeListItems = await db.joke.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  res.status(200).json({ jokeListItems });
});

router.get("/random", async (req, res) => {
  const count = await db.joke.count();
  const randomRowNumber = Math.floor(Math.random() * count);
  const [randomJoke] = await db.joke.findMany({
    take: 1,
    skip: randomRowNumber,
  });
  res.status(200).json({ randomJoke });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const joke = await db.joke.findUnique({
    where: { id },
  });
  res.status(200).json({ joke });
});

router.post("/new", authorizationRequired, async (req, res) => {
  const userId: string = req.user.userId;
  try {
    const { name, content }: { name: string; content: string } = req.body;

    const joke = await db.joke.create({
      data: { name, content, jokesterId: userId },
    });

    if (joke?.id) {
      return res.status(200).json({ joke });
    } else {
      throw new Error("Error creating joke in the database");
    }
  } catch (error) {
    return res.status(400).json({ message: "Error creating joke" });
  }
});

router.delete("/:id/", authorizationRequired, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const joke = await db.joke.findUnique({
      where: { id },
    });
    if (!joke) {
      return res
        .status(404)
        .json({ message: "Can't delete what does not exist" });
    }
    if (joke.jokesterId !== userId) {
      return res
        .status(401)
        .json({ message: "Pssh, nice try. That's not your joke" });
    }
    await db.joke.delete({ where: { id: id } });
    return res.status(200).json({ joke });
  } catch (error) {
    return res.status(400).json({ message: "Error deleting joke" });
  }
});

export default router;
