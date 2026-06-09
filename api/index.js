import app from "../backend/src/app.js";
import { connectDB } from "../backend/src/utils/db.js";

// Ensure DB is connected for serverless environment
// Mongoose handles connection pooling, but we should call connectDB
// to ensure the initial connection is established.
const handler = async (req, res) => {
  await connectDB();
  return app(req, res);
};

export default handler;
