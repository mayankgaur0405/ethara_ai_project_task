import { Router } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { isAdmin, pickUser } from "../utils.js";

const router = Router();

router.get("/", async (req, res) => {
  const projectWhere = isAdmin(req.user) ? {} : { "members.user": new mongoose.Types.ObjectId(req.user.id) };
  const visibleProjects = await Project.find(projectWhere).populate("members.user");
  const visibleProjectIds = visibleProjects.map((project) => project._id);

  const taskWhere = isAdmin(req.user)
    ? {}
    : {
        $or: [
          { assignee: new mongoose.Types.ObjectId(req.user.id) },
          { project: { $in: visibleProjectIds } }
        ]
      };

  const tasks = await Task.find(taskWhere)
    .sort({ dueDate: 1 })
    .populate("project assignee createdBy");

  const now = new Date();
  const overdueTasks = tasks.filter((task) => task.status !== "DONE" && task.dueDate < now);
  const activeTasks = tasks.filter((task) => task.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((task) => task.status === "DONE");

  res.json({
    stats: {
      totalProjects: visibleProjects.length,
      totalTasks: tasks.length,
      activeTasks: activeTasks.length,
      overdueTasks: overdueTasks.length,
      completedTasks: completedTasks.length
    },
    recentTasks: tasks.slice(0, 8).map((task) => ({
      id: String(task._id),
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      project: { id: String(task.project._id), name: task.project.name },
      assignee: task.assignee ? pickUser(task.assignee) : null
    })),
    projects: visibleProjects.map((project) => {
      const projectTasks = tasks.filter((task) => String(task.project._id) === String(project._id));
      const total = projectTasks.length;
      const done = projectTasks.filter((task) => task.status === "DONE").length;
      return {
        id: String(project._id),
        name: project.name,
        status: project.status,
        progress: total ? Math.round((done / total) * 100) : 0,
        taskCount: total,
        memberCount: project.members.length
      };
    }),
    overdue: overdueTasks.slice(0, 6).map((task) => ({
      id: String(task._id),
      title: task.title,
      dueDate: task.dueDate,
      project: task.project.name,
      assignee: task.assignee ? pickUser(task.assignee) : null
    }))
  });
});

export default router;
