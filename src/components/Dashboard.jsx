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
const JOURNEY_API_URL = "http://localhost:5000/api/journey";
const JOURNEY_NOTES_API_URL = "http://localhost:5000/api/journey-notes";
const FINANCE_API_URL = "http://localhost:5000/api/finance";

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

const getGoogleDriveFileId = (value = "") => {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (!url.hostname.includes("drive.google.com")) {
      return "";
    }

    const queryId = url.searchParams.get("id");
    if (queryId) return queryId;

    const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const documentMatch = url.pathname.match(/\/document\/d\/([^/]+)/i);
    if (documentMatch?.[1]) return documentMatch[1];

    const foldersMatch = url.pathname.match(/\/folders\/([^/]+)/i);
    if (foldersMatch?.[1]) return foldersMatch[1];
  } catch (error) {
    return "";
  }

  return "";
};

const getGoogleDriveDownloadUrl = (value = "") => {
  const fileId = getGoogleDriveFileId(value);
  return fileId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
    : "";
};

const isGoogleDriveLink = (value = "") => {
  try {
    const url = new URL(value);
    return (
      url.hostname === "drive.google.com" ||
      url.hostname.endsWith(".drive.google.com")
    );
  } catch (error) {
    return false;
  }
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
  // MY JOURNEY
  // =====================================================

  const [journeyProfile, setJourneyProfile] = useState(null);
  const [journeyItems, setJourneyItems] = useState([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState("");
  const [showJourneyProfileForm, setShowJourneyProfileForm] = useState(false);
  const [journeyItemFormOpen, setJourneyItemFormOpen] = useState(false);
  const [editingJourneyItemId, setEditingJourneyItemId] = useState(null);
  const [journeyAchievementFilter, setJourneyAchievementFilter] = useState("all");

  const [journeyCollege, setJourneyCollege] = useState("");
  const [journeyDegree, setJourneyDegree] = useState("");
  const [journeyBranch, setJourneyBranch] = useState("");
  const [journeyYear, setJourneyYear] = useState("1");
  const [journeySemester, setJourneySemester] = useState("1");
  const [journeyStartYear, setJourneyStartYear] = useState("");
  const [journeyGraduationYear, setJourneyGraduationYear] = useState("");

  const [journeyItemType, setJourneyItemType] = useState("project");
  const [journeyItemTitle, setJourneyItemTitle] = useState("");
  const [journeyItemDescription, setJourneyItemDescription] = useState("");
  const [journeyItemDate, setJourneyItemDate] = useState("");
  const [journeyItemLink, setJourneyItemLink] = useState("");

  // =====================================================
  // SEMESTER NOTES
  // =====================================================

  const [journeyNotes, setJourneyNotes] = useState([]);
  const [journeyNotesLoading, setJourneyNotesLoading] = useState(false);
  const [journeyNotesError, setJourneyNotesError] = useState("");
  const [showSemesterNotes, setShowSemesterNotes] = useState(false);
  const [showSemesterProgress, setShowSemesterProgress] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDate, setNoteDate] = useState(getToday());
  const [noteFile, setNoteFile] = useState(null);
  const [noteFileInputKey, setNoteFileInputKey] = useState(0);
  const [viewingNote, setViewingNote] = useState(null);
  const [noteViewerUrl, setNoteViewerUrl] = useState("");
  const [noteViewerLoading, setNoteViewerLoading] = useState(false);
  const [noteViewerError, setNoteViewerError] = useState("");

  // =====================================================
  // FINANCE
  // =====================================================

  const [financeTransactions, setFinanceTransactions] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState("");
  const [showFinanceForm, setShowFinanceForm] = useState(false);
  const [editingFinanceId, setEditingFinanceId] = useState(null);
  const [financeType, setFinanceType] = useState("expense");
  const [financeAmount, setFinanceAmount] = useState("");
  const [financeCategory, setFinanceCategory] = useState("");
  const [financeDescription, setFinanceDescription] = useState("");
  const [financeDate, setFinanceDate] = useState(getToday());
  const [financeOpeningBalance, setFinanceOpeningBalance] = useState(0);
  const [financeStatementMode, setFinanceStatementMode] = useState("full");

  const [financeBalanceLoading, setFinanceBalanceLoading] = useState(false);
  const [financeBalanceSaving, setFinanceBalanceSaving] = useState(false);
  const [financeBalanceMessage, setFinanceBalanceMessage] = useState("");

  const loadFinanceBalance = async () => {
    try {
      setFinanceBalanceLoading(true);
      setFinanceBalanceMessage("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        setFinanceOpeningBalance(0);
        return;
      }

      const response = await fetch(`${FINANCE_API_URL}/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load opening balance");
      }

      const openingBalance = Number(data.opening_balance || 0);

      setFinanceOpeningBalance(
        Number.isFinite(openingBalance) ? openingBalance : 0
      );
    } catch (error) {
      console.error("Failed to load finance opening balance:", error);
      setFinanceBalanceMessage(
        error.message || "Unable to load opening balance."
      );
    } finally {
      setFinanceBalanceLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceBalance();
  }, [token, userId]);

  const saveFinanceOpeningBalance = async () => {
    try {
      setFinanceBalanceSaving(true);
      setFinanceBalanceMessage("");
      setFinanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const openingBalance = Number(financeOpeningBalance || 0);

      if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        throw new Error("Opening balance must be 0 or greater.");
      }

      const response = await fetch(`${FINANCE_API_URL}/balance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          opening_balance: openingBalance,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save opening balance");
      }

      const savedBalance = Number(data.opening_balance || 0);

      setFinanceOpeningBalance(
        Number.isFinite(savedBalance) ? savedBalance : openingBalance
      );
      setFinanceBalanceMessage("Opening balance saved to PostgreSQL.");
    } catch (error) {
      console.error("Failed to save finance opening balance:", error);
      setFinanceBalanceMessage(
        error.message || "Unable to save opening balance."
      );
    } finally {
      setFinanceBalanceSaving(false);
    }
  };

  const loadFinance = async () => {
    try {
      setFinanceLoading(true);
      setFinanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        setFinanceTransactions([]);
        setFinanceError("Authentication token not found. Please login again.");
        return;
      }

      const response = await fetch(FINANCE_API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load finance transactions");
      }

      setFinanceTransactions(data.transactions || []);
    } catch (error) {
      console.error("Failed to load EMPAIR finance:", error);
      setFinanceError(error.message || "Unable to load finance data.");
    } finally {
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, [token, userId]);

  const resetFinanceForm = () => {
    setEditingFinanceId(null);
    setFinanceType("expense");
    setFinanceAmount("");
    setFinanceCategory("");
    setFinanceDescription("");
    setFinanceDate(getToday());
    setShowFinanceForm(false);
  };

  const openFinanceForm = (transaction = null, defaultType = "expense") => {
    if (transaction) {
      setEditingFinanceId(transaction.id);
      setFinanceType(transaction.type || "expense");
      setFinanceAmount(String(transaction.amount ?? ""));
      setFinanceCategory(transaction.category || "");
      setFinanceDescription(transaction.description || "");
      setFinanceDate(transaction.transaction_date || getToday());
    } else {
      setEditingFinanceId(null);
      setFinanceType(defaultType);
      setFinanceAmount("");
      setFinanceCategory("");
      setFinanceDescription("");
      setFinanceDate(getToday());
    }

    setActivePage("Finance");
    setShowFinanceForm(true);
  };

  const saveFinanceTransaction = async (e) => {
    e.preventDefault();

    if (!financeAmount || Number(financeAmount) <= 0 || !financeCategory.trim()) {
      setFinanceError("Enter a valid amount and category.");
      return;
    }

    try {
      setFinanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const payload = {
        type: financeType,
        amount: Number(financeAmount),
        category: financeCategory.trim(),
        description: financeDescription.trim() || null,
        transaction_date: financeDate || getToday(),
      };

      const url = editingFinanceId
        ? `${FINANCE_API_URL}/${editingFinanceId}`
        : FINANCE_API_URL;

      const response = await fetch(url, {
        method: editingFinanceId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save finance transaction");
      }

      if (editingFinanceId) {
        setFinanceTransactions((previous) =>
          previous.map((transaction) =>
            String(transaction.id) === String(editingFinanceId)
              ? data.transaction
              : transaction
          )
        );
      } else {
        setFinanceTransactions((previous) => [
          data.transaction,
          ...previous,
        ]);
      }

      resetFinanceForm();
    } catch (error) {
      console.error("Failed to save finance transaction:", error);
      setFinanceError(
        error.message || "Unable to save finance transaction."
      );
    }
  };

  const deleteFinanceTransaction = async (transactionId) => {
    try {
      setFinanceError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(
        `${FINANCE_API_URL}/${transactionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete finance transaction"
        );
      }

      setFinanceTransactions((previous) =>
        previous.filter(
          (transaction) =>
            String(transaction.id) !== String(transactionId)
        )
      );
    } catch (error) {
      console.error("Failed to delete finance transaction:", error);
      setFinanceError(
        error.message || "Unable to delete finance transaction."
      );
    }
  };

  const financeTotalIncome = financeTransactions.reduce(
    (total, transaction) =>
      transaction.type === "income"
        ? total + Number(transaction.amount || 0)
        : total,
    0
  );

  const financeTotalExpense = financeTransactions.reduce(
    (total, transaction) =>
      transaction.type === "expense"
        ? total + Number(transaction.amount || 0)
        : total,
    0
  );

  const financeBalance = financeTotalIncome - financeTotalExpense;

  const financeThisMonthExpense = financeTransactions.reduce(
    (total, transaction) => {
      if (
        transaction.type !== "expense" ||
        !transaction.transaction_date
      ) {
        return total;
      }

      const transactionDate = String(transaction.transaction_date);
      const today = getToday();

      if (transactionDate.substring(0, 7) !== today.substring(0, 7)) {
        return total;
      }

      return total + Number(transaction.amount || 0);
    },
    0
  );

  const financeSortedTransactions = [...financeTransactions].sort(
    (a, b) => {
      const dateA = String(a.transaction_date || "").substring(0, 10);
      const dateB = String(b.transaction_date || "").substring(0, 10);

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (createdA !== createdB) {
        return createdA - createdB;
      }

      return Number(a.id || 0) - Number(b.id || 0);
    }
  );

  let runningBalance = Number(financeOpeningBalance || 0);

  const financeStatementTransactions = financeSortedTransactions.map(
    (transaction) => {
      const amount = Number(transaction.amount || 0);

      if (transaction.type === "income") {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      return {
        ...transaction,
        running_balance: runningBalance,
      };
    }
  );

  const financeCurrentBalance = runningBalance;

  const financeDailyMap = financeStatementTransactions.reduce(
    (groups, transaction) => {
      const dateKey = String(
        transaction.transaction_date || getToday()
      ).substring(0, 10);

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          income: 0,
          expense: 0,
          transactions: [],
          closingBalance: Number(financeOpeningBalance || 0),
        };
      }

      const amount = Number(transaction.amount || 0);

      if (transaction.type === "income") {
        groups[dateKey].income += amount;
      } else {
        groups[dateKey].expense += amount;
      }

      groups[dateKey].closingBalance = Number(
        transaction.running_balance || 0
      );

      groups[dateKey].transactions.push(transaction);

      return groups;
    },
    {}
  );

  const financeDailyGroups = Object.values(financeDailyMap).sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  const financeTotalDays = financeDailyGroups.length;

  const financeIncomeStatement = financeStatementTransactions.filter(
    (transaction) => transaction.type === "income"
  );

  const financeTransactionStatement = financeStatementTransactions;

  const financeFullHistory = financeStatementTransactions;

  const getFinanceStatementRows = () => {
    if (financeStatementMode === "income") {
      return financeIncomeStatement;
    }

    return financeStatementMode === "transactions"
      ? financeTransactionStatement
      : financeFullHistory;
  };

  const downloadFinanceStatement = () => {
    const rows = getFinanceStatementRows();

    if (rows.length === 0) {
      setFinanceError("There are no transactions to export.");
      return;
    }

    const modeLabel =
      financeStatementMode === "income"
        ? "Income Report"
        : financeStatementMode === "transactions"
          ? "Transaction Statement"
          : "Full Finance History";

    const csvRows = [
      ["EMPAIR FINANCE STATEMENT"],
      ["Report", modeLabel],
      ["Opening Balance", Number(financeOpeningBalance || 0).toFixed(2)],
      ["Current Balance", Number(financeCurrentBalance || 0).toFixed(2)],
      [],
      [
        "Date",
        "Type",
        "Category",
        "Description",
        "Credit",
        "Debit",
        "Running Balance",
      ],
      ...rows.map((transaction) => [
        String(transaction.transaction_date || "").substring(0, 10),
        transaction.type,
        transaction.category || "",
        transaction.description || "",
        transaction.type === "income"
          ? Number(transaction.amount || 0).toFixed(2)
          : "0.00",
        transaction.type === "expense"
          ? Number(transaction.amount || 0).toFixed(2)
          : "0.00",
        Number(transaction.running_balance || 0).toFixed(2),
      ]),
    ];

    const csv = csvRows
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `empair-${financeStatementMode}-statement-${getToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printFinanceStatement = () => {
    const rows = getFinanceStatementRows();

    if (rows.length === 0) {
      setFinanceError("There are no transactions to print.");
      return;
    }

    const modeLabel =
      financeStatementMode === "income"
        ? "Income Report"
        : financeStatementMode === "transactions"
          ? "Transaction Statement"
          : "Full Finance History";

    const statementRows = rows
      .map(
        (transaction) => `
          <tr>
            <td>${String(transaction.transaction_date || "").substring(0, 10)}</td>
            <td>${transaction.type === "income" ? "Credit" : "Debit"}</td>
            <td>${transaction.category || ""}</td>
            <td>${transaction.description || ""}</td>
            <td class="credit">${
              transaction.type === "income"
                ? `+₹${formatFinanceAmount(transaction.amount)}`
                : "-"
            }</td>
            <td class="debit">${
              transaction.type === "expense"
                ? `-₹${formatFinanceAmount(transaction.amount)}`
                : "-"
            }</td>
            <td>₹${formatFinanceAmount(transaction.running_balance)}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setFinanceError("Please allow pop-ups to print the statement.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>EMPAIR - ${modeLabel}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }
            h1 { margin-bottom: 4px; }
            p { color: #6b7280; }
            .summary {
              display: flex;
              gap: 28px;
              margin: 24px 0;
              padding: 18px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
            }
            .summary strong { display: block; margin-bottom: 5px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border-bottom: 1px solid #e5e7eb;
              padding: 10px 8px;
              text-align: left;
              font-size: 13px;
            }
            th { background: #f3f4f6; }
            .credit { color: #16a34a; font-weight: 700; }
            .debit { color: #dc2626; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>EMPAIR</h1>
          <p>${modeLabel} · Generated ${formatFinanceDate(getToday())}</p>

          <div class="summary">
            <div>
              <strong>Opening Balance</strong>
              ₹${formatFinanceAmount(financeOpeningBalance)}
            </div>
            <div>
              <strong>Total Income</strong>
              <span class="credit">+₹${formatFinanceAmount(financeTotalIncome)}</span>
            </div>
            <div>
              <strong>Total Expense</strong>
              <span class="debit">-₹${formatFinanceAmount(financeTotalExpense)}</span>
            </div>
            <div>
              <strong>Current Balance</strong>
              ₹${formatFinanceAmount(financeCurrentBalance)}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${statementRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const formatFinanceAmount = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatFinanceDate = (dateString) => {
    if (!dateString) return "No date";

    return parseDate(String(dateString).substring(0, 10)).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const loadJourney = async () => {
    try {
      setJourneyLoading(true);
      setJourneyError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        setJourneyProfile(null);
        setJourneyItems([]);
        setJourneyError("Authentication token not found. Please login again.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      const [profileResponse, itemsResponse] = await Promise.all([
        fetch(`${JOURNEY_API_URL}/profile`, { headers }),
        fetch(`${JOURNEY_API_URL}/items`, { headers }),
      ]);

      const profileData = await profileResponse.json();
      const itemsData = await itemsResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profileData.message || "Failed to load journey profile");
      }

      if (!itemsResponse.ok) {
        throw new Error(itemsData.message || "Failed to load journey items");
      }

      setJourneyProfile(profileData.profile || null);
      setJourneyItems(itemsData.items || []);

      if (profileData.profile) {
        const profile = profileData.profile;
        setJourneyCollege(profile.college || "");
        setJourneyDegree(profile.degree || "");
        setJourneyBranch(profile.branch || "");
        setJourneyYear(String(profile.current_year || 1));
        setJourneySemester(String(profile.current_semester || 1));
        setJourneyStartYear(profile.start_year ? String(profile.start_year) : "");
        setJourneyGraduationYear(
          profile.graduation_year ? String(profile.graduation_year) : ""
        );
      }
    } catch (error) {
      console.error("Failed to load EMPAIR journey:", error);
      setJourneyError(error.message || "Unable to load My Journey.");
    } finally {
      setJourneyLoading(false);
    }
  };

  useEffect(() => {
    loadJourney();
  }, [token, userId]);

  const openJourneyProfileForm = () => {
    if (journeyProfile) {
      setJourneyCollege(journeyProfile.college || "");
      setJourneyDegree(journeyProfile.degree || "");
      setJourneyBranch(journeyProfile.branch || "");
      setJourneyYear(String(journeyProfile.current_year || 1));
      setJourneySemester(String(journeyProfile.current_semester || 1));
      setJourneyStartYear(
        journeyProfile.start_year ? String(journeyProfile.start_year) : ""
      );
      setJourneyGraduationYear(
        journeyProfile.graduation_year
          ? String(journeyProfile.graduation_year)
          : ""
      );
    }
    setShowJourneyProfileForm(true);
  };

  const saveJourneyProfile = async (e) => {
    e.preventDefault();

    try {
      setJourneyError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${JOURNEY_API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          college: journeyCollege.trim() || null,
          degree: journeyDegree.trim() || null,
          branch: journeyBranch.trim() || null,
          current_year: Number(journeyYear),
          current_semester: Number(journeySemester),
          start_year: journeyStartYear ? Number(journeyStartYear) : null,
          graduation_year: journeyGraduationYear
            ? Number(journeyGraduationYear)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save journey profile");
      }

      setJourneyProfile(data.profile);
      setShowJourneyProfileForm(false);
    } catch (error) {
      console.error("Failed to save journey profile:", error);
      setJourneyError(error.message || "Unable to save journey profile.");
    }
  };

  const resetJourneyItemForm = () => {
    setJourneyItemType("project");
    setJourneyItemTitle("");
    setJourneyItemDescription("");
    setJourneyItemDate("");
    setJourneyItemLink("");
    setEditingJourneyItemId(null);
    setJourneyItemFormOpen(false);
  };

  const openJourneyItemForm = (item = null) => {
    if (item) {
      setEditingJourneyItemId(item.id);
      setJourneyItemType(item.type || "project");
      setJourneyItemTitle(item.title || "");
      setJourneyItemDescription(item.description || "");
      setJourneyItemDate(item.item_date || "");
      setJourneyItemLink(item.link || "");
    } else {
      setEditingJourneyItemId(null);
      setJourneyItemType("project");
      setJourneyItemTitle("");
      setJourneyItemDescription("");
      setJourneyItemDate("");
      setJourneyItemLink("");
    }
    setJourneyItemFormOpen(true);
  };

  const saveJourneyItem = async (e) => {
    e.preventDefault();

    if (!journeyItemTitle.trim()) return;

    try {
      setJourneyError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const trimmedDriveLink = journeyItemLink.trim();

      if (trimmedDriveLink && !isGoogleDriveLink(trimmedDriveLink)) {
        throw new Error("Please use a valid Google Drive link for achievement files.");
      }

      const payload = {
        type: journeyItemType,
        title: journeyItemTitle.trim(),
        description: journeyItemDescription.trim() || null,
        item_date: journeyItemDate || null,
        link: trimmedDriveLink || null,
      };

      const url = editingJourneyItemId
        ? `${JOURNEY_API_URL}/items/${editingJourneyItemId}`
        : `${JOURNEY_API_URL}/items`;

      const response = await fetch(url, {
        method: editingJourneyItemId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save journey item");
      }

      if (editingJourneyItemId) {
        setJourneyItems((previous) =>
          previous.map((item) =>
            String(item.id) === String(editingJourneyItemId)
              ? data.item
              : item
          )
        );
      } else {
        setJourneyItems((previous) => [data.item, ...previous]);
      }

      resetJourneyItemForm();
    } catch (error) {
      console.error("Failed to save journey item:", error);
      setJourneyError(error.message || "Unable to save journey item.");
    }
  };

  const deleteJourneyItem = async (itemId) => {
    try {
      setJourneyError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${JOURNEY_API_URL}/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete journey item");
      }

      setJourneyItems((previous) =>
        previous.filter((item) => String(item.id) !== String(itemId))
      );
    } catch (error) {
      console.error("Failed to delete journey item:", error);
      setJourneyError(error.message || "Unable to delete journey item.");
    }
  };

  // =====================================================
  // CURRENT JOURNEY SEMESTER
  // =====================================================

  const currentJourneyYear = Number(
    journeyProfile?.current_year || 1
  );

  const currentJourneySemester = Number(
    journeyProfile?.current_semester || 1
  );

  const loadJourneyNotes = async () => {
    try {
      setJourneyNotesLoading(true);
      setJourneyNotesError("");

      const authToken = getAuthToken(token);

      if (!authToken) {
        setJourneyNotes([]);
        setJourneyNotesError("Authentication token not found. Please login again.");
        return;
      }

      const response = await fetch(
        `${JOURNEY_NOTES_API_URL}/${currentJourneySemester}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load semester notes");
      }

      setJourneyNotes(data.notes || []);
    } catch (error) {
      console.error("Failed to load journey notes:", error);
      setJourneyNotesError(error.message || "Unable to load semester notes.");
    } finally {
      setJourneyNotesLoading(false);
    }
  };

  useEffect(() => {
    loadJourneyNotes();
  }, [token, userId, currentJourneySemester]);

  const resetNoteForm = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteDate(getToday());
    setNoteFile(null);
    setNoteFileInputKey((previous) => previous + 1);
    setShowNoteForm(false);
  };

  const openNoteForm = (note = null) => {
    if (note) {
      setEditingNoteId(note.id);
      setNoteTitle(note.title || "");
      setNoteContent(note.content || "");
      setNoteDate(note.note_date || getToday());
      setNoteFile(null);
      setNoteFileInputKey((previous) => previous + 1);
    } else {
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteContent("");
      setNoteDate(getToday());
      setNoteFile(null);
      setNoteFileInputKey((previous) => previous + 1);
    }

    setShowSemesterNotes(true);
    setShowNoteForm(true);
  };

  const saveJourneyNote = async (e) => {
    e.preventDefault();

    if (!noteTitle.trim()) return;

    try {
      setJourneyNotesError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      if (noteFile) {
        const allowedTypes = [
          "image/png",
          "image/jpeg",
          "application/pdf",
        ];

        if (!allowedTypes.includes(noteFile.type)) {
          throw new Error("Only PNG, JPG/JPEG and PDF files are supported.");
        }

        if (noteFile.size > 500 * 1024 * 1024) {
          throw new Error("File size must be 500 MB or smaller.");
        }
      }

      const formData = new FormData();
      formData.append("semester", String(currentJourneySemester));
      formData.append("title", noteTitle.trim());
      formData.append("content", noteContent.trim());
      formData.append("note_date", noteDate || "");

      if (noteFile) {
        formData.append("file", noteFile);
      }

      const url = editingNoteId
        ? `${JOURNEY_NOTES_API_URL}/${editingNoteId}`
        : JOURNEY_NOTES_API_URL;

      const response = await fetch(url, {
        method: editingNoteId ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save semester note");
      }

      if (editingNoteId) {
        setJourneyNotes((previous) =>
          previous.map((note) =>
            String(note.id) === String(editingNoteId)
              ? data.note
              : note
          )
        );
      } else {
        setJourneyNotes((previous) => [data.note, ...previous]);
      }

      resetNoteForm();
    } catch (error) {
      console.error("Failed to save journey note:", error);
      setJourneyNotesError(error.message || "Unable to save semester note.");
    }
  };

  const viewJourneyNoteFile = async (note) => {
    try {
      setNoteViewerLoading(true);
      setNoteViewerError("");
      setViewingNote(note);

      if (noteViewerUrl) {
        URL.revokeObjectURL(noteViewerUrl);
        setNoteViewerUrl("");
      }

      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(
        `${JOURNEY_NOTES_API_URL}/${note.id}/file`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to open note file.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setNoteViewerUrl(objectUrl);
    } catch (error) {
      console.error("Failed to open journey note file:", error);
      setNoteViewerError(error.message || "Unable to open note file.");
    } finally {
      setNoteViewerLoading(false);
    }
  };

  const closeJourneyNoteViewer = () => {
    if (noteViewerUrl) {
      URL.revokeObjectURL(noteViewerUrl);
    }

    setNoteViewerUrl("");
    setViewingNote(null);
    setNoteViewerError("");
  };

  const deleteJourneyNote = async (noteId) => {
    try {
      setJourneyNotesError("");
      const authToken = getAuthToken(token);

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(`${JOURNEY_NOTES_API_URL}/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete semester note");
      }

      setJourneyNotes((previous) =>
        previous.filter((note) => String(note.id) !== String(noteId))
      );
    } catch (error) {
      console.error("Failed to delete journey note:", error);
      setJourneyNotesError(error.message || "Unable to delete semester note.");
    }
  };

  const journeyProjects = journeyItems.filter(
    (item) => item.type === "project"
  );

  const journeyCertificates = journeyItems.filter(
    (item) => item.type === "certificate"
  );

  const journeyHackathons = journeyItems.filter(
    (item) => item.type === "hackathon"
  );

  const filteredJourneyItems = journeyAchievementFilter === "all"
    ? journeyItems
    : journeyItems.filter(
        (item) => item.type === journeyAchievementFilter
      );

  const journeySemesterProgress = Math.min(
    8,
    Math.max(1, currentJourneySemester)
  );

  const journeyYearProgress = Math.min(
    4,
    Math.max(1, currentJourneyYear)
  );

  const journeyProgressPercent = Math.min(
    100,
    Math.max(0, (currentJourneySemester / 8) * 100)
  );

  const journeyCompletedSemesters = Math.max(
    0,
    currentJourneySemester - 1
  );

  const journeyRemainingSemesters = Math.max(
    0,
    8 - currentJourneySemester
  );

  const journeyYearsRemaining = journeyProfile?.graduation_year
    ? Math.max(
        0,
        Number(journeyProfile.graduation_year) - new Date().getFullYear()
      )
    : null;

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
            EMPAIR v0.5
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

                <div
                  className="stat-card journey-card"
                  onClick={() => handleNavigation("Finance")}
                >

                  <div className="stat-icon">
                    ₹
                  </div>

                  <div className="stat-content">

                    <span className="stat-label">
                      THIS MONTH
                    </span>

                    <h3>
                      ₹{formatFinanceAmount(financeThisMonthExpense)}
                    </h3>

                    <p>
                      Total expenses
                    </p>

                  </div>

                  <div className="stat-arrow">
                    →
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


                <button
                  className="quick-action"
                  onClick={() => openFinanceForm(null, "expense")}
                >

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

        {activePage === "My Journey" && !semesterOpen && (
          <section className="journey-page">

            <div className="journey-header">
              <div>
                <span className="dashboard-label">MY JOURNEY</span>
                <h1>B.Tech Journey</h1>
                <p>
                  Your complete four-year academic journey, captured in one place.
                </p>
              </div>

              <div className="journey-year-badge">
                YEAR {currentJourneyYear}
              </div>
            </div>

            <div
              style={{
                marginBottom: "24px",
                padding: "22px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      letterSpacing: "0.16em",
                      opacity: 0.65,
                      marginBottom: "6px",
                    }}
                  >
                    JOURNEY PROGRESS
                  </span>
                  <h2 style={{ margin: 0 }}>
                    {name || "Your"} · B.Tech Journey
                  </h2>
                  <p style={{ margin: "7px 0 0", opacity: 0.7 }}>
                    Semester {currentJourneySemester} of 8 · Year {currentJourneyYear} of 4
                  </p>
                </div>

                <strong style={{ fontSize: "24px" }}>
                  {Math.round(journeyProgressPercent)}%
                </strong>
              </div>

              <div
                style={{
                  height: "9px",
                  borderRadius: "999px",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    width: `${journeyProgressPercent}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #6d5dfc, #27d9c8)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <div>
                  <span style={{ display: "block", fontSize: "11px", opacity: 0.55 }}>
                    COMPLETED
                  </span>
                  <strong>{journeyCompletedSemesters} semesters</strong>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "11px", opacity: 0.55 }}>
                    REMAINING
                  </span>
                  <strong>{journeyRemainingSemesters} semesters</strong>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "11px", opacity: 0.55 }}>
                    GRADUATION
                  </span>
                  <strong>
                    {journeyProfile?.graduation_year || "Not set"}
                  </strong>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "11px", opacity: 0.55 }}>
                    TIME LEFT
                  </span>
                  <strong>
                    {journeyYearsRemaining === null
                      ? "Not set"
                      : journeyYearsRemaining === 1
                        ? "1 year"
                        : `${journeyYearsRemaining} years`}
                  </strong>
                </div>
              </div>
            </div>

            {journeyError && (
              <div className="tasks-storage-note">
                <strong>My Journey</strong>
                <span>{journeyError}</span>
              </div>
            )}

            {journeyLoading && (
              <div className="tasks-storage-note">
                <strong>Loading journey...</strong>
                <span>Fetching your journey data from PostgreSQL.</span>
              </div>
            )}

            <div className="journey-current-card journey-clickable" onClick={openSemester}>
              <div className="journey-current-icon">🎓</div>

              <div className="journey-current-content">
                <span>CURRENTLY IN</span>
                <h2>Semester {currentJourneySemester}</h2>
                <p>
                  {journeyProfile?.degree || "B.Tech"}{" "}
                  {journeyProfile?.branch || "Computer Science & Engineering"}
                </p>
              </div>

              <div className="journey-current-status">ACTIVE</div>
            </div>

            <div className="journey-section-title">
              <span>YOUR TIMELINE</span>
              <h2>Four Years. One Journey.</h2>
            </div>

            <div className="years-grid">
              {[1, 2, 3, 4].map((year) => {
                const isCurrent = year === currentJourneyYear;
                const isCompleted = year < currentJourneyYear;

                return (
                  <div
                    className={`year-card ${isCurrent ? "active-year" : ""}`}
                    key={year}
                  >
                    <div className="year-card-top">
                      <div className="year-number">
                        {String(year).padStart(2, "0")}
                      </div>
                      <div className={`year-status ${!isCurrent ? "locked" : ""}`}>
                        {isCurrent ? "CURRENT" : isCompleted ? "COMPLETED" : "UPCOMING"}
                      </div>
                    </div>

                    <h3>Year {year}</h3>
                    <p>
                      {year === 1
                        ? "Foundation"
                        : year === 2
                          ? "Exploration"
                          : year === 3
                            ? "Growth"
                            : "Launch"}
                    </p>

                    {isCurrent ? (
                      <div className="semester-list">
                        {[1, 2].map((semester) => {
                          const semesterNumber = (year - 1) * 2 + semester;
                          const isActiveSemester = semesterNumber === currentJourneySemester;

                          return (
                            <div
                              className={`semester-item ${
                                isActiveSemester
                                  ? "active-semester semester-clickable"
                                  : ""
                              }`}
                              key={semesterNumber}
                              onClick={
                                isActiveSemester ? openSemester : undefined
                              }
                            >
                              <span>SEM {String(semesterNumber).padStart(2, "0")}</span>
                              <strong>
                                {isActiveSemester
                                  ? "Current Semester"
                                  : semesterNumber < currentJourneySemester
                                    ? "Completed"
                                    : "Upcoming"}
                              </strong>
                              {isActiveSemester && <b>→</b>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="locked-message">
                        <span>{isCompleted ? "✓" : "🔒"}</span>
                        <span>
                          {isCompleted
                            ? "Year completed"
                            : "Journey not started yet"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="journey-stats">
              <div className="journey-stat">
                <span>SEMESTERS</span>
                <strong>{journeySemesterProgress} / 8</strong>
              </div>
              <div className="journey-stat">
                <span>PROJECTS</span>
                <strong>{journeyProjects.length}</strong>
              </div>
              <div className="journey-stat">
                <span>CERTIFICATES</span>
                <strong>{journeyCertificates.length}</strong>
              </div>
              <div className="journey-stat">
                <span>HACKATHONS</span>
                <strong>{journeyHackathons.length}</strong>
              </div>
            </div>

            <div className="semester-section">
              <div className="semester-section-heading">
                <div>
                  <span>JOURNEY PROFILE</span>
                  <h2>Your Academic Information</h2>
                </div>

                <button
                  type="button"
                  className="tasks-add-button"
                  onClick={openJourneyProfileForm}
                >
                  ✎ Edit Profile
                </button>
              </div>

              <div className="semester-record-grid">
                <div className="semester-record-card">
                  <div>🏫</div>
                  <strong>College</strong>
                  <span>{journeyProfile?.college || "Not added yet"}</span>
                </div>

                <div className="semester-record-card">
                  <div>🎓</div>
                  <strong>Degree</strong>
                  <span>{journeyProfile?.degree || "Not added yet"}</span>
                </div>

                <div className="semester-record-card">
                  <div>💻</div>
                  <strong>Branch</strong>
                  <span>{journeyProfile?.branch || "Not added yet"}</span>
                </div>

                <div className="semester-record-card">
                  <div>📅</div>
                  <strong>Graduation</strong>
                  <span>
                    {journeyProfile?.graduation_year || "Not added yet"}
                  </span>
                </div>
              </div>
            </div>

            {showJourneyProfileForm && (
              <form className="task-form-card" onSubmit={saveJourneyProfile}>
                <div className="task-form-heading">
                  <div>
                    <span>JOURNEY PROFILE</span>
                    <h2>Update your academic information</h2>
                  </div>
                  <button
                    type="button"
                    className="task-form-close"
                    onClick={() => setShowJourneyProfileForm(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="task-form-grid">
                  <label>
                    <span>College</span>
                    <input
                      value={journeyCollege}
                      onChange={(e) => setJourneyCollege(e.target.value)}
                      placeholder="NIT Bhubaneswar"
                    />
                  </label>

                  <label>
                    <span>Degree</span>
                    <input
                      value={journeyDegree}
                      onChange={(e) => setJourneyDegree(e.target.value)}
                      placeholder="B.Tech"
                    />
                  </label>

                  <label>
                    <span>Branch</span>
                    <input
                      value={journeyBranch}
                      onChange={(e) => setJourneyBranch(e.target.value)}
                      placeholder="Computer Science & Engineering"
                    />
                  </label>

                  <label>
                    <span>Current Year</span>
                    <select
                      value={journeyYear}
                      onChange={(e) => setJourneyYear(e.target.value)}
                    >
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                    </select>
                  </label>

                  <label>
                    <span>Current Semester</span>
                    <select
                      value={journeySemester}
                      onChange={(e) => setJourneySemester(e.target.value)}
                    >
                      {Array.from({ length: 8 }, (_, index) => (
                        <option key={index + 1} value={index + 1}>
                          Semester {index + 1}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Start Year</span>
                    <input
                      type="number"
                      value={journeyStartYear}
                      onChange={(e) => setJourneyStartYear(e.target.value)}
                      placeholder="2026"
                    />
                  </label>

                  <label>
                    <span>Graduation Year</span>
                    <input
                      type="number"
                      value={journeyGraduationYear}
                      onChange={(e) => setJourneyGraduationYear(e.target.value)}
                      placeholder="2030"
                    />
                  </label>
                </div>

                <div className="task-form-actions">
                  <button
                    type="button"
                    className="task-secondary-button"
                    onClick={() => setShowJourneyProfileForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="task-primary-button">
                    Save Profile
                  </button>
                </div>
              </form>
            )}

            <div className="semester-section">
              <div className="semester-section-heading">
                <div>
                  <span>ACHIEVEMENTS</span>
                  <h2>Projects, Certificates & Hackathons</h2>
                </div>

                <button
                  type="button"
                  className="tasks-add-button"
                  onClick={() => openJourneyItemForm()}
                >
                  ＋ Add Achievement
                </button>
              </div>

              <div className="tasks-storage-note">
                <strong>Google Drive Storage</strong>
                <span>
                  Store large project ZIPs, PDFs and images in Google Drive and
                  keep the sharing link here. EMPAIR does not upload these large
                  files to its own server.
                </span>
              </div>

              {journeyItems.length > 0 && (
                <div className="journey-achievement-filters">
                  {[
                    ["all", `All (${journeyItems.length})`],
                    ["project", `Projects (${journeyProjects.length})`],
                    ["certificate", `Certificates (${journeyCertificates.length})`],
                    ["hackathon", `Hackathons (${journeyHackathons.length})`],
                  ].map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      className={`journey-filter-button ${
                        journeyAchievementFilter === filter ? "active" : ""
                      }`}
                      onClick={() => setJourneyAchievementFilter(filter)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {journeyItems.length === 0 ? (
                <div className="tasks-empty-state">
                  <div>🚀</div>
                  <h3>No achievements added yet</h3>
                  <p>
                    Add your projects, certificates and hackathons to build your journey.
                  </p>
                  <button
                    type="button"
                    className="task-primary-button"
                    onClick={() => openJourneyItemForm()}
                  >
                    ＋ Add Achievement
                  </button>
                </div>
              ) : filteredJourneyItems.length === 0 ? (
                <div className="tasks-empty-state">
                  <div>🔎</div>
                  <h3>No {journeyAchievementFilter} achievements</h3>
                  <p>
                    There are no achievements in this category yet. Add one to keep your journey updated.
                  </p>
                  <button
                    type="button"
                    className="task-primary-button"
                    onClick={() => {
                      openJourneyItemForm();
                      setJourneyItemType(
                        journeyAchievementFilter === "all"
                          ? "project"
                          : journeyAchievementFilter
                      );
                    }}
                  >
                    ＋ Add Achievement
                  </button>
                </div>
              ) : (
                <div className="tasks-list">
                  {filteredJourneyItems.map((item) => (
                    <article className="task-item" key={item.id}>
                      <div className="task-check-button">
                        {item.type === "project"
                          ? "🚀"
                          : item.type === "certificate"
                            ? "📜"
                            : "🏆"}
                      </div>

                      <div className="task-item-main">
                        <div className="task-item-top">
                          <h3>{item.title}</h3>
                          <span className="task-priority medium">
                            {item.type.toUpperCase()}
                          </span>
                        </div>

                        {item.description && <p>{item.description}</p>}

                        <div className="task-item-meta">
                          {item.item_date && <span>📅 {item.item_date}</span>}
                          {item.link && (
                            <span>📁 Google Drive file attached</span>
                          )}
                        </div>

                        {item.link && (
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              flexWrap: "wrap",
                              marginTop: "12px",
                            }}
                          >
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="task-primary-button"
                              style={{
                                width: "fit-content",
                                textDecoration: "none",
                              }}
                            >
                              📁 Open Google Drive
                            </a>

                            {getGoogleDriveDownloadUrl(item.link) && (
                              <a
                                href={getGoogleDriveDownloadUrl(item.link)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="task-secondary-button"
                                style={{
                                  width: "fit-content",
                                  textDecoration: "none",
                                }}
                              >
                                ⬇ Download
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="task-item-actions">
                        <button
                          type="button"
                          onClick={() => openJourneyItemForm(item)}
                          title="Edit achievement"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteJourneyItem(item.id)}
                          title="Delete achievement"
                        >
                          🗑
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {journeyItemFormOpen && (
              <form className="task-form-card" onSubmit={saveJourneyItem}>
                <div className="task-form-heading">
                  <div>
                    <span>
                      {editingJourneyItemId ? "EDIT ACHIEVEMENT" : "NEW ACHIEVEMENT"}
                    </span>
                    <h2>
                      {editingJourneyItemId
                        ? "Update your achievement"
                        : "Add to your journey"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="task-form-close"
                    onClick={resetJourneyItemForm}
                  >
                    ×
                  </button>
                </div>

                <div className="task-form-grid">
                  <label>
                    <span>Type</span>
                    <select
                      value={journeyItemType}
                      onChange={(e) => setJourneyItemType(e.target.value)}
                    >
                      <option value="project">Project</option>
                      <option value="certificate">Certificate</option>
                      <option value="hackathon">Hackathon</option>
                    </select>
                  </label>

                  <label>
                    <span>Title</span>
                    <input
                      value={journeyItemTitle}
                      onChange={(e) => setJourneyItemTitle(e.target.value)}
                      placeholder="e.g. EMPAIR Personal Life OS"
                      autoFocus
                    />
                  </label>

                  <label className="task-form-full">
                    <span>Description</span>
                    <textarea
                      value={journeyItemDescription}
                      onChange={(e) => setJourneyItemDescription(e.target.value)}
                      placeholder="Describe this achievement..."
                      rows="4"
                    />
                  </label>

                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      value={journeyItemDate}
                      onChange={(e) => setJourneyItemDate(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Google Drive Project File</span>
                    <input
                      type="url"
                      value={journeyItemLink}
                      onChange={(e) => setJourneyItemLink(e.target.value)}
                      placeholder="Paste Google Drive sharing link"
                    />
                    <small
                      style={{
                        display: "block",
                        marginTop: "8px",
                        opacity: 0.7,
                        lineHeight: 1.5,
                      }}
                    >
                      Upload the project/certificate file to Google Drive, set
                      access as needed, then paste its sharing link here. EMPAIR
                      stores only the link, not the large file itself.
                    </small>
                  </label>
                </div>

                <div className="task-form-actions">
                  <button
                    type="button"
                    className="task-secondary-button"
                    onClick={resetJourneyItemForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="task-primary-button">
                    {editingJourneyItemId ? "Save Changes" : "Add Achievement"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* =================================================
            SEMESTER 1
           ================================================= */}

        {activePage === "My Journey" && semesterOpen && (
          <section className="semester-page">
            <button
              className="semester-back-button"
              onClick={() => setSemesterOpen(false)}
            >
              ← Back to My Journey
            </button>

            <div className="semester-header">
              <div>
                <span className="dashboard-label">
                  YEAR {currentJourneyYear} · SEMESTER {currentJourneySemester}
                </span>
                <h1>Semester {currentJourneySemester}</h1>
                <p>Your current academic semester.</p>
              </div>
              <div className="semester-active-badge">ACTIVE</div>
            </div>

            <div className="semester-summary">
              <div className="semester-summary-card">
                <span>DAILY SUBJECTS</span>
                <strong>{todaySubjects.length}</strong>
              </div>
              <div className="semester-summary-card">
                <span>TODAY PRESENT</span>
                <strong>{presentToday}</strong>
              </div>
              <div className="semester-summary-card">
                <span>OVERALL</span>
                <strong>{overallAttendance}%</strong>
              </div>
              <div className="semester-summary-card">
                <span>STATUS</span>
                <strong>ON TRACK</strong>
              </div>
            </div>

            <div className="semester-section">
              <div className="semester-section-heading">
                <div>
                  <span>ACADEMICS</span>
                  <h2>Semester Information</h2>
                </div>
              </div>

              <div className="semester-record-grid">
                <button
                  type="button"
                  className="semester-record-card"
                  onClick={() => handleNavigation("Attendance")}
                >
                  <div>📅</div>
                  <strong>Daily Routine</strong>
                  <span>Open your daily routine and manage subjects.</span>
                </button>

                <button
                  type="button"
                  className="semester-record-card"
                  onClick={() => handleNavigation("Attendance")}
                >
                  <div>📚</div>
                  <strong>Attendance</strong>
                  <span>Mark classes and view your attendance record.</span>
                </button>

                <button
                  type="button"
                  className="semester-record-card"
                  onClick={() => setShowSemesterProgress((previous) => !previous)}
                >
                  <div>📊</div>
                  <strong>Progress</strong>
                  <span>View your current semester academic progress.</span>
                </button>

                <button
                  type="button"
                  className="semester-record-card"
                  onClick={() => {
                    setShowSemesterNotes((previous) => !previous);
                    setShowSemesterProgress(false);
                  }}
                >
                  <div>📝</div>
                  <strong>Notes</strong>
                  <span>{journeyNotes.length} saved semester {journeyNotes.length === 1 ? "note" : "notes"}.</span>
                </button>
              </div>

              {showSemesterProgress && (
                <div className="semester-section">
                  <div className="semester-section-heading">
                    <div>
                      <span>SEMESTER PROGRESS</span>
                      <h2>Current Academic Progress</h2>
                    </div>
                    <button
                      type="button"
                      className="task-secondary-button"
                      onClick={() => setShowSemesterProgress(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="semester-summary">
                    <div className="semester-summary-card">
                      <span>ATTENDANCE</span>
                      <strong>{overallAttendance}%</strong>
                    </div>
                    <div className="semester-summary-card">
                      <span>CLASSES MARKED</span>
                      <strong>{totalMarked}</strong>
                    </div>
                    <div className="semester-summary-card">
                      <span>PRESENT</span>
                      <strong>{totalPresent}</strong>
                    </div>
                    <div className="semester-summary-card">
                      <span>ABSENT</span>
                      <strong>{totalMarked - totalPresent}</strong>
                    </div>
                  </div>

                  <div className="attendance-overall-card">
                    <div className="attendance-overall-left">
                      <span>SEMESTER ATTENDANCE PROGRESS</span>
                      <h2>{overallAttendance}%</h2>
                      <p>{totalPresent} present · {totalMarked - totalPresent} absent · {todaySubjects.length} classes today</p>
                    </div>
                    <div className="attendance-big-progress">
                      <div
                        className="attendance-big-progress-fill"
                        style={{ width: `${overallAttendance}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {showSemesterNotes && (
                <div className="semester-section">
                  <div className="semester-section-heading">
                    <div>
                      <span>SEMESTER NOTES</span>
                      <h2>Your Semester {currentJourneySemester} Notes</h2>
                    </div>
                    <button
                      type="button"
                      className="tasks-add-button"
                      onClick={() => openNoteForm()}
                    >
                      ＋ Add Note
                    </button>
                  </div>

                  {journeyNotesError && (
                    <div className="tasks-storage-note">
                      <strong>Notes</strong>
                      <span>{journeyNotesError}</span>
                    </div>
                  )}

                  {journeyNotesLoading ? (
                    <div className="tasks-storage-note">
                      <strong>Loading notes...</strong>
                      <span>Fetching your semester notes from PostgreSQL.</span>
                    </div>
                  ) : journeyNotes.length === 0 ? (
                    <div className="tasks-empty-state">
                      <div>📝</div>
                      <h3>No semester notes yet</h3>
                      <p>Save important academic information, ideas, reminders, and semester notes here.</p>
                      <button
                        type="button"
                        className="task-primary-button"
                        onClick={() => openNoteForm()}
                      >
                        ＋ Create Note
                      </button>
                    </div>
                  ) : (
                    <div className="tasks-list">
                      {journeyNotes.map((note) => (
                        <article className="task-item" key={note.id}>
                          <div className="task-item-main">
                            <div className="task-item-top">
                              <h3>{note.title}</h3>
                              <span className="task-priority medium">SEM {note.semester}</span>
                            </div>
                            {note.content && <p>{note.content}</p>}
                            <div className="task-item-meta">
                              <span>📅 {formatTaskDueDate(note.note_date)}</span>
                              {note.file_name && (
                                <span>📎 {note.file_name}</span>
                              )}
                            </div>
                            {note.file_name && (
                              <button
                                type="button"
                                className="task-primary-button"
                                style={{ marginTop: "12px", width: "fit-content" }}
                                onClick={() => viewJourneyNoteFile(note)}
                              >
                                {note.mime_type === "application/pdf" ? "📄 Open PDF" : "🖼 Open Image"}
                              </button>
                            )}
                          </div>
                          <div className="task-item-actions">
                            <button
                              type="button"
                              onClick={() => openNoteForm(note)}
                              aria-label="Edit note"
                              title="Edit note"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteJourneyNote(note.id)}
                              aria-label="Delete note"
                              title="Delete note"
                            >
                              🗑
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {showNoteForm && (
                    <form className="task-form-card" onSubmit={saveJourneyNote}>
                      <div className="task-form-heading">
                        <div>
                          <span>{editingNoteId ? "EDIT NOTE" : "NEW NOTE"}</span>
                          <h2>{editingNoteId ? "Update semester note" : "Create a semester note"}</h2>
                        </div>
                        <button
                          type="button"
                          className="task-form-close"
                          onClick={resetNoteForm}
                          aria-label="Close note form"
                        >
                          ×
                        </button>
                      </div>

                      <div className="task-form-grid">
                        <label>
                          <span>Note title</span>
                          <input
                            type="text"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder="e.g. Chemistry important topics"
                            autoFocus
                          />
                        </label>

                        <label>
                          <span>Date</span>
                          <input
                            type="date"
                            value={noteDate}
                            onChange={(e) => setNoteDate(e.target.value)}
                          />
                        </label>

                        <label className="task-form-full">
                          <span>Text Note (optional)</span>
                          <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Add a short description, reminder, or explanation..."
                            rows="5"
                          />
                        </label>

                        <label className="task-form-full">
                          <span>Upload Real Note</span>
                          <input
                            key={noteFileInputKey}
                            type="file"
                            accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                            onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                          />
                          <small style={{ marginTop: "8px", display: "block", opacity: 0.7 }}>
                            PNG, JPG/JPEG or PDF · Maximum 500 MB
                            {editingNoteId && " · Select a new file only if you want to replace the existing file"}
                          </small>
                          {noteFile && (
                            <small style={{ marginTop: "6px", display: "block" }}>
                              Selected: {noteFile.name}
                            </small>
                          )}
                          {editingNoteId && !noteFile && journeyNotes.find((note) => String(note.id) === String(editingNoteId))?.file_name && (
                            <small style={{ marginTop: "6px", display: "block" }}>
                              Existing file will be kept.
                            </small>
                          )}
                        </label>
                      </div>

                      <div className="task-form-actions">
                        <button
                          type="button"
                          className="task-secondary-button"
                          onClick={resetNoteForm}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="task-primary-button">
                          {editingNoteId ? "Save Changes" : "Save Note"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {viewingNote && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.82)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: "min(1100px, 96vw)",
                height: "min(850px, 92vh)",
                background: "#0b0c12",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "18px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div>
                  <strong>{viewingNote.title}</strong>
                  <div style={{ fontSize: "12px", opacity: 0.65, marginTop: "4px" }}>
                    {viewingNote.file_name}
                  </div>
                </div>

                <button
                  type="button"
                  className="task-form-close"
                  onClick={closeJourneyNoteViewer}
                  aria-label="Close note viewer"
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px",
                }}
              >
                {noteViewerLoading && <strong>Opening note...</strong>}

                {!noteViewerLoading && noteViewerError && (
                  <div className="tasks-storage-note">
                    <strong>Unable to open file</strong>
                    <span>{noteViewerError}</span>
                  </div>
                )}

                {!noteViewerLoading && !noteViewerError && noteViewerUrl && viewingNote.mime_type === "application/pdf" && (
                  <iframe
                    title={viewingNote.file_name}
                    src={noteViewerUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "10px",
                      background: "#fff",
                    }}
                  />
                )}

                {!noteViewerLoading && !noteViewerError && noteViewerUrl && viewingNote.mime_type !== "application/pdf" && (
                  <img
                    src={noteViewerUrl}
                    alt={viewingNote.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: "10px",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
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
            FINANCE
           ================================================= */}

        {activePage === "Finance" && (
          <section className="tasks-page">

            <div className="tasks-header">

              <div>
                <span className="dashboard-label">
                  PERSONAL FINANCE
                </span>

                <h1>
                  Finance
                </h1>

                <p>
                  Track your income, expenses, and personal balance in one place.
                </p>
              </div>

              <button
                className="tasks-add-button"
                onClick={() => openFinanceForm(null, "expense")}
                type="button"
              >
                ＋ Add Transaction
              </button>

            </div>

            <div className="tasks-summary-grid">

              <div className="task-summary-card">
                <span>BALANCE</span>
                <strong
                  style={{
                    color:
                      financeCurrentBalance >= 0
                        ? "#22c55e"
                        : "#ef4444"
                  }}
                >
                  ₹{formatFinanceAmount(financeCurrentBalance)}
                </strong>
                <small>Current tracked balance</small>
              </div>

              <div className="task-summary-card">
                <span>INCOME</span>
                <strong>
                  ₹{formatFinanceAmount(financeTotalIncome)}
                </strong>
                <small>Total income</small>
              </div>

              <div className="task-summary-card">
                <span>EXPENSE</span>
                <strong>
                  ₹{formatFinanceAmount(financeTotalExpense)}
                </strong>
                <small>Total expenses</small>
              </div>

              <div className="task-summary-card">
                <span>THIS MONTH</span>
                <strong>
                  ₹{formatFinanceAmount(financeThisMonthExpense)}
                </strong>
                <small>Current month expenses</small>
              </div>

            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "20px"
              }}
            >

              <div className="tasks-storage-note">
                <strong style={{ color: "#22c55e" }}>
                  Total Money In
                </strong>
                <span>
                  ₹{formatFinanceAmount(financeTotalIncome)}
                </span>
              </div>

              <div className="tasks-storage-note">
                <strong style={{ color: "#ef4444" }}>
                  Total Money Out
                </strong>
                <span>
                  ₹{formatFinanceAmount(financeTotalExpense)}
                </span>
              </div>

              <div className="tasks-storage-note">
                <strong
                  style={{
                    color:
                      financeCurrentBalance >= 0
                        ? "#22c55e"
                        : "#ef4444"
                  }}
                >
                  Current Balance
                </strong>
                <span>
                  ₹{formatFinanceAmount(financeCurrentBalance)}
                </span>
              </div>

              <div className="tasks-storage-note">
                <strong>
                  Days Tracked
                </strong>
                <span>
                  {financeTotalDays} day{financeTotalDays === 1 ? "" : "s"}
                </span>
              </div>

            </div>

            {financeError && (
              <div className="tasks-storage-note">
                <strong>Finance</strong>
                <span>{financeError}</span>
              </div>
            )}

            {financeLoading && (
              <div className="tasks-storage-note">
                <strong>Loading finance...</strong>
                <span>Fetching your transactions from PostgreSQL.</span>
              </div>
            )}

            {showFinanceForm && (
              <form
                className="task-form-card"
                onSubmit={saveFinanceTransaction}
              >

                <div className="task-form-heading">

                  <div>
                    <span>
                      {editingFinanceId
                        ? "EDIT TRANSACTION"
                        : "NEW TRANSACTION"}
                    </span>

                    <h2>
                      {editingFinanceId
                        ? "Update transaction"
                        : "Record your money"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="task-form-close"
                    onClick={resetFinanceForm}
                    aria-label="Close finance form"
                  >
                    ×
                  </button>

                </div>

                <div className="task-form-grid">

                  <label>
                    <span>Type</span>

                    <select
                      value={financeType}
                      onChange={(e) => setFinanceType(e.target.value)}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </label>

                  <label>
                    <span>Amount</span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={financeAmount}
                      onChange={(e) => setFinanceAmount(e.target.value)}
                      placeholder="e.g. 250"
                      autoFocus
                    />
                  </label>

                  <label>
                    <span>Category</span>

                    <input
                      type="text"
                      value={financeCategory}
                      onChange={(e) => setFinanceCategory(e.target.value)}
                      placeholder="e.g. Food, Petrol, Salary"
                    />
                  </label>

                  <label>
                    <span>Date</span>

                    <input
                      type="date"
                      value={financeDate}
                      onChange={(e) => setFinanceDate(e.target.value)}
                    />
                  </label>

                  <label className="task-form-full">
                    <span>Description / Note</span>

                    <textarea
                      value={financeDescription}
                      onChange={(e) => setFinanceDescription(e.target.value)}
                      placeholder="Optional note about this transaction..."
                      rows="4"
                    />
                  </label>

                </div>

                <div className="task-form-actions">

                  <button
                    type="button"
                    className="task-secondary-button"
                    onClick={resetFinanceForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="task-primary-button"
                  >
                    {editingFinanceId
                      ? "Save Changes"
                      : "Save Transaction"}
                  </button>

                </div>

              </form>
            )}

            <div
              className="tasks-list-card"
              style={{ marginBottom: "20px" }}
            >

              <div className="tasks-list-header">

                <div>
                  <span>ACCOUNT SETTINGS</span>
                  <h2>Balance & statements</h2>
                </div>

              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "14px"
                }}
              >

                <label>
                  <span>Opening Balance</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={financeOpeningBalance}
                    onChange={(e) =>
                      setFinanceOpeningBalance(
                        Number(e.target.value || 0)
                      )
                    }
                    placeholder="Balance before tracking started"
                    disabled={financeBalanceLoading || financeBalanceSaving}
                  />

                  <button
                    type="button"
                    className="task-primary-button"
                    onClick={saveFinanceOpeningBalance}
                    disabled={financeBalanceLoading || financeBalanceSaving}
                    style={{ marginTop: "10px", width: "fit-content" }}
                  >
                    {financeBalanceSaving
                      ? "Saving..."
                      : "Save Opening Balance"}
                  </button>

                  {financeBalanceMessage && (
                    <small
                      style={{
                        display: "block",
                        marginTop: "8px",
                        color: financeBalanceMessage.includes("saved")
                          ? "#22c55e"
                          : "#ef4444",
                      }}
                    >
                      {financeBalanceMessage}
                    </small>
                  )}
                </label>

                <div className="tasks-storage-note">
                  <strong>Current Balance</strong>
                  <span
                    style={{
                      color:
                        financeCurrentBalance >= 0
                          ? "#22c55e"
                          : "#ef4444",
                      fontWeight: 900
                    }}
                  >
                    ₹{formatFinanceAmount(financeCurrentBalance)}
                  </span>
                </div>

              </div>

              <p
                style={{
                  marginTop: "12px",
                  opacity: 0.65,
                  fontSize: "13px"
                }}
              >
                Opening Balance is the bank/cash amount you already had before
                starting EMPAIR finance tracking. Current Balance is calculated
                as Opening Balance + Income - Expense.
              </p>

            </div>

            <div
              className="tasks-list-card"
              style={{ marginBottom: "20px" }}
            >

              <div className="tasks-list-header">

                <div>
                  <span>STATEMENT CENTER</span>
                  <h2>Generate your statement</h2>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap"
                  }}
                >

                  <button
                    type="button"
                    className="task-secondary-button"
                    onClick={downloadFinanceStatement}
                  >
                    ↓ CSV
                  </button>

                  <button
                    type="button"
                    className="task-primary-button"
                    onClick={printFinanceStatement}
                  >
                    Print / PDF
                  </button>

                </div>

              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px"
                }}
              >

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => setFinanceStatementMode("income")}
                  style={{
                    border:
                      financeStatementMode === "income"
                        ? "1px solid #22c55e"
                        : undefined
                  }}
                >
                  <span>↑</span>
                  <strong>Income Only</strong>
                  <small>Only money received, date-wise</small>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => setFinanceStatementMode("transactions")}
                  style={{
                    border:
                      financeStatementMode === "transactions"
                        ? "1px solid #8b5cf6"
                        : undefined
                  }}
                >
                  <span>▤</span>
                  <strong>Transaction Statement</strong>
                  <small>Bank-style credit, debit & balance</small>
                </button>

                <button
                  type="button"
                  className="quick-action"
                  onClick={() => setFinanceStatementMode("full")}
                  style={{
                    border:
                      financeStatementMode === "full"
                        ? "1px solid #8b5cf6"
                        : undefined
                  }}
                >
                  <span>▦</span>
                  <strong>Full History</strong>
                  <small>Complete finance history</small>
                </button>

              </div>

              <div
                className="tasks-storage-note"
                style={{ marginTop: "14px" }}
              >
                <strong>
                  {financeStatementMode === "income"
                    ? "Income Report"
                    : financeStatementMode === "transactions"
                      ? "Transaction Statement"
                      : "Full Finance History"}
                </strong>

                <span>
                  {financeStatementMode === "income"
                    ? `${financeIncomeStatement.length} income transaction${financeIncomeStatement.length === 1 ? "" : "s"} selected.`
                    : financeStatementMode === "transactions"
                      ? `${financeTransactionStatement.length} transaction${financeTransactionStatement.length === 1 ? "" : "s"} selected with running balance.`
                      : `${financeFullHistory.length} transaction${financeFullHistory.length === 1 ? "" : "s"} selected.`}
                </span>
              </div>

            </div>

            <div className="tasks-list-card">

              <div className="tasks-list-header">

                <div>
                  <span>TRANSACTION HISTORY</span>
                  <h2>Your transactions</h2>
                </div>

                <button
                  type="button"
                  className="tasks-add-button"
                  onClick={() => openFinanceForm(null, "income")}
                >
                  ＋ Add Income
                </button>

              </div>

              {financeTransactions.length === 0 ? (

                <div className="tasks-empty-state">

                  <div>₹</div>

                  <h3>
                    No transactions yet
                  </h3>

                  <p>
                    Add your first income or expense to start tracking your finances.
                  </p>

                  <button
                    type="button"
                    className="task-primary-button"
                    onClick={() => openFinanceForm(null, "expense")}
                  >
                    ＋ Add Transaction
                  </button>

                </div>

              ) : (

                <div className="tasks-list">

                  {financeDailyGroups.map((day) => {

                    return (
                      <div
                        key={day.date}
                        style={{
                          marginBottom: "24px",
                          padding: "18px",
                          borderRadius: "18px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.025)"
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "16px",
                            marginBottom: "14px",
                            flexWrap: "wrap"
                          }}
                        >

                          <div>
                            <span
                              style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: 700,
                                opacity: 0.6,
                                letterSpacing: "0.08em",
                                marginBottom: "4px"
                              }}
                            >
                              DAY
                            </span>

                            <h3 style={{ margin: 0 }}>
                              {formatFinanceDate(day.date)}
                            </h3>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "18px",
                              flexWrap: "wrap",
                              alignItems: "center"
                            }}
                          >

                            <span style={{ color: "#22c55e", fontWeight: 800 }}>
                              +₹{formatFinanceAmount(day.income)}
                            </span>

                            <span style={{ color: "#ef4444", fontWeight: 800 }}>
                              -₹{formatFinanceAmount(day.expense)}
                            </span>

                            <span
                              style={{
                                color:
                                  day.closingBalance >= 0
                                    ? "#22c55e"
                                    : "#ef4444",
                                fontWeight: 900
                              }}
                            >
                              Balance ₹{formatFinanceAmount(day.closingBalance)}
                            </span>

                          </div>

                        </div>

                        <div style={{ display: "grid", gap: "10px" }}>

                          {day.transactions.map((transaction) => (

                            <article
                              className="task-item"
                              key={transaction.id}
                            >

                              <div
                                className="task-check-button"
                                style={{
                                  borderLeft: `4px solid ${
                                    transaction.type === "income"
                                      ? "#22c55e"
                                      : "#ef4444"
                                  }`,
                                  background:
                                    transaction.type === "income"
                                      ? "rgba(34, 197, 94, 0.08)"
                                      : "rgba(239, 68, 68, 0.08)"
                                }}
                              >
                                {transaction.type === "income" ? "↑" : "↓"}
                              </div>

                              <div className="task-item-main">

                                <div className="task-item-top">

                                  <h3>
                                    {transaction.category}
                                  </h3>

                                  <span
                                    className={`task-priority ${
                                      transaction.type === "income"
                                        ? "low"
                                        : "high"
                                    }`}
                                  >
                                    {transaction.type.toUpperCase()}
                                  </span>

                                </div>

                                <p>
                                  {transaction.description || "No description"}
                                </p>

                                <div className="task-item-meta">

                                  <span>
                                    Balance after transaction
                                  </span>

                                  <strong
                                    style={{
                                      color:
                                        transaction.running_balance >= 0
                                          ? "#22c55e"
                                          : "#ef4444",
                                      fontWeight: 900
                                    }}
                                  >
                                    ₹{formatFinanceAmount(transaction.running_balance)}
                                  </strong>

                                </div>

                              </div>

                              <div className="task-item-actions">

                                <button
                                  type="button"
                                  onClick={() => openFinanceForm(transaction)}
                                  aria-label="Edit transaction"
                                  title="Edit transaction"
                                >
                                  ✎
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteFinanceTransaction(transaction.id)}
                                  aria-label="Delete transaction"
                                  title="Delete transaction"
                                >
                                  🗑
                                </button>

                              </div>

                            </article>

                          ))}

                        </div>

                      </div>
                    );
                  })}

                </div>

              )}

            </div>

            <div className="tasks-storage-note">
              <strong>PostgreSQL connected</strong>
              <span>
                Your finance transactions are stored through the EMPAIR backend and persist after refresh.
              </span>
            </div>

          </section>
        )}

        {/* =================================================
            OTHER MODULES
           ================================================= */}

        {activePage !== "Dashboard" &&
          activePage !== "My Journey" &&
          activePage !== "Tasks" &&
          activePage !== "Attendance" &&
          activePage !== "Finance" && (

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