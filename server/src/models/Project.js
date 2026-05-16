import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["PROJECT_MANAGER", "CONTRIBUTOR"], default: "CONTRIBUTOR" }
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"],
      default: "PLANNING"
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [memberSchema], default: [] }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ "members.user": 1 });

export const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

