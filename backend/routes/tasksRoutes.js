const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// ============================================
// GET ALL TASKS
// ============================================

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM tasks
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            tasks: result.rows
        });

    } catch (error) {
        console.error("GET TASKS ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch tasks"
        });
    }
});


// ============================================
// GET SINGLE TASK
// ============================================

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM tasks
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.json({
            success: true,
            task: result.rows[0]
        });

    } catch (error) {
        console.error("GET TASK ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch task"
        });
    }
});


// ============================================
// CREATE TASK
// ============================================

router.post("/", async (req, res) => {
    try {
        const {
            user_id,
            title,
            description,
            priority,
            due_date
        } = req.body;

        if (!user_id || !title) {
            return res.status(400).json({
                success: false,
                message: "user_id and title are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO tasks
            (user_id, title, description, priority, due_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                user_id,
                title,
                description || null,
                priority || "medium",
                due_date || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            task: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE TASK ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create task"
        });
    }
});


// ============================================
// UPDATE TASK
// ============================================

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            priority,
            due_date,
            is_completed
        } = req.body;

        const result = await pool.query(
            `UPDATE tasks
             SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                priority = COALESCE($3, priority),
                due_date = COALESCE($4, due_date),
                is_completed = COALESCE($5, is_completed),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [
                title,
                description,
                priority,
                due_date,
                is_completed,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.json({
            success: true,
            message: "Task updated successfully",
            task: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE TASK ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update task"
        });
    }
});


// ============================================
// DELETE TASK
// ============================================

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM tasks
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.json({
            success: true,
            message: "Task deleted successfully"
        });

    } catch (error) {
        console.error("DELETE TASK ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete task"
        });
    }
});


module.exports = router;