import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  title: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  requirements: String,
  analysis: Object,
  tasks: Array,
  risks: Array,
  timeline: Object,
  teamAllocation: Array,
  weeklyReport: Object,
  emailUpdate: Object,
  evaluation: Object,
  status: { type: String, default: "Planning" }
}, { timestamps: true });

export default mongoose.model("Project", ProjectSchema);
