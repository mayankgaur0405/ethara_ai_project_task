import { Router } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { TimesheetEntry } from "../models/TimesheetEntry.js";
import { isAdmin, parseDate, pickUser } from "../utils.js";

const router = Router();

async function getVisibleProjects(user) {
  const filter = isAdmin(user) ? {} : { "members.user": new mongoose.Types.ObjectId(user.id) };

  return Project.find(filter)
    .sort({ updatedAt: -1 })
    .populate("createdBy")
    .populate("members.user");
}

function serializeProject(project, tasks = []) {
  const completedTasks = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return {
    id: String(project._id),
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    createdBy: pickUser(project.createdBy),
    memberCount: project.members.length,
    members: project.members.map((member) => ({
      id: String(member._id),
      role: member.role,
      user: pickUser(member.user)
    })),
    taskCount: tasks.length,
    completedTasks,
    progress
  };
}

function normalizeMembers(adminId, memberIds = []) {
  const uniqueIds = [...new Set(memberIds)].filter(Boolean);

  return [
    { user: new mongoose.Types.ObjectId(adminId), role: "PROJECT_MANAGER" },
    ...uniqueIds
      .filter((userId) => userId !== adminId)
      .map((userId) => ({ user: new mongoose.Types.ObjectId(userId), role: "CONTRIBUTOR" }))
  ];
}

router.get("/", async (req, res) => {
  const projects = await getVisibleProjects(req.user);
  const projectIds = projects.map((project) => project._id);
  const tasks = await Task.find({ project: { $in: projectIds } });
  const tasksByProject = new Map();

  for (const task of tasks) {
    const key = String(task.project);
    const list = tasksByProject.get(key) || [];
    list.push(task);
    tasksByProject.set(key, list);
  }

  res.json(projects.map((project) => serializeProject(project, tasksByProject.get(String(project._id)) || [])));
});

router.post("/", async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can create projects." });
  }

  const { name, description, startDate, endDate, status, memberIds = [] } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ message: "Project name must be at least 3 characters." });
  }

  const parsedStart = parseDate(startDate);
  const parsedEnd = parseDate(endDate);
  if (!parsedStart || !parsedEnd || parsedStart > parsedEnd) {
    return res.status(400).json({ message: "Start and end dates must be valid." });
  }

  const project = await Project.create({
    name: name.trim(),
    description: (description || "").trim(),
    startDate: parsedStart,
    endDate: parsedEnd,
    status: status || "PLANNING",
    createdBy: new mongoose.Types.ObjectId(req.user.id),
    members: normalizeMembers(req.user.id, memberIds)
  });

  const hydrated = await Project.findById(project._id).populate("createdBy").populate("members.user");
  res.status(201).json(serializeProject(hydrated, []));
});

router.post("/:projectId/members", async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can manage team members." });
  }

  const { projectId } = req.params;
  const { userId, role = "CONTRIBUTOR" } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  const project = await Project.findById(projectId).populate("members.user");
  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  const existing = project.members.find((member) => String(member.user._id || member.user) === userId);

  if (existing) {
    existing.role = role;
  } else {
    project.members.push({
      user: new mongoose.Types.ObjectId(userId),
      role
    });
  }

  await project.save();
  await project.populate("members.user");

  const member = project.members.find((entry) => String(entry.user._id || entry.user) === userId);

  res.status(201).json({
    id: String(member._id),
    role: member.role,
    user: pickUser(member.user)
  });
});

router.patch("/:projectId", async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can update projects." });
  }

  const project = await Project.findById(req.params.projectId).populate("createdBy").populate("members.user");
  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  const { name, description, startDate, endDate, status, memberIds = [] } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ message: "Project name must be at least 3 characters." });
  }

  const parsedStart = parseDate(startDate);
  const parsedEnd = parseDate(endDate);
  if (!parsedStart || !parsedEnd || parsedStart > parsedEnd) {
    return res.status(400).json({ message: "Start and end dates must be valid." });
  }

  project.name = name.trim();
  project.description = (description || "").trim();
  project.startDate = parsedStart;
  project.endDate = parsedEnd;
  project.status = status || "PLANNING";
  project.members = normalizeMembers(req.user.id, memberIds);

  await project.save();
  await Task.updateMany(
    {
      project: project._id,
      assignee: { $ne: null, $nin: project.members.map((member) => member.user) }
    },
    {
      $set: { assignee: null }
    }
  );
  await project.populate("createdBy");
  await project.populate("members.user");

  const tasks = await Task.find({ project: project._id });
  res.json(serializeProject(project, tasks));
});

router.delete("/:projectId", async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can delete projects." });
  }

  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  const tasks = await Task.find({ project: project._id }).select("_id");
  const taskIds = tasks.map((task) => task._id);
  await TimesheetEntry.deleteMany({
    $or: [{ project: project._id }, { task: { $in: taskIds } }]
  });
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();

  res.status(204).send();
});

export default router;
