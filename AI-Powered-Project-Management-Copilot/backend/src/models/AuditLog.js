import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  actor: String,
  action: String,
  entity: String,
  metadata: Object,
  ip: String
}, { timestamps: true });

export default mongoose.model("AuditLog", AuditLogSchema);
