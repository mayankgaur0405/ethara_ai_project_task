# 🚀 Ethara AI Team Task Manager

A modern full-stack team collaboration and task management platform built for the **Ethara AI Assignment**.
Designed with secure authentication, role-based access control, project/task workflows, and a clean dark-themed UI inspired by the provided reference screens.

---

## ✨ Features

### 🔐 Authentication & Security

* JWT-based authentication
* Secure login & signup flow
* Password hashing with bcrypt
* Protected API routes
* Persistent sessions

### 👥 Role-Based Access Control (RBAC)

#### ADMIN

* Create and manage projects
* Assign team members
* Create and assign tasks
* Monitor overall project progress
* Track overdue tasks

#### MEMBER

* View assigned projects/tasks
* Update task statuses
* Track personal workload

---

## 📊 Dashboard Highlights

* 📈 Project progress tracking
* ⏰ Overdue task visibility
* 📋 Task status management
* 👨‍💻 Team assignment overview
* 🌙 Responsive dark UI

---

## 🛠️ Tech Stack

### Frontend

* ⚛️ React
* ⚡ Vite
* 🎨 Modern Dark UI

### Backend

* 🟢 Node.js
* 🚂 Express.js
* 🔐 JWT Authentication

### Database

* 🍃 MongoDB
* 📦 Mongoose ODM

### Deployment

* 🚄 Railway

---

# 📂 Project Structure

```bash
ethara-ai-task-manager/
│
├── client/                 # Frontend (React + Vite)
├── server/                 # Backend (Express API)
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── config/
│
├── scripts/                # Seeder scripts
├── railway.json
├── package.json
└── README.md
```

---

# ⚙️ Local Development Setup

## 1️⃣ Clone the Repository

```bash
git clone <your-github-repo-url>
cd ethara-ai-task-manager
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Configure Environment Variables

Create a `.env` file in the root directory or inside `server/`.

```env
MONGODB_URI="mongodb://127.0.0.1:27017/ethara_task_manager"
JWT_SECRET="replace-this-in-production"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

---

## 4️⃣ Seed Demo Data

```bash
npm run db:seed
```

This creates demo users, projects, and tasks.

---

## 5️⃣ Start Development Server

```bash
npm run dev
```

### App URLs

| Service     | URL                     |
| ----------- | ----------------------- |
| Frontend    | `http://localhost:5173` |
| Backend API | `http://localhost:4000` |

---

# 🔑 Demo Credentials

| Role   | Email                 | Password       |
| ------ | --------------------- | -------------- |
| ADMIN  | `admin@ethara.local`  | `Password123!` |
| MEMBER | `member@ethara.local` | `Password123!` |

---

# 🚄 Railway Deployment

## 1️⃣ Push Code to GitHub

Upload the repository to GitHub.

---

## 2️⃣ Create Railway Project

Go to
[Railway](https://railway.app?utm_source=chatgpt.com)

Create a new project using the GitHub repository.

---

## 3️⃣ Add Environment Variables

```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority"
JWT_SECRET="use-a-secure-secret"
CLIENT_ORIGIN="https://your-railway-domain.up.railway.app"
PORT=4000
```

---

## 4️⃣ Deploy

Railway automatically detects the configuration using:

```bash
railway.json
```

---

## 5️⃣ Database Setup

You can either:

* Use Railway MongoDB plugin
* OR connect MongoDB Atlas

Official MongoDB Atlas website:
[MongoDB Atlas](https://www.mongodb.com/atlas/database?utm_source=chatgpt.com)

---

# 📸 Screens & Functionalities Covered

✅ Authentication System
✅ Role-Based Access Control
✅ Project Management
✅ Team Assignment
✅ Task Assignment & Tracking
✅ Dashboard Analytics
✅ Overdue Task Detection
✅ REST API Architecture
✅ MongoDB Relationships & Validation
✅ Responsive Dark UI

---

# 🎥 Submission Checklist

* ✅ Live Railway Deployment URL
* ✅ GitHub Repository
* ✅ Updated README
* ✅ Demo Video (2–5 mins)

### Demo Video Should Include:

* Login & Signup flow
* Admin creating projects/tasks
* Member updating task status
* Dashboard overview
* Overdue task tracking

---

# 📌 Future Improvements

* 🔔 Real-time notifications
* 📅 Calendar integration
* 💬 Team chat system
* 📎 File attachments
* 📊 Advanced analytics
* 📱 Mobile responsiveness enhancements

---
# 📌 Author - Neha Gaur

---


# 📜 License

This project was developed for the **Ethara AI Assignment** and is intended for educational and evaluation purposes.
