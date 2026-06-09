import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { connectDB } from "./utils/db.js";

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
});
