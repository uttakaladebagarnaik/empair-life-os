const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// =====================================================
// GET ALL ROUTINES
// =====================================================

router.get("/", async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                routine_date::text AS routine_date,
                title,
                start_time,
                end_time,
                is_completed,
                created_at,
                updated_at
             FROM daily_routine
             WHERE user_id = $1
             ORDER BY routine_date ASC, start_time ASC, id ASC`,
            [userId]
        );

        res.json({
            success: true,
            routines: result.rows
        });

    } catch (error) {
        console.error("GET ROUTINE ERROR:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch routine"
        });
    }
});


// =====================================================
// GET ROUTINES FOR SPECIFIC DATE
// =====================================================

router.get("/date/:date", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.params;

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                routine_date::text AS routine_date,
                title,
                start_time,
                end_time,
                is_completed,
                created_at,
                updated_at
             FROM daily_routine
             WHERE user_id = $1
             AND routine_date = $2
             ORDER BY start_time ASC, id ASC`,
            [userId, date]
        );

        res.json({
            success: true,
            routines: result.rows
        });

    } catch (error) {
        console.error(
            "GET ROUTINE DATE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch routine for date"
        });
    }
});


// =====================================================
// CREATE ROUTINE
// =====================================================

router.post("/", async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            routine_date,
            title,
            start_time,
            end_time
        } = req.body;


        // -----------------------------
        // Validation
        // -----------------------------

        if (!routine_date) {
            return res.status(400).json({
                success: false,
                message: "Routine date is required"
            });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Routine title is required"
            });
        }


        // -----------------------------
        // Create routine
        // -----------------------------

        const result = await pool.query(
            `INSERT INTO daily_routine
                (
                    user_id,
                    routine_date,
                    title,
                    start_time,
                    end_time
                )
             VALUES
                ($1, $2, $3, $4, $5)
             RETURNING
                id,
                user_id,
                routine_date::text AS routine_date,
                title,
                start_time,
                end_time,
                is_completed,
                created_at,
                updated_at`,
            [
                userId,
                routine_date,
                title.trim(),
                start_time || null,
                end_time || null
            ]
        );


        res.status(201).json({
            success: true,
            message: "Routine created successfully",
            routine: result.rows[0]
        });

    } catch (error) {
        console.error(
            "CREATE ROUTINE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to create routine"
        });
    }
});


// =====================================================
// UPDATE ROUTINE
// =====================================================

router.put("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const {
            routine_date,
            title,
            start_time,
            end_time,
            is_completed
        } = req.body;


        const result = await pool.query(
            `UPDATE daily_routine
             SET
                routine_date = COALESCE(
                    $1,
                    routine_date
                ),

                title = COALESCE(
                    $2,
                    title
                ),

                start_time = COALESCE(
                    $3,
                    start_time
                ),

                end_time = COALESCE(
                    $4,
                    end_time
                ),

                is_completed = COALESCE(
                    $5,
                    is_completed
                ),

                updated_at = CURRENT_TIMESTAMP

             WHERE id = $6
             AND user_id = $7

             RETURNING
                id,
                user_id,
                routine_date::text AS routine_date,
                title,
                start_time,
                end_time,
                is_completed,
                created_at,
                updated_at`,
            [
                routine_date || null,
                title ? title.trim() : null,
                start_time || null,
                end_time || null,
                is_completed !== undefined
                    ? is_completed
                    : null,
                id,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Routine record not found"
            });
        }


        res.json({
            success: true,
            message: "Routine updated successfully",
            routine: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE ROUTINE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to update routine"
        });
    }
});


// =====================================================
// DELETE ROUTINE
// =====================================================

router.delete("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;


        const result = await pool.query(
            `DELETE FROM daily_routine
             WHERE id = $1
             AND user_id = $2

             RETURNING
                id,
                user_id,
                routine_date::text AS routine_date,
                title,
                start_time,
                end_time,
                is_completed,
                created_at,
                updated_at`,
            [
                id,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Routine record not found"
            });
        }


        res.json({
            success: true,
            message: "Routine deleted successfully",
            routine: result.rows[0]
        });

    } catch (error) {
        console.error(
            "DELETE ROUTINE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete routine"
        });
    }
});


module.exports = router;