import { Router } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { TimesheetEntry } from "../models/TimesheetEntry.js";
import { isAdmin, parseDate, pickUser } from "../utils.js";

const router = Router();

function serializeTimesheet(entry) {
  return {
    id: String(entry._id),
    hours: entry.hours,
    note: entry.note,
    status: entry.status,
    loggedDate: entry.loggedDate,
    createdAt: entry.createdAt,
    reviewNote: entry.reviewNote,
    reviewedAt: entry.reviewedAt,
    user: pickUser(entry.user),
    project: {
      id: String(entry.project._id),
      name: entry.project.name
    },
    task: {
      id: String(entry.task._id),
      title: entry.task.title
    },
    reviewedBy: entry.reviewedBy ? pickUser(entry.reviewedBy) : null
  };
}

async function projectForUser(user, projectId) {
  if (!mongoose.isValidObjectId(projectId)) {
    return null;
  }

  const filter = {
    _id: new mongoose.Types.ObjectId(projectId)
  };

  if (!isAdmin(user)) {
    filter["members.user"] = new mongoose.Types.ObjectId(user.id);
  }

  return Project.findOne(filter).populate("members.user");
}

router.get("/", async (req, res) => {
  const filter = isAdmin(req.user) ? {} : { user: new mongoose.Types.ObjectId(req.user.id) };
  const entries = await TimesheetEntry.find(filter)
    .sort({ loggedDate: -1, createdAt: -1 })
    .populate("user project task reviewedBy");

  res.json(entries.map(serializeTimesheet));
});

router.post("/", async (req, res) => {
  const { projectId, taskId, loggedDate, hours, note = "" } = req.body;

  if (!projectId) {
    return res.status(400).json({ message: "Project is required." });
  }

  if (!taskId) {
    return res.status(400).json({ message: "Task is required." });
  }

  if (!mongoose.isValidObjectId(taskId)) {
    return res.status(400).json({ message: "Task is invalid." });
  }

  const parsedDate = parseDate(loggedDate);
  if (!parsedDate) {
    return res.status(400).json({ message: "A valid logged date is required." });
  }

  const parsedHours = Number(hours);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
    return res.status(400).json({ message: "Hours must be greater than zero." });
  }

  const project = await projectForUser(req.user, projectId);
  if (!project) {
    return res.status(403).json({ message: "You do not have access to this project." });
  }

  const task = await Task.findOne({
    _id: new mongoose.Types.ObjectId(taskId),
    project: new mongoose.Types.ObjectId(projectId)
  });

  if (!task) {
    return res.status(400).json({ message: "Task does not belong to the selected project." });
  }

  if (!isAdmin(req.user)) {
    const isProjectMember = project.members.some((member) => String(member.user._id || member.user) === req.user.id);
    if (!isProjectMember) {
      return res.status(403).json({ message: "You do not have access to this project." });
    }
  }

  const entry = await TimesheetEntry.create({
    user: new mongoose.Types.ObjectId(req.user.id),
    project: project._id,
    task: task._id,
    hours: parsedHours,
    loggedDate: parsedDate,
    note: note.trim()
  });

  const hydrated = await TimesheetEntry.findById(entry._id).populate("user project task reviewedBy");
  res.status(201).json(serializeTimesheet(hydrated));
});

router.patch("/:entryId/review", async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can review timesheets." });
  }

  const { status, reviewNote = "" } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "Review status must be APPROVED or REJECTED." });
  }

  const entry = await TimesheetEntry.findById(req.params.entryId).populate("user project task reviewedBy");
  if (!entry) {
    return res.status(404).json({ message: "Timesheet entry not found." });
  }

  entry.status = status;
  entry.reviewNote = reviewNote.trim();
  entry.reviewedBy = new mongoose.Types.ObjectId(req.user.id);
  entry.reviewedAt = new Date();

  await entry.save();
  await entry.populate("user project task reviewedBy");

  res.json(serializeTimesheet(entry));
});

export default router;
