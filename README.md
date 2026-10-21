# EMPAIR — Personal AI Life OS 🚀

**One platform. Your life, organized.**

EMPAIR is a personal productivity and life-management platform designed to bring everyday activities into one place. It helps users manage academic attendance, daily routines, tasks, personal achievements, projects, certificates, and financial transactions through a unified dashboard.

The long-term vision of EMPAIR is to evolve into a privacy-first Personal AI Life OS that helps people organize their goals, manage important information, and make better decisions.

> **Project Status:** Active Development — Version 1.0.0 milestone

---

## ✨ Features

### 📊 Personal Dashboard
- Centralized dashboard for everyday activities.
- Quick access to productivity, academic, journey, and finance modules.

### ✅ Task Management
- Create, update, complete, and delete tasks.
- Organize tasks by priority and due date.
- Persist tasks in PostgreSQL.

### 📅 Attendance Management
- Track attendance by subject and date.
- Mark attendance as Present, Absent, or Pending.
- Store and retrieve attendance records from the backend.

### 🗓️ Daily Routine
- Create and manage daily schedules.
- Set subjects, dates, start times, and end times.
- Edit or delete routine entries.
- Integrate routine activities with attendance tracking.

### 🎓 My Journey
- Maintain academic journey information.
- Record projects, certificates, and hackathon achievements.
- Save descriptions, dates, and relevant links.

### 📝 Journey Notes
- Organize notes by semester.
- Upload supported PNG, JPG, and PDF files.
- Access stored notes through authenticated backend routes.

### 💰 Personal Finance
- Record income and expenses.
- Organize transactions by category and date.
- Track opening balance and calculate current balance.
- View transaction history and financial summaries.
- Export financial statements to CSV and print-friendly formats.

### 🔐 Authentication and Data Protection
- Backend authentication using JWT.
- Password hashing for account credentials.
- Protected API routes.
- User-specific data access enforced by the backend.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, password hashing |
| API Communication | REST APIs |
| Development Tools | Git, GitHub, VS Code, pgAdmin |

---

## 🏗️ Project Architecture

```text
EMPAIR/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── tasksRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── routineRoutes.js
│   │   ├── journeyRoutes.js
│   │   ├── journeyNotesRoutes.js
│   │   └── financeRoutes.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── src/
│   ├── components/
│   │   └── Dashboard.jsx
│   ├── styles/
│   │   └── Dashboard.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
└── README.md
```

*The tree shows the main known project files. Additional files may exist in the repository.*

---

## ⚙️ Prerequisites

Install the following before running EMPAIR locally:

- [Node.js](https://nodejs.org/) — use a supported LTS release.
- npm — included with Node.js.
- [PostgreSQL](https://www.postgresql.org/) — database server.
- [Git](https://git-scm.com/) — for source control.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/empair.git
cd empair
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

### 2. Install frontend dependencies

From the project root:

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure PostgreSQL

Create a PostgreSQL database named `empair` using pgAdmin or the PostgreSQL command line.

```sql
CREATE DATABASE empair;
```

Create a `backend/.env` file with your local configuration:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=empair

JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

Replace the placeholder values with your own local credentials. Never commit `.env` or publish database passwords, JWT secrets, or other credentials.

### 5. Initialize the database schema

Create the tables and constraints required by the project before using the application.

Use the SQL schema and migrations maintained with the project. Ensure the required tables exist for users, tasks, attendance, daily routines, journey profiles and items, journey notes, finance transactions, and finance settings.

Do not assume that creating the database alone creates these tables.

### 6. Start the backend

Open a terminal in the `backend` directory:

```bash
npm run dev
```

The backend should run at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

A healthy response should indicate that the backend and database are connected.

### 7. Start the frontend

Open a **second terminal** at the project root:

```bash
npm run dev
```

Vite will display the local frontend URL, typically:

```text
http://localhost:5173
```

Open that URL in your browser.

Keep both terminals running while using EMPAIR.

---

## 🔌 API Overview

The backend exposes REST API routes for the application's main modules.

| Module | Base route |
|---|---|
| Authentication | `/api/auth` |
| Tasks | `/api/tasks` |
| Attendance | `/api/attendance` |
| Daily Routine | `/api/routine` |
| My Journey | `/api/journey` |
| Journey Notes | `/api/journey-notes` |
| Finance | `/api/finance` |
| Health Check | `/api/health` |

Protected endpoints require a valid authentication token. The frontend and backend must both be running, and the backend must be configured to connect to PostgreSQL.

---

## 🔒 Security Notes

- Keep `.env` out of version control.
- Never publish real passwords, API keys, tokens, or personal documents.
- Use strong, unique secrets for local and production environments.
- Keep private uploads and generated files out of public repositories.
- Review authentication, authorization, upload validation, and deployment settings before production use.

**Note:** A successful local run does not automatically mean the application is production-ready. Production deployment requires additional security, backup, monitoring, and configuration work.

---

## 🗺️ Roadmap

Planned improvements may include:

- Email verification with one-time passwords (OTP).
- Google sign-in and account registration.
- Secure password recovery.
- AI-powered summaries and personal assistance.
- Secure document vault.
- Improved mobile experience.
- Production deployment and subscription support.

These are roadmap items and should not be considered available until implemented and verified.

---

## 🎯 Vision

EMPAIR aims to reduce the need to switch between multiple applications by providing one organized place for productivity, academics, personal progress, and financial tracking.

The goal is to build a practical, privacy-conscious platform that can grow alongside its users.

---

## 👨‍💻 Author

**Uttakaladeba Garnaik**

- GitHub: [@uttakaladebagarnaik](https://github.com/uttakaladebagarnaik)
- YouTube: [Uttakala Official](https://www.youtube.com/@uttakaladeba)
- Instagram: [@uttakala_deba](https://www.instagram.com/uttakala_deba/)

---

## 📄 License

No license has been specified yet. Unless a license is added, the repository should not be assumed to grant permission to reuse, distribute, or modify the code.

---

**Built with ambition. Designed for real life. — EMPAIR** 🚀





# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
#   e m p a i r - l i f e - o s  
 