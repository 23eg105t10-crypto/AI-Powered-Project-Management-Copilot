import validator from "validator";

export function validateSignup(req, res, next) {
  const { name, email, password } = req.body;
  if (!name || !email || !password || !validator.isEmail(email) || password.length < 6) {
    return res.status(400).json({ message: "Valid name, email and password >= 6 chars required" });
  }
  next();
}

export function validateProject(req, res, next) {
  const { title, requirements } = req.body;
  if (!title || !requirements || requirements.length < 20) {
    return res.status(400).json({ message: "Title and detailed requirements are required" });
  }
  next();
}
