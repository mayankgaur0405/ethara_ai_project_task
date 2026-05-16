import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./state";

const navItems = [
  { key: "dashboard", label: "Dashboard", path: "/" },
  { key: "projects", label: "Projects", path: "/projects" },
  { key: "tasks", label: "Tasks", path: "/tasks" },
  { key: "timesheets", label: "Timesheets", path: "/timesheets" },
  { key: "team", label: "Team", path: "/team" }
];

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function ProtectedApp() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  async function refreshAll() {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, projectsData, tasksData, usersData, timesheetsData] = await Promise.all([
        api.dashboard(),
        api.projects(),
        api.tasks(),
        api.users(),
        api.timesheets()
      ]);
      setDashboard(dashboardData);
      setProjects(projectsData);
      setTasks(tasksData);
      setUsers(usersData);
      setTimesheets(timesheetsData);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("invalid") || err.message.toLowerCase().includes("authentication")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const teamSummary = useMemo(() => {
    return users.map((entry) => {
      const userTasks = tasks.filter((task) => task.assignee?.id === entry.id);
      const active = userTasks.filter((task) => task.status === "IN_PROGRESS").length;
      const done = userTasks.filter((task) => task.status === "DONE").length;
      return {
        ...entry,
        active,
        done,
        assigned: userTasks.length
      };
    });
  }, [users, tasks]);

  const content = {
    dashboard: (
      <DashboardPage user={user} dashboard={dashboard} tasks={tasks} onQuickStatusUpdate={handleTaskStatusUpdate} />
    ),
    projects: (
      <ProjectsPage
        user={user}
        projects={projects}
        onCreate={() => setProjectModalOpen(true)}
        onEdit={(project) => {
          setEditingProject(project);
          setProjectModalOpen(true);
        }}
        onDelete={handleProjectDelete}
      />
    ),
    tasks: (
      <TasksPage
        user={user}
        tasks={tasks}
        projects={projects}
        onCreate={() => setTaskModalOpen(true)}
        onStatusChange={handleTaskStatusUpdate}
        onEdit={(task) => {
          setEditingTask(task);
          setTaskModalOpen(true);
        }}
        onDelete={handleTaskDelete}
      />
    ),
    timesheets: (
      <TimesheetsPage
        user={user}
        timesheets={timesheets}
        tasks={tasks}
        projects={projects}
        onCreate={() => setTimesheetModalOpen(true)}
        onReview={handleTimesheetReview}
      />
    ),
    team: <TeamPage summary={teamSummary} />
  };

  async function handleProjectCreate(form) {
    if (editingProject) {
      await api.updateProject(editingProject.id, form);
    } else {
      await api.createProject(form);
    }
    setProjectModalOpen(false);
    setEditingProject(null);
    await refreshAll();
  }

  async function handleTaskCreate(form) {
    if (editingTask) {
      await api.updateTask(editingTask.id, form);
    } else {
      await api.createTask(form);
    }
    setTaskModalOpen(false);
    setEditingTask(null);
    await refreshAll();
  }

  async function handleTaskStatusUpdate(taskId, status) {
    await api.updateTask(taskId, { status });
    await refreshAll();
  }

  async function handleProjectDelete(project) {
    if (!window.confirm(`Delete project "${project.name}"? This will also remove its tasks and timesheets.`)) {
      return;
    }

    await api.deleteProject(project.id);
    await refreshAll();
  }

  async function handleTaskDelete(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) {
      return;
    }

    await api.deleteTask(task.id);
    await refreshAll();
  }

  async function handleTimesheetCreate(form) {
    await api.createTimesheet(form);
    setTimesheetModalOpen(false);
    await refreshAll();
  }

  async function handleTimesheetReview(entryId, status) {
    await api.reviewTimesheet(entryId, { status });
    await refreshAll();
  }

  const activeKey = navItems.find((item) => item.path === location.pathname)?.key || "dashboard";

  if (loading && !dashboard) {
    return <FullPageMessage title="Loading workspace..." subtitle="Preparing your projects, tasks, and team overview." />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">E</div>
          <div>
            <strong>Ethara AI</strong>
            <p>Task Manager</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={classNames("nav-item", activeKey === item.key && "active")}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="avatar">{initials(user.name)}</div>
            <div>
              <strong>{user.name}</strong>
              <p>{user.role}</p>
            </div>
          </div>
          <button type="button" className="ghost-button full-width" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{navItems.find((item) => item.key === activeKey)?.label}</h1>
            <p>Deliver projects, assign ownership, and keep progress visible.</p>
          </div>
          <div className="topbar-actions">
            {user.role === "ADMIN" && activeKey === "projects" && (
              <button className="primary-button" onClick={() => setProjectModalOpen(true)}>
                New Project
              </button>
            )}
            {user.role === "ADMIN" && activeKey === "tasks" && (
              <button className="primary-button" onClick={() => setTaskModalOpen(true)}>
                New Task
              </button>
            )}
            {activeKey === "timesheets" && (
              <button className="primary-button" onClick={() => setTimesheetModalOpen(true)}>
                Log Hours
              </button>
            )}
            <div className="avatar large">{initials(user.name)}</div>
          </div>
        </header>

        {error ? <div className="banner error">{error}</div> : null}
        {loading ? <div className="banner">Refreshing latest project data...</div> : null}

        {content[activeKey]}
      </main>

      {projectModalOpen ? (
        <ProjectModal
          users={users}
          project={editingProject}
          onClose={() => {
            setProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSubmit={handleProjectCreate}
        />
      ) : null}
      {taskModalOpen ? (
        <TaskModal
          projects={projects}
          task={editingTask}
          onClose={() => {
            setTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleTaskCreate}
        />
      ) : null}
      {timesheetModalOpen ? (
        <TimesheetModal
          user={user}
          projects={projects}
          tasks={tasks}
          onClose={() => setTimesheetModalOpen(false)}
          onSubmit={handleTimesheetCreate}
        />
      ) : null}
    </div>
  );
}

function DashboardPage({ user, dashboard, tasks, onQuickStatusUpdate }) {
  if (!dashboard) return null;

  return (
    <div className="page-grid">
      <section className="stats-row">
        <StatCard label="Projects" value={dashboard.stats.totalProjects} tone="neutral" />
        <StatCard label="Tasks" value={dashboard.stats.totalTasks} tone="neutral" />
        <StatCard label="In Progress" value={dashboard.stats.activeTasks} tone="green" />
        <StatCard label="Completed" value={dashboard.stats.completedTasks} tone="blue" />
        <StatCard label="Overdue" value={dashboard.stats.overdueTasks} tone="orange" />
      </section>

      <section className="panel wide">
        <div className="panel-header">
          <h2>Recent Tasks</h2>
          <span>{tasks.length} total</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Assigned</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.project.name}</td>
                  <td>{task.assignee?.name || "Unassigned"}</td>
                  <td>
                    <span className={classNames("pill", task.priority.toLowerCase())}>{task.priority.replace("_", " ")}</span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={task.status}
                      disabled={user.role !== "ADMIN" && task.assignee?.id !== user.id}
                      onChange={(event) => onQuickStatusUpdate(task.id, event.target.value)}
                    >
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="REVIEW">REVIEW</option>
                      <option value="DONE">DONE</option>
                    </select>
                  </td>
                  <td>{formatDate(task.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Project Progress</h2>
        </div>
        <div className="stack-list">
          {dashboard.projects.map((project) => (
            <div key={project.id} className="stack-item">
              <div className="stack-head">
                <div>
                  <strong>{project.name}</strong>
                  <p>{project.taskCount} tasks | {project.memberCount} members</p>
                </div>
                <span className="badge">{project.status.replace("_", " ")}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${project.progress}%` }} />
              </div>
              <small>{project.progress}% complete</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Overdue Focus</h2>
        </div>
        <div className="stack-list">
          {dashboard.overdue.length ? (
            dashboard.overdue.map((item) => (
              <div key={item.id} className="stack-item warning">
                <strong>{item.title}</strong>
                <p>{item.project}</p>
                <small>{item.assignee?.name || "Unassigned"} | due {formatDate(item.dueDate)}</small>
              </div>
            ))
          ) : (
            <EmptyState label="No overdue tasks right now." />
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectsPage({ user, projects, onCreate, onEdit, onDelete }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Projects</h2>
        {user.role === "ADMIN" ? (
          <button className="primary-button" onClick={onCreate}>
            Create Project
          </button>
        ) : null}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th>Dates</th>
              <th>Members</th>
              <th>Tasks</th>
              <th>Progress</th>
              {user.role === "ADMIN" ? <th className="actions-column">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <strong>{project.name}</strong>
                  <p className="muted-line">{project.description}</p>
                </td>
                <td><span className="badge">{project.status.replace("_", " ")}</span></td>
                <td>{formatDate(project.startDate)} - {formatDate(project.endDate)}</td>
                <td>{project.memberCount}</td>
                <td>{project.completedTasks}/{project.taskCount}</td>
                <td>
                  <div className="progress-track compact">
                    <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                  </div>
                  <small>{project.progress}%</small>
                </td>
                {user.role === "ADMIN" ? (
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => onEdit(project)}>
                        Edit
                      </button>
                      <button type="button" className="icon-button danger" onClick={() => onDelete(project)}>
                        Delete
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TasksPage({ user, tasks, onCreate, onStatusChange, onEdit, onDelete }) {
  const [filter, setFilter] = useState("ALL");

  const filteredTasks = useMemo(() => {
    if (filter === "ALL") return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Tasks</h2>
        <div className="inline-actions">
          <select className="status-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="REVIEW">REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
          {user.role === "ADMIN" ? (
            <button className="primary-button" onClick={onCreate}>
              New Task
            </button>
          ) : null}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Hours</th>
              <th>Due Date</th>
              <th>Status</th>
              {user.role === "ADMIN" ? <th className="actions-column">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.title}</strong>
                  <p className="muted-line">{task.description}</p>
                </td>
                <td>{task.project.name}</td>
                <td>{task.assignee?.name || "Unassigned"}</td>
                <td><span className={classNames("pill", task.priority.toLowerCase())}>{task.priority}</span></td>
                <td>{task.estimatedHours || "--"}</td>
                <td>{formatDate(task.dueDate)}</td>
                <td>
                  <select
                    className="status-select"
                    value={task.status}
                    disabled={user.role !== "ADMIN" && task.assignee?.id !== user.id}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="DONE">DONE</option>
                  </select>
                </td>
                {user.role === "ADMIN" ? (
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-button" onClick={() => onEdit(task)}>
                        Edit
                      </button>
                      <button type="button" className="icon-button danger" onClick={() => onDelete(task)}>
                        Delete
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimesheetsPage({ user, timesheets, tasks, projects, onCreate, onReview }) {
  const [tab, setTab] = useState("mine");

  const myTimesheets = useMemo(
    () => timesheets.filter((entry) => entry.user.id === user.id),
    [timesheets, user.id]
  );
  const pendingTimesheets = useMemo(
    () => timesheets.filter((entry) => entry.status === "PENDING"),
    [timesheets]
  );
  const reviewedTimesheets = useMemo(
    () => timesheets.filter((entry) => entry.status !== "PENDING"),
    [timesheets]
  );
  const pendingHours = useMemo(
    () => pendingTimesheets.reduce((sum, entry) => sum + entry.hours, 0),
    [pendingTimesheets]
  );

  const visibleTabs = user.role === "ADMIN"
    ? [
        { key: "mine", label: "My Timesheets" },
        { key: "pending", label: "Approval Queue" },
        { key: "reviewed", label: "Reviewed Queue" }
      ]
    : [{ key: "mine", label: "My Timesheets" }];

  const activeEntries =
    tab === "pending" ? pendingTimesheets : tab === "reviewed" ? reviewedTimesheets : myTimesheets;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Timesheets</h2>
          <p className="muted-line">
            Pending: <strong>{pendingHours.toFixed(2)} hrs</strong> | Visible projects: {projects.length} | Visible tasks: {tasks.length}
          </p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          Log Hours
        </button>
      </div>

      <div className="tab-row">
        {visibleTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={classNames("tab-button", tab === item.key && "active")}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Project</th>
              <th>Task</th>
              <th>Logged Date</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Note</th>
              {user.role === "ADMIN" && tab === "pending" ? <th className="actions-column">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {activeEntries.length ? (
              activeEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.user.name}</td>
                  <td>{entry.project.name}</td>
                  <td>{entry.task.title}</td>
                  <td>{formatDate(entry.loggedDate)}</td>
                  <td>{entry.hours}</td>
                  <td><span className={classNames("badge", `status-${entry.status.toLowerCase()}`)}>{entry.status}</span></td>
                  <td>
                    <strong>{entry.note || "--"}</strong>
                    {entry.reviewNote ? <p className="muted-line">Review: {entry.reviewNote}</p> : null}
                  </td>
                  {user.role === "ADMIN" && tab === "pending" ? (
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-button approve" onClick={() => onReview(entry.id, "APPROVED")}>
                          Accept
                        </button>
                        <button type="button" className="icon-button danger" onClick={() => onReview(entry.id, "REJECTED")}>
                          Reject
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={user.role === "ADMIN" && tab === "pending" ? 8 : 7}>
                  <EmptyState label="No timesheet entries found for this view." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamPage({ summary }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Team</h2>
      </div>
      <div className="card-grid">
        {summary.map((member) => (
          <article key={member.id} className="member-card">
            <div className="profile-card">
              <div className="avatar">{initials(member.name)}</div>
              <div>
                <strong>{member.name}</strong>
                <p>{member.email}</p>
              </div>
            </div>
            <div className="member-metrics">
              <span>Role: {member.role}</span>
              <span>Assigned: {member.assigned}</span>
              <span>Active: {member.active}</span>
              <span>Done: {member.done}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectModal({ users, project, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
    startDate: project?.startDate ? formatDateInput(project.startDate) : "",
    endDate: project?.endDate ? formatDateInput(project.endDate) : "",
    status: project?.status || "PLANNING",
    memberIds: project?.members?.map((member) => member.user.id) || []
  });
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalLayout title={project ? "Edit Project" : "New Project"} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label>
          Project Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ethara Product Sprint" />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Define the delivery scope, ownership, and outcome." />
        </label>
        <div className="form-grid">
          <label>
            Start Date
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </label>
          <label>
            End Date
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </label>
        </div>
        <label>
          Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="PLANNING">PLANNING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_HOLD">ON HOLD</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </label>
        <label>
          Team Members
          <MultiSelectDropdown
            options={users.map((user) => ({
              value: user.id,
              label: `${user.name} (${user.role})`
            }))}
            selectedValues={form.memberIds}
            onChange={(memberIds) => setForm({ ...form, memberIds })}
            placeholder="Select project members"
          />
        </label>
        {error ? <div className="banner error">{error}</div> : null}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">{project ? "Save Project" : "Create Project"}</button>
        </div>
      </form>
    </ModalLayout>
  );
}

function TaskModal({ projects, task, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    projectId: task?.project?.id || "",
    assigneeId: task?.assignee?.id || "",
    dueDate: task?.dueDate ? formatDateInput(task.dueDate) : "",
    status: task?.status || "TODO",
    priority: task?.priority || "MEDIUM",
    estimatedHours: task?.estimatedHours ?? ""
  });
  const [error, setError] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.projectId) || null,
    [form.projectId, projects]
  );
  const projectMembers = selectedProject?.members?.map((member) => member.user) || [];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalLayout title={task ? "Edit Task" : "New Task"} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Design project dashboard widgets" />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add the main task details and expected outcome." />
        </label>
        <label>
          Project
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value, assigneeId: "" })}
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Assigned To
            <select
              value={form.assigneeId}
              disabled={!form.projectId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {projectMembers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due Date
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Priority
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="REVIEW">REVIEW</option>
              <option value="DONE">DONE</option>
            </select>
          </label>
        </div>
        <label>
          Estimated Hours
          <input value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} placeholder="6" />
        </label>
        {error ? <div className="banner error">{error}</div> : null}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">{task ? "Save Task" : "Create Task"}</button>
        </div>
      </form>
    </ModalLayout>
  );
}

function TimesheetModal({ user, projects, tasks, onClose, onSubmit }) {
  const [form, setForm] = useState({
    projectId: "",
    taskId: "",
    hours: "",
    loggedDate: formatDateInput(new Date()),
    note: ""
  });
  const [error, setError] = useState("");

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.project.id === form.projectId),
    [form.projectId, tasks]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <ModalLayout title={`Log Hours for ${user.name}`} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label>
          Project
          <select
            value={form.projectId}
            onChange={(event) => setForm({ ...form, projectId: event.target.value, taskId: "" })}
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Task
          <select
            value={form.taskId}
            disabled={!form.projectId}
            onChange={(event) => setForm({ ...form, taskId: event.target.value })}
          >
            <option value="">Select Task</option>
            {projectTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Hours
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={form.hours}
              onChange={(event) => setForm({ ...form, hours: event.target.value })}
              placeholder="2.5"
            />
          </label>
          <label>
            Logged Date
            <input
              type="date"
              value={form.loggedDate}
              onChange={(event) => setForm({ ...form, loggedDate: event.target.value })}
            />
          </label>
        </div>
        <label>
          Note
          <textarea
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            placeholder="What did you work on?"
          />
        </label>
        {error ? <div className="banner error">{error}</div> : null}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">Submit Timesheet</button>
        </div>
      </form>
    </ModalLayout>
  );
}

function MultiSelectDropdown({ options, selectedValues, onChange, placeholder }) {
  const [open, setOpen] = useState(false);

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  function toggleValue(nextValue) {
    if (selectedValues.includes(nextValue)) {
      onChange(selectedValues.filter((value) => value !== nextValue));
      return;
    }

    onChange([...selectedValues, nextValue]);
  }

  return (
    <div className="multi-select">
      <button type="button" className="multi-select-trigger" onClick={() => setOpen((value) => !value)}>
        {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
      </button>
      {open ? (
        <div className="multi-select-menu">
          {options.map((option) => (
            <label key={option.value} className="multi-select-option">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModalLayout({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <article className={classNames("stat-card", tone)}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function FullPageMessage({ title, subtitle }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return <div className="empty">{label}</div>;
}

function formatDateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = mode === "login" ? await api.login(form) : await api.signup(form);
      login(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card wide-auth">
        <div className="auth-copy">
          <span className="eyebrow">Ethara AI Assignment</span>
          <h1>Dark, role-based task management with a clean execution flow.</h1>
          <p>
            This starter includes authentication, projects, task assignment, overdue visibility,
            and an admin/member workflow shaped around your reference screens.
          </p>
          <div className="auth-tip">
            <strong>Demo accounts after seeding</strong>
            <p>admin@ethara.local / Password123!</p>
            <p>member@ethara.local / Password123!</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="mode-toggle">
            <button type="button" className={classNames(mode === "login" && "selected")} onClick={() => setMode("login")}>
              Login
            </button>
            <button type="button" className={classNames(mode === "signup" && "selected")} onClick={() => setMode("signup")}>
              Signup
            </button>
          </div>

          {mode === "signup" ? (
            <label>
              Full Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mayank Gaur" />
            </label>
          ) : null}

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" />
          </label>

          {error ? <div className="banner error">{error}</div> : null}

          <button type="submit" className="primary-button full-width" disabled={pending}>
            {pending ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageMessage title="Checking session..." subtitle="Restoring your workspace." />;
  }

  return (
    <Routes>
      {user ? (
        <>
          <Route path="/*" element={<ProtectedApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="*" element={<AuthPage />} />
        </>
      )}
    </Routes>
  );
}
