import express from "express";

const router = express.Router();

router.get("/:name", (req, res) => {
  return res.json({ message: `Hi ${req.params.name}` });
});

export default router;
