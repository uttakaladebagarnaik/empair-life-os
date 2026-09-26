import { useEffect, useState } from "react";
import "../styles/Dashboard.css";

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TASKS_API_URL = "http://localhost:5000/api/tasks";

// Temporary test user for v0.4.
// Real authenticated user ID will be connected in the authentication phase.
const CURRENT_USER_ID = 1;

const normalizeTaskDueDate = (value) => {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeTask = (task) => ({
  ...task,
  id: String(task.id),
  dueDate: normalizeTaskDueDate(task.due_date ?? task.dueDate),
  completed: Boolean(task.is_completed ?? task.completed),
});

const parseDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = (centerDate, amount = 7) => {
  const center = parseDate(centerDate);
  const dates = [];
  const startOffset = Math.floor(amount / 2);

  for (let i = 0; i < amount; i += 1) {
    const date = new Date(center);
    date.setDate(center.getDate() - startOffset + i);
    dates.push(formatDate(date));
  }

  return dates;
};

const formatDisplayDate = (dateString) => {
  return parseDate(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getDayName = (dateString) => {
  return parseDate(dateString).toLocaleDateString("en-IN", {
    weekday: "short",
  });
};

const getShortDate = (dateString) => {
  return parseDate(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

function Dashboard({ name = "Uttakaladeba" }) {
  const [activePage, setActivePage] = useState("Dashboard");

  const [semesterOpen, setSemesterOpen] = useState(false);

  // =====================================================
  // DAILY ROUTINE / ATTENDANCE DATA
  // =====================================================

  const [dailyRoutine, setDailyRoutine] = useState(() => {
    try {
      const savedRoutine = localStorage.getItem("empair_daily_routine");
      if (savedRoutine) {
        return JSON.parse(savedRoutine);
      }
    } catch (error) {
      console.error("Failed to load EMPAIR routine:", error);
    }

    return {
    "2026-09-25": [
      {
        id: 1,
        name: "Universal Human Values",
        code: "UHV",
        status: "pending",
      },
      {
        id: 2,
        name: "Engineering Chemistry",
        code: "CHEM",
        status: "pending",
      },
      {
        id: 3,
        name: "Engineering Mathematics",
        code: "MATH",
        status: "pending",
      },
      {
        id: 4,
        name: "Programming in C",
        code: "PC",
        status: "pending",
      },
    ],

    "2026-09-26": [
      {
        id: 5,
        name: "Basic Mechanical Engineering",
        code: "BME",
        status: "pending",
      },
      {
        id: 6,
        name: "Basic Electrical Engineering",
        code: "BE",
        status: "pending",
      },
    ],
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "empair_daily_routine",
        JSON.stringify(dailyRoutine)
      );
    } catch (error) {
      console.error("Failed to save EMPAIR routine:", error);
    }
  }, [dailyRoutine]);

  const [selectedDate, setSelectedDate] =
    useState(() => localStorage.getItem("empair_selected_date") || getToday());

  const visibleDates = getDateRange(selectedDate, 7);

  const moveDateWindow = (direction) => {
    const current = parseDate(selectedDate);
    current.setDate(current.getDate() + direction * 7);
    setSelectedDate(formatDate(current));
  };

  const goToToday = () => {
    setSelectedDate(getToday());
  };

  useEffect(() => {
    localStorage.setItem("empair_selected_date", selectedDate);
  }, [selectedDate]);

  const [showAddSubject, setShowAddSubject] =
    useState(false);

  const [newSubjectName, setNewSubjectName] =
    useState("");

  const [newSubjectCode, setNewSubjectCode] =
    useState("");

  // =====================================================
  // TASKS
  // =====================================================

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  const loadTasks = async () => {
    try {
      setTasksLoading(true);
      setTasksError("");

      const response = await fetch(TASKS_API_URL);

      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }

      const data = await response.json();
      setTasks((data.tasks || []).map(normalizeTask));
    } catch (error) {
      console.error("Failed to load EMPAIR tasks:", error);
      setTasksError(
        "Unable to connect to EMPAIR backend. Make sure the server is running on port 5000."
      );
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority("medium");
    setTaskDueDate("");
    setEditingTaskId(null);
    setShowTaskForm(false);
  };

  const openTaskForm = (task = null) => {
    if (task) {
      setEditingTaskId(task.id);
      setTaskTitle(task.title);
      setTaskDescription(task.description || "");
      setTaskPriority(task.priority || "medium");
      setTaskDueDate(task.dueDate || "");
    } else {
      setEditingTaskId(null);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskDueDate("");
    }
    setShowTaskForm(true);
    setActivePage("Tasks");
  };

  const saveTask = async (e) => {
    e.preventDefault();

    if (!taskTitle.trim()) return;

    try {
      setTasksError("");

      const payload = {
        user_id: CURRENT_USER_ID,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        due_date: taskDueDate || null,
      };

      let response;

      if (editingTaskId) {
        response = await fetch(`${TASKS_API_URL}/${editingTaskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(TASKS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save task");
      }

      if (editingTaskId) {
        setTasks((previous) =>
          previous.map((task) =>
            String(task.id) === String(editingTaskId)
              ? normalizeTask(data.task)
              : task
          )
        );
      } else {
        setTasks((previous) => [normalizeTask(data.task), ...previous]);
      }

      resetTaskForm();
    } catch (error) {
      console.error("Failed to save EMPAIR task:", error);
      setTasksError(
        error.message || "Unable to save task. Please try again."
      );
    }
  };

  const toggleTask = async (taskId) => {
    const currentTask = tasks.find(
      (task) => String(task.id) === String(taskId)
    );

    if (!currentTask) return;

    try {
      setTasksError("");

      const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_completed: !currentTask.completed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update task");
      }

      setTasks((previous) =>
        previous.map((task) =>
          String(task.id) === String(taskId)
            ? normalizeTask(data.task)
            : task
        )
      );
    } catch (error) {
      console.error("Failed to update EMPAIR task:", error);
      setTasksError(
        error.message || "Unable to update task. Please try again."
      );
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setTasksError("");

      const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete task");
      }

      setTasks((previous) =>
        previous.filter((task) => String(task.id) !== String(taskId))
      );
    } catch (error) {
      console.error("Failed to delete EMPAIR task:", error);
      setTasksError(
        error.message || "Unable to delete task. Please try again."
      );
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "pending") return !task.completed;
    if (taskFilter === "completed") return task.completed;
    return true;
  });

  const pendingTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  const todayTaskCount = tasks.filter(
    (task) => task.dueDate === getToday()
  ).length;

  const getPriorityLabel = (priority) => {
    if (priority === "high") return "HIGH";
    if (priority === "low") return "LOW";
    return "MEDIUM";
  };

  const formatTaskDueDate = (dateString) => {
    if (!dateString) return "No due date";
    return parseDate(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isTaskOverdue = (task) => {
    return (
      Boolean(task.dueDate) &&
      task.dueDate < getToday() &&
      !task.completed
    );
  };

  // =====================================================
  // MENU
  // =====================================================

  const menuItems = [
    {
      name: "Dashboard",
      icon: "⌂",
    },
    {
      name: "My Journey",
      icon: "🎓",
    },
    {
      name: "Tasks",
      icon: "✓",
    },
    {
      name: "Attendance",
      icon: "📚",
    },
    {
      name: "Finance",
      icon: "₹",
    },
    {
      name: "Storage",
      icon: "▣",
    },
    {
      name: "Secure Vault",
      icon: "🔐",
    },
  ];

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const getTodaySubjects = () => {
    return dailyRoutine[selectedDate] || [];
  };

  const todaySubjects = getTodaySubjects();

  // =====================================================
  // NAVIGATION
  // =====================================================

  const handleNavigation = (page) => {
    setActivePage(page);
    setSemesterOpen(false);
  };

  const openSemester = () => {
    setActivePage("My Journey");
    setSemesterOpen(true);
  };

  // =====================================================
  // ADD SUBJECT
  // =====================================================

  const addSubject = (e) => {
    e.preventDefault();

    if (!newSubjectName.trim()) {
      return;
    }

    const newSubject = {
      id: Date.now(),
      name: newSubjectName.trim(),
      code:
        newSubjectCode.trim() ||
        newSubjectName
          .trim()
          .substring(0, 4)
          .toUpperCase(),
      status: "pending",
    };

    setDailyRoutine((previous) => ({
      ...previous,

      [selectedDate]: [
        ...(previous[selectedDate] || []),
        newSubject,
      ],
    }));

    setNewSubjectName("");
    setNewSubjectCode("");
    setShowAddSubject(false);
  };

  // =====================================================
  // DELETE SUBJECT
  // =====================================================

  const deleteSubject = (subjectId) => {
    setDailyRoutine((previous) => ({
      ...previous,

      [selectedDate]: (
        previous[selectedDate] || []
      ).filter(
        (subject) =>
          subject.id !== subjectId
      ),
    }));
  };

  // =====================================================
  // MARK ATTENDANCE
  // =====================================================

  const markAttendance = (
    subjectId,
    status
  ) => {
    setDailyRoutine((previous) => ({
      ...previous,

      [selectedDate]: (
        previous[selectedDate] || []
      ).map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              status,
            }
          : subject
      ),
    }));
  };

  // =====================================================
  // TODAY STATS
  // =====================================================

  const presentToday =
    todaySubjects.filter(
      (subject) =>
        subject.status === "present"
    ).length;

  const absentToday =
    todaySubjects.filter(
      (subject) =>
        subject.status === "absent"
    ).length;

  const markedToday =
    presentToday + absentToday;

  const todayPercentage =
    markedToday === 0
      ? 0
      : Math.round(
          (presentToday / markedToday) *
            100
        );

  // =====================================================
  // ALL ATTENDANCE STATS
  // =====================================================

  const allSubjects = Object.values(
    dailyRoutine
  ).flat();

  const totalPresent =
    allSubjects.filter(
      (subject) =>
        subject.status === "present"
    ).length;

  const totalMarked =
    allSubjects.filter(
      (subject) =>
        subject.status === "present" ||
        subject.status === "absent"
    ).length;

  const overallAttendance =
    totalMarked === 0
      ? 0
      : Math.round(
          (totalPresent / totalMarked) *
            100
        );

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="dashboard">

      {/* =================================================
          SIDEBAR
         ================================================= */}

      <aside className="sidebar">

        <div className="sidebar-logo">

          <div className="sidebar-logo-box">
            E
          </div>

          <div>
            <strong>
              EMPAIR
            </strong>

            <small>
              PERSONAL LIFE OS
            </small>
          </div>

        </div>


        <nav className="sidebar-nav">

          {menuItems.map((item) => (

            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleNavigation(
                  item.name
                )
              }
            >

              <span>
                {item.icon}
              </span>

              {item.name}

            </button>

          ))}

        </nav>


        <div className="sidebar-bottom">

          <button
            className={`nav-item ${
              activePage === "Settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation(
                "Settings"
              )
            }
          >

            <span>
              ⚙
            </span>

            Settings

          </button>


          <div className="sidebar-version">
            EMPAIR v0.4
          </div>

        </div>

      </aside>


      {/* =================================================
          MAIN CONTENT
         ================================================= */}

      <main className="dashboard-main">


        {/* =================================================
            DASHBOARD
           ================================================= */}

        {activePage === "Dashboard" && (

          <>

            <header className="dashboard-header">

              <div>

                <span className="dashboard-label">
                  PERSONAL LIFE OS
                </span>

                <h1>
                  Good evening, {name} 👋
                </h1>

                <p>
                  Here's what's happening
                  in your life today.
                </p>

              </div>


              <div className="profile-circle">

                {name
                  .charAt(0)
                  .toUpperCase()}

              </div>

            </header>


            <section className="dashboard-section">

              <div className="section-heading">

                <div>

                  <span>
                    OVERVIEW
                  </span>

                  <h2>
                    Your Life at a Glance
                  </h2>

                </div>

              </div>


              <div className="stats-grid">


                {/* JOURNEY */}

                <div
                  className="stat-card journey-card"
                  onClick={() =>
                    handleNavigation(
                      "My Journey"
                    )
                  }
                >

                  <div className="stat-icon">
                    🎓
                  </div>

                  <div className="stat-content">

                    <span className="stat-label">
                      B.TECH JOURNEY
                    </span>

                    <h3>
                      Year 1
                    </h3>

                    <p>
                      Semester 1
                    </p>

                  </div>

                  <div className="stat-arrow">
                    →
                  </div>

                </div>


                {/* ATTENDANCE */}

                <div
                  className="stat-card journey-card"
                  onClick={() =>
                    handleNavigation(
                      "Attendance"
                    )
                  }
                >

                  <div className="stat-icon">
                    📚
                  </div>

                  <div className="stat-content">

                    <span className="stat-label">
                      ATTENDANCE
                    </span>

                    <h3>
                      {overallAttendance}%
                    </h3>

                    <p>
                      All marked classes
                    </p>

                  </div>

                  <div className="progress-ring">
                    {overallAttendance}
                  </div>

                </div>


                {/* TASKS */}

                <div className="stat-card">

                  <div className="stat-icon">
                    ✓
                  </div>

                  <div className="stat-content">

                    <span className="stat-label">
                      TODAY'S TASKS
                    </span>

                    <h3>
                      {completedTasks.length} / {tasks.length}
                    </h3>

                    <p>
                      {pendingTasks.length} remaining
                    </p>

                  </div>

                </div>


                {/* FINANCE */}

                <div className="stat-card">

                  <div className="stat-icon">
                    ₹
                  </div>

                  <div className="stat-content">

                    <span className="stat-label">
                      THIS MONTH
                    </span>

                    <h3>
                      ₹2,450
                    </h3>

                    <p>
                      Total expenses
                    </p>

                  </div>

                </div>

              </div>

            </section>


            {/* QUICK ACTIONS */}

            <section className="dashboard-section">

              <div className="section-heading">

                <div>

                  <span>
                    QUICK ACTIONS
                  </span>

                  <h2>
                    What do you want to do?
                  </h2>

                </div>

              </div>


              <div className="quick-actions">

                <button
                  className="quick-action"
                  onClick={() => openTaskForm()}
                >

                  <span>
                    ＋
                  </span>

                  <strong>
                    Add Task
                  </strong>

                  <small>
                    Create a new task
                  </small>

                </button>


                <button className="quick-action">

                  <span>
                    ₹
                  </span>

                  <strong>
                    Add Expense
                  </strong>

                  <small>
                    Record your spending
                  </small>

                </button>


                <button className="quick-action">

                  <span>
                    📝
                  </span>

                  <strong>
                    Write Journal
                  </strong>

                  <small>
                    Capture your day
                  </small>

                </button>


                <button
                  className="quick-action"
                  onClick={() =>
                    handleNavigation(
                      "Attendance"
                    )
                  }
                >

                  <span>
                    📚
                  </span>

                  <strong>
                    Mark Attendance
                  </strong>

                  <small>
                    Update today's class
                  </small>

                </button>

              </div>

            </section>


            <div className="dashboard-message">

              <div className="message-icon">
                E
              </div>

              <div>

                <strong>
                  Your life. Your data.
                  Your system.
                </strong>

                <p>
                  EMPAIR is being built
                  around your real life.
                </p>

              </div>

            </div>

          </>

        )}


        {/* =================================================
            MY JOURNEY
           ================================================= */}

        {activePage === "My Journey" &&
          !semesterOpen && (

            <section className="journey-page">

              <div className="journey-header">

                <div>

                  <span className="dashboard-label">
                    MY JOURNEY
                  </span>

                  <h1>
                    B.Tech Journey
                  </h1>

                  <p>
                    Your complete four-year
                    academic journey,
                    captured in one place.
                  </p>

                </div>


                <div className="journey-year-badge">
                  YEAR 1
                </div>

              </div>


              <div
                className="journey-current-card journey-clickable"
                onClick={openSemester}
              >

                <div className="journey-current-icon">
                  🎓
                </div>


                <div className="journey-current-content">

                  <span>
                    CURRENTLY IN
                  </span>

                  <h2>
                    Semester 1
                  </h2>

                  <p>
                    B.Tech Computer Science
                    & Engineering
                  </p>

                </div>


                <div className="journey-current-status">
                  ACTIVE
                </div>

              </div>


              <div className="journey-section-title">

                <span>
                  YOUR TIMELINE
                </span>

                <h2>
                  Four Years. One Journey.
                </h2>

              </div>


              <div className="years-grid">


                <div className="year-card active-year">

                  <div className="year-card-top">

                    <div className="year-number">
                      01
                    </div>

                    <div className="year-status">
                      CURRENT
                    </div>

                  </div>


                  <h3>
                    Year 1
                  </h3>

                  <p>
                    Foundation
                  </p>


                  <div className="semester-list">

                    <div
                      className="semester-item active-semester semester-clickable"
                      onClick={openSemester}
                    >

                      <span>
                        SEM 01
                      </span>

                      <strong>
                        Current Semester
                      </strong>

                      <b>
                        →
                      </b>

                    </div>


                    <div className="semester-item">

                      <span>
                        SEM 02
                      </span>

                      <strong>
                        Upcoming
                      </strong>

                    </div>

                  </div>

                </div>


                <div className="year-card">

                  <div className="year-card-top">

                    <div className="year-number">
                      02
                    </div>

                    <div className="year-status locked">
                      UPCOMING
                    </div>

                  </div>


                  <h3>
                    Year 2
                  </h3>

                  <p>
                    Exploration
                  </p>


                  <div className="locked-message">

                    <span>
                      🔒
                    </span>

                    <span>
                      Journey not started yet
                    </span>

                  </div>

                </div>


                <div className="year-card">

                  <div className="year-card-top">

                    <div className="year-number">
                      03
                    </div>

                    <div className="year-status locked">
                      UPCOMING
                    </div>

                  </div>


                  <h3>
                    Year 3
                  </h3>

                  <p>
                    Growth
                  </p>


                  <div className="locked-message">

                    <span>
                      🔒
                    </span>

                    <span>
                      Journey not started yet
                    </span>

                  </div>

                </div>


                <div className="year-card">

                  <div className="year-card-top">

                    <div className="year-number">
                      04
                    </div>

                    <div className="year-status locked">
                      UPCOMING
                    </div>

                  </div>


                  <h3>
                    Year 4
                  </h3>

                  <p>
                    Launch
                  </p>


                  <div className="locked-message">

                    <span>
                      🔒
                    </span>

                    <span>
                      Journey not started yet
                    </span>

                  </div>

                </div>

              </div>


              <div className="journey-stats">

                <div className="journey-stat">

                  <span>
                    SEMESTERS
                  </span>

                  <strong>
                    1 / 8
                  </strong>

                </div>


                <div className="journey-stat">

                  <span>
                    PROJECTS
                  </span>

                  <strong>
                    0
                  </strong>

                </div>


                <div className="journey-stat">

                  <span>
                    CERTIFICATES
                  </span>

                  <strong>
                    0
                  </strong>

                </div>


                <div className="journey-stat">

                  <span>
                    HACKATHONS
                  </span>

                  <strong>
                    0
                  </strong>

                </div>

              </div>

            </section>

          )}


        {/* =================================================
            SEMESTER 1
           ================================================= */}

        {activePage === "My Journey" &&
          semesterOpen && (

            <section className="semester-page">

              <button
                className="semester-back-button"
                onClick={() =>
                  setSemesterOpen(false)
                }
              >
                ← Back to My Journey
              </button>


              <div className="semester-header">

                <div>

                  <span className="dashboard-label">
                    YEAR 1 · SEMESTER 1
                  </span>

                  <h1>
                    Semester 1
                  </h1>

                  <p>
                    Your current academic semester.
                  </p>

                </div>


                <div className="semester-active-badge">
                  ACTIVE
                </div>

              </div>


              <div className="semester-summary">

                <div className="semester-summary-card">

                  <span>
                    DAILY SUBJECTS
                  </span>

                  <strong>
                    {todaySubjects.length}
                  </strong>

                </div>


                <div className="semester-summary-card">

                  <span>
                    TODAY PRESENT
                  </span>

                  <strong>
                    {presentToday}
                  </strong>

                </div>


                <div className="semester-summary-card">

                  <span>
                    OVERALL
                  </span>

                  <strong>
                    {overallAttendance}%
                  </strong>

                </div>


                <div className="semester-summary-card">

                  <span>
                    STATUS
                  </span>

                  <strong>
                    ON TRACK
                  </strong>

                </div>

              </div>


              <div className="semester-section">

                <div className="semester-section-heading">

                  <div>

                    <span>
                      ACADEMICS
                    </span>

                    <h2>
                      Semester Information
                    </h2>

                  </div>

                </div>


                <div className="semester-record-grid">

                  <div className="semester-record-card">

                    <div>
                      📅
                    </div>

                    <strong>
                      Daily Routine
                    </strong>

                    <span>
                      Add different subjects
                      for every college day.
                    </span>

                  </div>


                  <div className="semester-record-card">

                    <div>
                      📚
                    </div>

                    <strong>
                      Attendance
                    </strong>

                    <span>
                      Mark each class as
                      present or absent.
                    </span>

                  </div>


                  <div className="semester-record-card">

                    <div>
                      📊
                    </div>

                    <strong>
                      Progress
                    </strong>

                    <span>
                      Track your attendance
                      automatically.
                    </span>

                  </div>


                  <div className="semester-record-card">

                    <div>
                      📝
                    </div>

                    <strong>
                      Notes
                    </strong>

                    <span>
                      Save important semester
                      information.
                    </span>

                  </div>

                </div>

              </div>

            </section>

          )}


        {/* =================================================
            ATTENDANCE
           ================================================= */}

        {activePage === "Attendance" && (

          <section className="attendance-page">


            {/* HEADER */}

            <div className="attendance-header">

              <div>

                <span className="dashboard-label">
                  ATTENDANCE TRACKER
                </span>

                <h1>
                  Attendance
                </h1>

                <p>
                  Build your daily routine and
                  mark attendance class by class.
                </p>

              </div>


              <div className="attendance-overall-badge">

                <span>
                  OVERALL
                </span>

                <strong>
                  {overallAttendance}%
                </strong>

              </div>

            </div>


            {/* DATE SELECTOR */}

            <div className="routine-calendar">

              <div className="routine-calendar-top">

                <div>
                  <span>DAILY ROUTINE</span>
                  <strong>{formatDisplayDate(selectedDate)}</strong>
                </div>

                <div className="routine-date-tools">
                  <button
                    type="button"
                    className="today-button"
                    onClick={goToToday}
                  >
                    TODAY
                  </button>

                  <div className="date-navigation">
                    <button
                      type="button"
                      className="date-nav-arrow"
                      onClick={() => moveDateWindow(-1)}
                      aria-label="Previous week"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="date-nav-arrow"
                      onClick={() => moveDateWindow(1)}
                      aria-label="Next week"
                    >
                      →
                    </button>
                  </div>
                </div>

              </div>

              <div className="date-strip">
                {visibleDates.map((date) => {
                  const isSelected = date === selectedDate;
                  const isToday = date === getToday();
                  const subjectCount = (dailyRoutine[date] || []).length;

                  return (
                    <button
                      type="button"
                      key={date}
                      className={`date-item ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="date-day">
                        {isToday ? "TODAY" : getDayName(date)}
                      </span>
                      <strong className="date-number">
                        {getShortDate(date)}
                      </strong>
                      {subjectCount > 0 && (
                        <span className="date-class-dot">
                          {subjectCount} {subjectCount === 1 ? "class" : "classes"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            <div className="attendance-date-card">

              <div>

                <span>
                  SELECT DATE
                </span>

                <strong>
                  Daily Routine
                </strong>

              </div>


              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value
                  )
                }
              />

            </div>


            {/* TODAY SUMMARY */}

            <div className="attendance-overall-card">

              <div className="attendance-overall-left">

                <span>
                  SELECTED DAY
                </span>

                <h2>
                  {todayPercentage}%
                </h2>

                <p>
                  {presentToday} present ·{" "}
                  {absentToday} absent ·{" "}
                  {todaySubjects.length} classes
                </p>

              </div>


              <div className="attendance-big-progress">

                <div
                  className="attendance-big-progress-fill"
                  style={{
                    width:
                      `${todayPercentage}%`,
                  }}
                ></div>

              </div>


              <div className="attendance-target">

                <span>
                  ALL DAYS
                </span>

                <strong>
                  {overallAttendance}%
                </strong>

              </div>

            </div>


            {/* DAILY ROUTINE */}

            <div className="attendance-section">

              <div className="attendance-section-heading">

                <span>
                  DAILY ROUTINE
                </span>

                <h2>
                  Subjects for this day
                </h2>

              </div>


              {/* ADD BUTTON */}

              <button
                className="add-subject-button"
                onClick={() =>
                  setShowAddSubject(
                    !showAddSubject
                  )
                }
              >
                ＋ Add Subject
              </button>


              {/* ADD FORM */}

              {showAddSubject && (

                <form
                  className="add-subject-form"
                  onSubmit={addSubject}
                >

                  <div>

                    <label>
                      SUBJECT NAME
                    </label>

                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) =>
                        setNewSubjectName(
                          e.target.value
                        )
                      }
                      placeholder="Example: UHV"
                    />

                  </div>


                  <div>

                    <label>
                      CODE
                    </label>

                    <input
                      type="text"
                      value={newSubjectCode}
                      onChange={(e) =>
                        setNewSubjectCode(
                          e.target.value
                        )
                      }
                      placeholder="Example: UHV"
                    />

                  </div>


                  <button
                    type="submit"
                    className="save-subject-button"
                  >
                    Add
                  </button>


                  <button
                    type="button"
                    className="cancel-subject-button"
                    onClick={() => {
                      setShowAddSubject(
                        false
                      );

                      setNewSubjectName("");
                      setNewSubjectCode("");
                    }}
                  >
                    Cancel
                  </button>

                </form>

              )}


              {/* SUBJECT LIST */}

              {todaySubjects.length === 0 ? (

                <div className="empty-routine">

                  <div>
                    📅
                  </div>

                  <strong>
                    No subjects added
                  </strong>

                  <p>
                    Add today's subjects
                    using the button above.
                  </p>

                </div>

              ) : (

                <div className="attendance-subject-list">

                  {todaySubjects.map(
                    (subject) => (

                      <div
                        className="attendance-subject-card"
                        key={subject.id}
                      >

                        <div className="attendance-subject-icon">
                          📚
                        </div>


                        <div className="attendance-subject-info">

                          <span>
                            {subject.code}
                          </span>

                          <strong>
                            {subject.name}
                          </strong>

                        </div>


                        <div
                          className={`routine-status ${
                            subject.status
                          }`}
                        >

                          {subject.status ===
                            "present" &&
                            "✓ PRESENT"}

                          {subject.status ===
                            "absent" &&
                            "✕ ABSENT"}

                          {subject.status ===
                            "pending" &&
                            "NOT MARKED"}

                        </div>


                        <div className="routine-actions">

                          <button
                            className="routine-present"
                            onClick={() =>
                              markAttendance(
                                subject.id,
                                "present"
                              )
                            }
                          >
                            ✓
                          </button>


                          <button
                            className="routine-absent"
                            onClick={() =>
                              markAttendance(
                                subject.id,
                                "absent"
                              )
                            }
                          >
                            ✕
                          </button>


                          <button
                            className="routine-delete"
                            onClick={() =>
                              deleteSubject(
                                subject.id
                              )
                            }
                          >
                            🗑
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>


            {/* INFO */}

            <div className="attendance-info-box">

              <div className="attendance-info-icon">
                ℹ
              </div>

              <div>

                <strong>
                  Flexible Daily Routine
                </strong>

                <p>
                  Your routine can change every
                  day. Select a date, add the
                  subjects you actually have,
                  and mark each class.
                </p>

              </div>

            </div>

          </section>

        )}


        {/* =================================================
            TASKS
           ================================================= */}

        {activePage === "Tasks" && (

          <section className="tasks-page">

            <div className="tasks-header">

              <div>
                <span className="dashboard-label">
                  PERSONAL TASK MANAGER
                </span>

                <h1>
                  Tasks
                </h1>

                <p>
                  Plan your work, track progress, and stay in control.
                </p>
              </div>

              <button
                className="tasks-add-button"
                onClick={() => openTaskForm()}
              >
                ＋ Add Task
              </button>

            </div>

            <div className="tasks-summary-grid">

              <div className="task-summary-card">
                <span>TOTAL</span>
                <strong>{tasks.length}</strong>
                <small>All tasks</small>
              </div>

              <div className="task-summary-card">
                <span>PENDING</span>
                <strong>{pendingTasks.length}</strong>
                <small>Need attention</small>
              </div>

              <div className="task-summary-card">
                <span>COMPLETED</span>
                <strong>{completedTasks.length}</strong>
                <small>Finished tasks</small>
              </div>

              <div className="task-summary-card">
                <span>TODAY</span>
                <strong>{todayTaskCount}</strong>
                <small>Due today</small>
              </div>

            </div>

            {tasksError && (
              <div className="tasks-storage-note">
                <strong>Backend connection</strong>
                <span>{tasksError}</span>
              </div>
            )}

            {tasksLoading && (
              <div className="tasks-storage-note">
                <strong>Loading tasks...</strong>
                <span>Fetching your tasks from PostgreSQL.</span>
              </div>
            )}

            {showTaskForm && (
              <form className="task-form-card" onSubmit={saveTask}>

                <div className="task-form-heading">
                  <div>
                    <span>
                      {editingTaskId ? "EDIT TASK" : "NEW TASK"}
                    </span>
                    <h2>
                      {editingTaskId ? "Update your task" : "Create a task"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="task-form-close"
                    onClick={resetTaskForm}
                    aria-label="Close task form"
                  >
                    ×
                  </button>
                </div>

                <div className="task-form-grid">

                  <label>
                    <span>Task title</span>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Complete C programming assignment"
                      autoFocus
                    />
                  </label>

                  <label>
                    <span>Priority</span>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>

                  <label className="task-form-full">
                    <span>Description</span>
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Add some details..."
                      rows="4"
                    />
                  </label>

                  <label>
                    <span>Due date</span>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </label>

                </div>

                <div className="task-form-actions">
                  <button
                    type="button"
                    className="task-secondary-button"
                    onClick={resetTaskForm}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="task-primary-button">
                    {editingTaskId ? "Save Changes" : "Create Task"}
                  </button>
                </div>

              </form>
            )}

            <div className="tasks-list-card">

              <div className="tasks-list-header">

                <div>
                  <span>TASK LIST</span>
                  <h2>Your tasks</h2>
                </div>

                <div className="task-filters">
                  {[
                    ["all", "All"],
                    ["pending", "Pending"],
                    ["completed", "Completed"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={taskFilter === value ? "active" : ""}
                      onClick={() => setTaskFilter(value)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

              </div>

              {filteredTasks.length === 0 ? (

                <div className="tasks-empty-state">
                  <div>✓</div>
                  <h3>
                    {taskFilter === "completed"
                      ? "No completed tasks yet"
                      : taskFilter === "pending"
                        ? "No pending tasks"
                        : "No tasks yet"}
                  </h3>
                  <p>
                    Create your first task and start organizing your day.
                  </p>
                  <button
                    type="button"
                    className="task-primary-button"
                    onClick={() => openTaskForm()}
                  >
                    ＋ Create Task
                  </button>
                </div>

              ) : (

                <div className="tasks-list">

                  {filteredTasks.map((task) => (

                    <article
                      className={`task-item ${task.completed ? "completed" : ""}`}
                      key={task.id}
                    >

                      <button
                        type="button"
                        className="task-check-button"
                        onClick={() => toggleTask(task.id)}
                        aria-label={task.completed ? "Mark pending" : "Mark complete"}
                      >
                        {task.completed ? "✓" : ""}
                      </button>

                      <div className="task-item-main">

                        <div className="task-item-top">

                          <h3>{task.title}</h3>

                          <span className={`task-priority ${task.priority}`}>
                            {getPriorityLabel(task.priority)}
                          </span>

                        </div>

                        {task.description && (
                          <p>{task.description}</p>
                        )}

                        <div className="task-item-meta">

                          <span>
                            {task.dueDate ? "📅 " : "○ "}
                            {formatTaskDueDate(task.dueDate)}
                          </span>

                          {isTaskOverdue(task) && (
                            <span className="task-overdue">
                              OVERDUE
                            </span>
                          )}

                        </div>

                      </div>

                      <div className="task-item-actions">

                        <button
                          type="button"
                          onClick={() => openTaskForm(task)}
                          aria-label="Edit task"
                          title="Edit task"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          aria-label="Delete task"
                          title="Delete task"
                        >
                          🗑
                        </button>

                      </div>

                    </article>

                  ))}

                </div>

              )}

            </div>

            <div className="tasks-storage-note">
              <strong>PostgreSQL connected</strong>
              <span>Your tasks are stored through the EMPAIR backend and persist after refresh.</span>
            </div>

          </section>

        )}

        {/* =================================================
            OTHER MODULES
           ================================================= */}

        {activePage !== "Dashboard" &&
          activePage !== "My Journey" &&
          activePage !== "Tasks" &&
          activePage !== "Attendance" && (

            <section className="page-placeholder">

              <span className="dashboard-label">
                EMPAIR MODULE
              </span>

              <h1>
                {activePage}
              </h1>

              <p>
                This module is coming next.
              </p>


              <div className="module-status">

                <span></span>

                UNDER DEVELOPMENT

              </div>

            </section>

          )}

      </main>

    </div>
  );
}

export default Dashboard;