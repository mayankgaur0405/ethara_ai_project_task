import { Router } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { TimesheetEntry } from "../models/TimesheetEntry.js";
import { isAdmin, parseDate, pickUser } from "../utils.js";

const router = Router();

async function canAccessProject(user, projectId) {
  if (!mongoose.isValidObjectId(projectId)) {
    return false;
  }

  if (isAdmin(user)) return true;

  const membership = await Project.exists({
    _id: new mongoose.Types.ObjectId(projectId),
    "members.user": new mongoose.Types.ObjectId(user.id)
  });

  return Boolean(membership);
}

function serializeTask(task) {
  return {
    id: String(task._id),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimatedHours: task.estimatedHours,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    project: {
      id: String(task.project._id),
      name: task.project.name
    },
    assignee: task.assignee ? pickUser(task.assignee) : null,
    createdBy: pickUser(task.createdBy)
  };
}

async function getProjectWithMembers(projectId) {
  if (!mongoose.isValidObjectId(projectId)) {
    return null;
  }

  return Project.findById(projectId).populate("members.user");
}

function isProjectMember(project, userId) {
  return project.members.some((member) => String(member.user._id || member.user) === userId);
}

router.get("/", async (req, res) => {
  const query = isAdmin(req.user)
    ? {}
    : {
        $or: [
          { assignee: new mongoose.Types.ObjectId(req.user.id) },
          { project: { $in: await visibleProjectIds(req.user.id) } }
        ]
      };

  const tasks = await Task.find(query)
    .sort({ dueDate: 1, createdAt: -1 })
    .populate("project assignee createdBy");

  res.json(tasks.map(serializeTask));
});

router.post("/", async (req, res) => {
  const { title, description, projectId, assigneeId, dueDate, status, priority, estimatedHours } = req.body;

  if (!title || title.trim().length < 3) {
    return res.status(400).json({ message: "Task title must be at least 3 characters." });
  }

  if (!projectId) {
    return res.status(400).json({ message: "Project is required." });
  }

  const parsedDueDate = parseDate(dueDate);
  if (!parsedDueDate) {
    return res.status(400).json({ message: "A valid due date is required." });
  }

  const allowed = await canAccessProject(req.user, projectId);
  if (!allowed) {
    return res.status(403).json({ message: "You do not have access to this project." });
  }

  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can create tasks." });
  }

  const project = await getProjectWithMembers(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  if (assigneeId && !isProjectMember(project, assigneeId)) {
    return res.status(400).json({ message: "Assignee must be a member of the selected project." });
  }

  const task = await Task.create({
    title: title.trim(),
    description: (description || "").trim(),
    project: new mongoose.Types.ObjectId(projectId),
    assignee: assigneeId ? new mongoose.Types.ObjectId(assigneeId) : null,
    dueDate: parsedDueDate,
    status: status || "TODO",
    priority: priority || "MEDIUM",
    estimatedHours: estimatedHours ? Number(estimatedHours) : null,
    createdBy: new mongoose.Types.ObjectId(req.user.id)
  });

  const hydrated = await Task.findById(task._id).populate("project assignee createdBy");
  res.status(201).json(serializeTask(hydrated));
});

router.patch("/:taskId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.taskId)) {
    return res.status(404).json({ message: "Task not found." });
  }

  const task = await Task.findById(req.params.taskId).populate("project assignee createdBy");

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const isOwner = task.assignee && String(task.assignee._id) === req.user.id;
  const allowed = isAdmin(req.user) || isOwner;
  if (!allowed) {
    return res.status(403).json({ message: "You can only update your own tasks." });
  }

  if (req.body.status) task.status = req.body.status;
  if (req.body.priority && isAdmin(req.user)) task.priority = req.body.priority;
  if (req.body.title && isAdmin(req.user)) task.title = req.body.title.trim();
  if (req.body.description !== undefined && isAdmin(req.user)) task.description = req.body.description.trim();
  if (req.body.projectId && isAdmin(req.user)) {
    const nextProject = await getProjectWithMembers(req.body.projectId);
    if (!nextProject) {
      return res.status(404).json({ message: "Project not found." });
    }

    task.project = new mongoose.Types.ObjectId(req.body.projectId);

    if (task.assignee && !isProjectMember(nextProject, String(task.assignee._id || task.assignee))) {
      task.assignee = null;
    }
  }
  if (req.body.estimatedHours !== undefined && isAdmin(req.user)) {
    task.estimatedHours = req.body.estimatedHours ? Number(req.body.estimatedHours) : null;
  }
  if (req.body.assigneeId !== undefined && isAdmin(req.user)) {
    const projectId = String(task.project._id || task.project);
    const project = await getProjectWithMembers(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (req.body.assigneeId && !isProjectMember(project, req.body.assigneeId)) {
      return res.status(400).json({ message: "Assignee must be a member of the selected project." });
    }

    task.assignee = req.body.assigneeId ? new mongoose.Types.ObjectId(req.body.assigneeId) : null;
  }
  if (req.body.dueDate && isAdmin(req.user)) {
    const parsedDueDate = parseDate(req.body.dueDate);
    if (!parsedDueDate) {
      return res.status(400).json({ message: "Invalid due date." });
    }
    task.dueDate = parsedDueDate;
  }

  await task.save();
  await task.populate("project assignee createdBy");

  res.json(serializeTask(task));
});

router.delete("/:taskId", async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: "Only admins can delete tasks." });
  }

  if (!mongoose.isValidObjectId(req.params.taskId)) {
    return res.status(404).json({ message: "Task not found." });
  }

  const task = await Task.findById(req.params.taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  await TimesheetEntry.deleteMany({ task: task._id });
  await task.deleteOne();
  res.status(204).send();
});

async function visibleProjectIds(userId) {
  const projects = await Project.find({ "members.user": new mongoose.Types.ObjectId(userId) }).select("_id");
  return projects.map((project) => project._id);
}

export default router;
