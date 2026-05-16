const API_BASE = "";

async function request(path, options = {}) {
  const token = localStorage.getItem("ethara_token");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export const api = {
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  signup: (payload) =>
    request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: () => request("/api/auth/me"),
  dashboard: () => request("/api/dashboard"),
  users: () => request("/api/users"),
  projects: () => request("/api/projects"),
  createProject: (payload) =>
    request("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateProject: (projectId, payload) =>
    request(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteProject: (projectId) =>
    request(`/api/projects/${projectId}`, {
      method: "DELETE"
    }),
  tasks: () => request("/api/tasks"),
  createTask: (payload) =>
    request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteTask: (taskId) =>
    request(`/api/tasks/${taskId}`, {
      method: "DELETE"
    }),
  updateTask: (taskId, payload) =>
    request(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  timesheets: () => request("/api/timesheets"),
  createTimesheet: (payload) =>
    request("/api/timesheets", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  reviewTimesheet: (entryId, payload) =>
    request(`/api/timesheets/${entryId}/review`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    })
};
