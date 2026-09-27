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
const ATTENDANCE_API_URL = "http://localhost:5000/api/attendance";
const ROUTINE_API_URL = "http://localhost:5000/api/routine";

const getCurrentUserId = (userId = "") => {
  const storedUserId = userId || localStorage.getItem("empair_user_id") || "";
  return storedUserId ? String(storedUserId) : "";
};

const getAuthToken = (token = "") => {
  return token || localStorage.getItem("empair_token") || "";
};

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

const parseDate = (dateValue) => {
  // PostgreSQL DATE values can arrive through node-postgres as a
  // JavaScript Date object. Read Date objects in UTC so India's timezone does not shift the calendar date backward.
  if (dateValue instanceof Date) {
    return new Date(
      dateValue.getUTCFullYear(),
      dateValue.getUTCMonth(),
      dateValue.getUTCDate()
    );
  }

  const dateString = String(dateValue).slice(0, 10);
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const normalizeDatabaseDate = (dateValue) => {
  if (!dateValue) return "";

  // A PostgreSQL DATE is a calendar date, not a point in time.
  // Never use local timezone conversion for it.
  if (typeof dateValue === "string") {
    const match = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  }

  if (dateValue instanceof Date) {
    const year = dateValue.getUTCFullYear();
    const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(dateValue).slice(0, 10);
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

function Dashboard({
  name = "Uttakaladeba",
  userId = "",
  token = "",
  onLogout,
}) {
  const [activePage, setActivePage] = useState("Dashboard");

  const [semesterOpen, setSemesterOpen] = useState(false);

  // =====================================================
  // DAILY ROUTINE / ATTENDANCE DATA
  // =====================================================

  const [dailyRoutine, setDailyRoutine] = useState({});
  const [routineLoading, setRoutineLoading] = useState(false);
  const [routineError, setRoutineError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");

  // Always start the routine calendar on the real current day.
  // Do not restore an old selected date from localStorage because that
  // can make the routine appear one day behind after a refresh.
  const [selectedDate, setSelectedDate] = useState(() => getToday());

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");

  const [editingRoutine, setEditingRoutine] = useState(null);
  const [editRoutineName, setEditRoutineName] = useState("");
  const [editRoutineDate, setEditRoutineDate] = useState("");
  const [editRoutineStartTime, setEditRoutineStartTime] = useState("");
  const [editRoutineEndTime, setEditRoutineEndTime] = useState("");

  const buildRoutineMap = (routines, attendance) => {
    const grouped = {};
    const attendanceByKey = new Map();

    (attendance || []).forEach((record) => {
      const date = normalizeDatabaseDate(record.attendance_date);
      const key = `${date}::${String(record.subject).trim().toLowerCase()}`;

      attendanceByKey.set(key, {
        id: String(record.id),
        status: record.status,
        subject: record.subject,
      });
    });

    (routines || []).forEach((record) => {
      const date = normalizeDatabaseDate(record.routine_date);
      const key = `${date}::${String(record.title).trim().toLowerCase()}`;
      const attendanceRecord = attendanceByKey.get(key);

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push({
        id: String(record.id),
        attendanceId: attendanceRecord
          ? String(attendanceRecord.id)
          : null,
        name: record.title,
        code: record.title
          .substring(0, 4)
          .toUpperCase(),
        status: attendanceRecord
          ? attendanceRecord.status
          : "pending",
        startTime: record.start_time || null,
        endTime: record.end_time || null,
      });

      if (attendanceRecord) {
        attendanceByKey.delete(key);
      }
    });

    // Keep older attendance records that may have been created
    // before Daily Routine was moved to the routine table.
    attendanceByKey.forEach((record) => {
      const attendanceDate = normalizeDatabaseDate(
        (attendance || []).find(
          (item) => String(item.id) === String(record.id)
        )?.attendance_date
      );

      if (!attendanceDate) {
        return;
      }

      if (!grouped[attendanceDate]) {
        grouped[attendanceDate] = [];
      }

      grouped[attendanceDate].push({
        id: `attendance-${record.id}`,
        attendanceId: String(record.id),
        name: record.subject,
        code: record.subject
          .substring(0, 4)
          .toUpperCase(),
        status: record.status,
        startTime: null,
        endTime: null,
      });
    });

    return grouped;
  };

  const loadRoutine = async () => {
    try {
      setRoutineLoading(true);
      setRoutineError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        setDailyRoutine({});
        setRoutineError(
          "Authentication token not found. Please login again."
        );
        return;
      }

      const [routineResponse, attendanceResponse] =
        await Promise.all([
          fetch(ROUTINE_API_URL, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }),
          fetch(ATTENDANCE_API_URL, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }),
        ]);

      const routineData = await routineResponse.json();
      const attendanceData = await attendanceResponse.json();

      if (!routineResponse.ok) {
        throw new Error(
          routineData.message || "Failed to load routine"
        );
      }

      if (!attendanceResponse.ok) {
        throw new Error(
          attendanceData.message || "Failed to load attendance"
        );
      }

      setDailyRoutine(
        buildRoutineMap(
          routineData.routines || [],
          attendanceData.attendance || []
        )
      );
    } catch (error) {
      console.error(
        "Failed to load EMPAIR routine:",
        error
      );

      setRoutineError(
        error.message ||
        "Unable to connect to EMPAIR routine backend."
      );
    } finally {
      setRoutineLoading(false);
    }
  };

  useEffect(() => {
    loadRoutine();
  }, [token, userId]);

  // Keep the selected date in memory only.
  // The routine date itself comes from PostgreSQL and is never shifted
  // through JavaScript Date/timezone conversion.

  const visibleDates = getDateRange(selectedDate, 7);

  const moveDateWindow = (direction) => {
    const current = parseDate(selectedDate);
    current.setDate(
      current.getDate() + direction * 7
    );
    setSelectedDate(formatDate(current));
  };

  const goToToday = () => {
    setSelectedDate(getToday());
  };

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

      const authToken = getAuthToken(token);

      if (!authToken) {
        setTasks([]);
        setTasksError("Authentication token not found. Please login again.");
        return;
      }

      const response = await fetch(TASKS_API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load tasks");
      }

      setTasks((data.tasks || []).map(normalizeTask));
    } catch (error) {
      console.error("Failed to load EMPAIR tasks:", error);
      setTasksError(error.message || "Unable to connect to EMPAIR backend.");
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [token, userId]);

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
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        due_date: taskDueDate || null,
      };

      const response = editingTaskId
        ? await fetch(`${TASKS_API_URL}/${editingTaskId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(payload),
          })
        : await fetch(TASKS_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(payload),
          });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save task");
      }

      if (editingTaskId) {
        setTasks((previous) => previous.map((task) =>
          String(task.id) === String(editingTaskId) ? normalizeTask(data.task) : task
        ));
      } else {
        setTasks((previous) => [normalizeTask(data.task), ...previous]);
      }

      resetTaskForm();
    } catch (error) {
      console.error("Failed to save EMPAIR task:", error);
      setTasksError(error.message || "Unable to save task. Please try again.");
    }
  };

  const toggleTask = async (taskId) => {
    const currentTask = tasks.find((task) => String(task.id) === String(taskId));
    if (!currentTask) return;

    try {
      setTasksError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          is_completed: !currentTask.completed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update task");
      }

      setTasks((previous) => previous.map((task) =>
        String(task.id) === String(taskId) ? normalizeTask(data.task) : task
      ));
    } catch (error) {
      console.error("Failed to update EMPAIR task:", error);
      setTasksError(error.message || "Unable to update task. Please try again.");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setTasksError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${TASKS_API_URL}/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete task");
      }

      setTasks((previous) => previous.filter((task) => String(task.id) !== String(taskId)));
    } catch (error) {
      console.error("Failed to delete EMPAIR task:", error);
      setTasksError(error.message || "Unable to delete task. Please try again.");
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
  // ADD SUBJECT / ROUTINE
  // =====================================================

  const addSubject = async (e) => {
    e.preventDefault();

    if (!newSubjectName.trim()) {
      return;
    }

    try {
      setRoutineError("");
      setAttendanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const routineResponse = await fetch(
        ROUTINE_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            routine_date: selectedDate,
            title: newSubjectName.trim(),
            start_time: null,
            end_time: null,
          }),
        }
      );

      const routineData = await routineResponse.json();

      if (!routineResponse.ok) {
        throw new Error(
          routineData.message || "Failed to create routine"
        );
      }

      const routineRecord = routineData.routine;

      try {
        const attendanceResponse = await fetch(
          ATTENDANCE_API_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              subject: newSubjectName.trim(),
              attendance_date: selectedDate,
              status: "pending",
            }),
          }
        );

        const attendanceData =
          await attendanceResponse.json();

        if (!attendanceResponse.ok) {
          throw new Error(
            attendanceData.message ||
            "Failed to create attendance"
          );
        }

        const attendanceRecord =
          attendanceData.attendance;

        const newSubject = {
          id: String(routineRecord.id),
          attendanceId: String(attendanceRecord.id),
          name: routineRecord.title,
          code:
            newSubjectCode.trim() ||
            routineRecord.title
              .substring(0, 4)
              .toUpperCase(),
          status: attendanceRecord.status,
          startTime: routineRecord.start_time || null,
          endTime: routineRecord.end_time || null,
        };

        setDailyRoutine((previous) => ({
          ...previous,
          [selectedDate]: [
            ...(previous[selectedDate] || []),
            newSubject,
          ],
        }));
      } catch (attendanceCreateError) {
        // Roll back the routine if attendance creation fails.
        await fetch(
          `${ROUTINE_API_URL}/${routineRecord.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        throw attendanceCreateError;
      }

      setNewSubjectName("");
      setNewSubjectCode("");
      setShowAddSubject(false);
    } catch (error) {
      console.error(
        "Failed to add routine:",
        error
      );

      setRoutineError(
        error.message || "Unable to add routine."
      );
    }
  };

  // =====================================================
  // EDIT / UPDATE ROUTINE
  // =====================================================

  const openEditRoutine = (subject) => {
    if (!subject?.id || String(subject.id).startsWith("attendance-")) {
      return;
    }

    setRoutineError("");
    setAttendanceError("");

    setEditingRoutine(subject);
    setEditRoutineName(subject.name || "");
    setEditRoutineDate(selectedDate);
    setEditRoutineStartTime(
      subject.startTime ? String(subject.startTime).slice(0, 5) : ""
    );
    setEditRoutineEndTime(
      subject.endTime ? String(subject.endTime).slice(0, 5) : ""
    );
  };

  const cancelEditRoutine = () => {
    setEditingRoutine(null);
    setEditRoutineName("");
    setEditRoutineDate("");
    setEditRoutineStartTime("");
    setEditRoutineEndTime("");
  };

  const updateRoutine = async (e) => {
    e.preventDefault();

    if (!editingRoutine) {
      return;
    }

    if (!editRoutineName.trim()) {
      setRoutineError("Routine title is required.");
      return;
    }

    if (!editRoutineDate) {
      setRoutineError("Routine date is required.");
      return;
    }

    try {
      setRoutineError("");
      setAttendanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const oldName = String(editingRoutine.name || "").trim();
      const newName = editRoutineName.trim();

      const routineResponse = await fetch(
        `${ROUTINE_API_URL}/${editingRoutine.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            routine_date: editRoutineDate,
            title: newName,
            start_time: editRoutineStartTime || null,
            end_time: editRoutineEndTime || null,
          }),
        }
      );

      const routineData = await routineResponse.json();

      if (!routineResponse.ok) {
        throw new Error(
          routineData.message || "Failed to update routine"
        );
      }

      // Keep the linked attendance record synchronized when the
      // routine subject name or date changes.
      if (editingRoutine.attendanceId) {
        const attendanceResponse = await fetch(
          `${ATTENDANCE_API_URL}/${editingRoutine.attendanceId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              subject: newName,
              attendance_date: editRoutineDate,
            }),
          }
        );

        const attendanceData = await attendanceResponse.json();

        if (!attendanceResponse.ok) {
          // Roll the routine back if its linked attendance cannot
          // be synchronized.
          await fetch(
            `${ROUTINE_API_URL}/${editingRoutine.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                routine_date: selectedDate,
                title: oldName,
                start_time: editingRoutine.startTime || null,
                end_time: editingRoutine.endTime || null,
              }),
            }
          );

          throw new Error(
            attendanceData.message ||
            "Failed to update linked attendance"
          );
        }
      }

      cancelEditRoutine();

      // Reload from PostgreSQL so the UI exactly matches backend data.
      await loadRoutine();

      // If the routine was moved to another date, show that date.
      setSelectedDate(editRoutineDate);

    } catch (error) {
      console.error(
        "Failed to update routine:",
        error
      );

      setRoutineError(
        error.message ||
        "Unable to update routine."
      );
    }
  };


  // =====================================================
  // DELETE SUBJECT / ROUTINE
  // =====================================================

  const deleteSubject = async (subject) => {
    try {
      setRoutineError("");
      setAttendanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      if (
        subject.id &&
        !String(subject.id).startsWith("attendance-")
      ) {
        const routineResponse = await fetch(
          `${ROUTINE_API_URL}/${subject.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const routineData =
          await routineResponse.json();

        if (!routineResponse.ok) {
          throw new Error(
            routineData.message ||
            "Failed to delete routine"
          );
        }
      }

      if (subject.attendanceId) {
        const attendanceResponse = await fetch(
          `${ATTENDANCE_API_URL}/${subject.attendanceId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        const attendanceData =
          await attendanceResponse.json();

        if (!attendanceResponse.ok) {
          throw new Error(
            attendanceData.message ||
            "Failed to delete attendance"
          );
        }
      }

      setDailyRoutine((previous) => ({
        ...previous,
        [selectedDate]: (
          previous[selectedDate] || []
        ).filter(
          (item) =>
            String(item.id) !== String(subject.id)
        ),
      }));
    } catch (error) {
      console.error(
        "Failed to delete routine:",
        error
      );

      setRoutineError(
        error.message ||
        "Unable to delete routine."
      );
    }
  };

  // =====================================================
  // MARK ATTENDANCE
  // =====================================================

  const markAttendance = async (
    subject,
    status
  ) => {
    try {
      setAttendanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      let attendanceId = subject.attendanceId;

      if (attendanceId) {
        const response = await fetch(
          `${ATTENDANCE_API_URL}/${attendanceId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              status,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to update attendance"
          );
        }

        attendanceId = String(data.attendance.id);
      } else {
        const response = await fetch(
          ATTENDANCE_API_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              subject: subject.name,
              attendance_date: selectedDate,
              status,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to create attendance"
          );
        }

        attendanceId = String(data.attendance.id);
      }

      setDailyRoutine((previous) => ({
        ...previous,
        [selectedDate]: (
          previous[selectedDate] || []
        ).map((item) =>
          String(item.id) === String(subject.id)
            ? {
                ...item,
                attendanceId,
                status,
              }
            : item
        ),
      }));
    } catch (error) {
      console.error(
        "Failed to update attendance:",
        error
      );

      setAttendanceError(
        error.message ||
        "Unable to update attendance."
      );
    }
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


          <button
            className="nav-item logout-button"
            onClick={onLogout}
            type="button"
          >
            <span>
              ↪
            </span>

            Logout
          </button>


          <div className="sidebar-version">
            EMPAIR v0.9
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


            {routineError && (
              <div className="tasks-storage-note">
                <strong>Routine Backend</strong>
                <span>{routineError}</span>
              </div>
            )}

            {attendanceError && (
              <div className="tasks-storage-note">
                <strong>Attendance Backend</strong>
                <span>{attendanceError}</span>
              </div>
            )}

            {routineLoading && (
              <div className="tasks-storage-note">
                <strong>Loading routine...</strong>
                <span>
                  Fetching your daily routine from PostgreSQL.
                </span>
              </div>
            )}

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


              {/* EDIT ROUTINE FORM */}

              {editingRoutine && (
                <form
                  className="add-subject-form"
                  onSubmit={updateRoutine}
                >
                  <div>
                    <label>SUBJECT NAME</label>

                    <input
                      type="text"
                      value={editRoutineName}
                      onChange={(e) =>
                        setEditRoutineName(e.target.value)
                      }
                      placeholder="Example: UHV"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label>DATE</label>

                    <input
                      type="date"
                      value={editRoutineDate}
                      onChange={(e) =>
                        setEditRoutineDate(e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label>START TIME</label>

                    <input
                      type="time"
                      value={editRoutineStartTime}
                      onChange={(e) =>
                        setEditRoutineStartTime(e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label>END TIME</label>

                    <input
                      type="time"
                      value={editRoutineEndTime}
                      onChange={(e) =>
                        setEditRoutineEndTime(e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="submit"
                    className="save-subject-button"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    className="cancel-subject-button"
                    onClick={cancelEditRoutine}
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
                                subject,
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
                                subject,
                                "absent"
                              )
                            }
                          >
                            ✕
                          </button>


                          {!String(subject.id).startsWith("attendance-") && (
                            <button
                              type="button"
                              className="routine-edit"
                              onClick={() =>
                                openEditRoutine(subject)
                              }
                              title="Edit routine"
                              aria-label="Edit routine"
                            >
                              ✎
                            </button>
                          )}

                          <button
                            type="button"
                            className="routine-delete"
                            onClick={() =>
                              deleteSubject(subject)
                            }
                            title="Delete routine"
                            aria-label="Delete routine"
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