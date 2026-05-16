import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { connectToDatabase, disconnectFromDatabase } from "./db.js";
import { Project } from "./models/Project.js";
import { Task } from "./models/Task.js";
import { User } from "./models/User.js";

const adminEmail = "admin@ethara.local";
const memberEmail = "member@ethara.local";
const guestEmail = "qa@ethara.local";
const password = "Password123!";

async function upsertUser({ name, email, role, passwordHash }) {
  return User.findOneAndUpdate(
    { email },
    { $set: { name, role, passwordHash } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertProject({ name, description, status, startDate, endDate, createdBy, members }) {
  return Project.findOneAndUpdate(
    { name },
    { $set: { description, status, startDate, endDate, createdBy, members } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertTask(task) {
  return Task.findOneAndUpdate(
    { title: task.title, project: task.project },
    { $set: task },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function seedDatabase() {
  const hash = await bcrypt.hash(password, 10);

  const admin = await upsertUser({
    name: "Mayank Admin",
    email: adminEmail,
    role: "ADMIN",
    passwordHash: hash
  });

  const member = await upsertUser({
    name: "Riya Member",
    email: memberEmail,
    role: "MEMBER",
    passwordHash: hash
  });

  const qa = await upsertUser({
    name: "Aman QA",
    email: guestEmail,
    role: "MEMBER",
    passwordHash: hash
  });

  const launchProject = await upsertProject({
    name: "Ethara Task Manager Launch",
    description: "Build the selection assignment with a strong UI and production-ready flows.",
    status: "ACTIVE",
    startDate: new Date("2026-05-01"),
    endDate: new Date("2026-05-20"),
    createdBy: admin._id,
    members: [
      { user: admin._id, role: "PROJECT_MANAGER" },
      { user: member._id, role: "CONTRIBUTOR" },
      { user: qa._id, role: "CONTRIBUTOR" }
    ]
  });

  const opsProject = await upsertProject({
    name: "Internal Ops Cleanup",
    description: "Improve team visibility with overdue tracking and ownership clarity.",
    status: "PLANNING",
    startDate: new Date("2026-05-07"),
    endDate: new Date("2026-05-28"),
    createdBy: admin._id,
    members: [{ user: admin._id, role: "PROJECT_MANAGER" }]
  });

  await upsertTask({
    title: "Authentication flow",
    description: "Set up signup, login, JWT auth, and role-aware redirects.",
    status: "DONE",
    priority: "HIGH",
    estimatedHours: 8,
    dueDate: new Date("2026-05-04"),
    project: launchProject._id,
    assignee: admin._id,
    createdBy: admin._id
  });

  await upsertTask({
    title: "Dashboard widgets",
    description: "Show project stats, overdue tasks, and member task ownership.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    estimatedHours: 10,
    dueDate: new Date("2026-05-08"),
    project: launchProject._id,
    assignee: member._id,
    createdBy: admin._id
  });

  await upsertTask({
    title: "Task table polish",
    description: "Implement filters, progress indicators, and consistent dark UI.",
    status: "TODO",
    priority: "MEDIUM",
    estimatedHours: 6,
    dueDate: new Date("2026-05-10"),
    project: launchProject._id,
    assignee: qa._id,
    createdBy: admin._id
  });

  await upsertTask({
    title: "Ops backlog grooming",
    description: "Prepare the second project with owners and date estimates.",
    status: "REVIEW",
    priority: "LOW",
    estimatedHours: 4,
    dueDate: new Date("2026-05-09"),
    project: opsProject._id,
    assignee: admin._id,
    createdBy: admin._id
  });

  console.log("Seed completed");
  console.log(`Admin login: ${adminEmail} / ${password}`);
  console.log(`Member login: ${memberEmail} / ${password}`);
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  connectToDatabase()
    .then(() => seedDatabase())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await disconnectFromDatabase();
    });
}
