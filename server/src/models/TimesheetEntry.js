import mongoose from "mongoose";

const timesheetEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    hours: { type: Number, required: true, min: 0.25 },
    loggedDate: { type: Date, required: true, index: true },
    note: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "", trim: true }
  },
  {
    timestamps: true
  }
);

timesheetEntrySchema.index({ user: 1, loggedDate: -1 });
timesheetEntrySchema.index({ status: 1, loggedDate: -1 });

export const TimesheetEntry =
  mongoose.models.TimesheetEntry || mongoose.model("TimesheetEntry", timesheetEntrySchema);
