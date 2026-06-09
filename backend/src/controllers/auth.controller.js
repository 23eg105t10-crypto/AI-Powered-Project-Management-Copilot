import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function tokenFor(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
}

export async function signup(req, res, next) {
  try {
    const { name, email, password, role = "Viewer" } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });
    res.status(201).json({ token: tokenFor(user), user: { name, email, role } });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Email already exists" });
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    res.json({ token: tokenFor(user), user: { name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
}
