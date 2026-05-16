import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { pickUser } from "../utils.js";

const router = Router();

function createToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters." });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account already exists with that email." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    role: "MEMBER"
  });

  const token = createToken(user.id);
  return res.status(201).json({ token, user: pickUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: (email || "").toLowerCase() });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const isValid = await bcrypt.compare(password || "", user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = createToken(user.id);
  return res.json({ token, user: pickUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: pickUser(req.user) });
});

export default router;
