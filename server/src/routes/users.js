import { Router } from "express";
import { User } from "../models/User.js";
import { pickUser } from "../utils.js";

const router = Router();

router.get("/", async (req, res) => {
  const users = await User.find().sort({ name: 1 });

  res.json(users.map(pickUser));
});

export default router;
