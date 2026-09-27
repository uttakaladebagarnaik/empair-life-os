const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const tasksRoutes = require("./routes/tasksRoutes");
const authRoutes = require("./routes/authRoutes");

const authenticateToken = require("./middleware/authMiddleware");

const app = express();

const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


// ============================================
// ROOT
// ============================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "EMPAIR Backend is running 🚀",
        version: "v0.6.0"
    });
});


// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", async (req, res) => {
    try {

        const result = await pool.query(
            "SELECT NOW()"
        );

        res.json({
            success: true,
            status: "healthy",
            service: "EMPAIR Backend",
            database: "connected",
            time: result.rows[0].now
        });

    } catch (error) {

        console.error(
            "Database connection failed:",
            error.message
        );

        res.status(500).json({
            success: false,
            status: "unhealthy",
            database: "disconnected"
        });
    }
});


// ============================================
// AUTH ROUTES
// ============================================

app.use(
    "/api/auth",
    authRoutes
);


// ============================================
// PROTECTED TASK ROUTES
// ============================================

app.use(
    "/api/tasks",
    authenticateToken,
    tasksRoutes
);


// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {

    console.log(
        `🚀 EMPAIR Backend running on http://localhost:${PORT}`
    );

});