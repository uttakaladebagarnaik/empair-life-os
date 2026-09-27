const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// =====================================================
// GET ALL ATTENDANCE
// =====================================================

router.get("/", async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                subject,
                attendance_date::text AS attendance_date,
                status,
                created_at
             FROM attendance
             WHERE user_id = $1
             ORDER BY attendance_date DESC, id DESC`,
            [userId]
        );

        res.json({
            success: true,
            attendance: result.rows
        });

    } catch (error) {
        console.error(
            "GET ATTENDANCE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance"
        });
    }
});


// =====================================================
// GET ATTENDANCE BY DATE
// =====================================================

router.get("/date/:date", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { date } = req.params;

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                subject,
                attendance_date::text AS attendance_date,
                status,
                created_at
             FROM attendance
             WHERE user_id = $1
             AND attendance_date = $2
             ORDER BY id ASC`,
            [userId, date]
        );

        res.json({
            success: true,
            attendance: result.rows
        });

    } catch (error) {
        console.error(
            "GET DATE ATTENDANCE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch attendance for date"
        });
    }
});


// =====================================================
// CREATE ATTENDANCE
// =====================================================

router.post("/", async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            subject,
            attendance_date,
            status
        } = req.body;


        if (!subject || !subject.trim()) {
            return res.status(400).json({
                success: false,
                message: "Subject is required"
            });
        }


        if (!attendance_date) {
            return res.status(400).json({
                success: false,
                message:
                    "Attendance date is required"
            });
        }


        if (
            ![
                "pending",
                "present",
                "absent"
            ].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be pending, present or absent"
            });
        }


        const result = await pool.query(
            `INSERT INTO attendance
                (
                    user_id,
                    subject,
                    attendance_date,
                    status
                )
             VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4
                )

             RETURNING
                id,
                user_id,
                subject,
                attendance_date::text AS attendance_date,
                status,
                created_at`,
            [
                userId,
                subject.trim(),
                attendance_date,
                status
            ]
        );


        res.status(201).json({
            success: true,
            message:
                "Attendance created successfully",
            attendance: result.rows[0]
        });

    } catch (error) {
        console.error(
            "CREATE ATTENDANCE ERROR:",
            error.message
        );


        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "Attendance already exists for this subject and date"
            });
        }


        res.status(500).json({
            success: false,
            message:
                "Failed to create attendance"
        });
    }
});


// =====================================================
// UPDATE ATTENDANCE
// =====================================================

router.put("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const {
            subject,
            attendance_date,
            status
        } = req.body;


        if (
            status !== undefined &&
            ![
                "pending",
                "present",
                "absent"
            ].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be pending, present or absent"
            });
        }


        const result = await pool.query(
            `UPDATE attendance
             SET
                subject = COALESCE(
                    $1,
                    subject
                ),

                attendance_date = COALESCE(
                    $2,
                    attendance_date
                ),

                status = COALESCE(
                    $3,
                    status
                )

             WHERE id = $4
             AND user_id = $5

             RETURNING
                id,
                user_id,
                subject,
                attendance_date::text AS attendance_date,
                status,
                created_at`,
            [
                subject
                    ? subject.trim()
                    : null,

                attendance_date || null,

                status || null,

                id,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Attendance record not found"
            });
        }


        res.json({
            success: true,
            message:
                "Attendance updated successfully",
            attendance: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE ATTENDANCE ERROR:",
            error.message
        );


        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "Attendance already exists for this subject and date"
            });
        }


        res.status(500).json({
            success: false,
            message:
                "Failed to update attendance"
        });
    }
});


// =====================================================
// DELETE ATTENDANCE
// =====================================================

router.delete("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;


        const result = await pool.query(
            `DELETE FROM attendance
             WHERE id = $1
             AND user_id = $2

             RETURNING
                id,
                user_id,
                subject,
                attendance_date::text AS attendance_date,
                status,
                created_at`,
            [
                id,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Attendance record not found"
            });
        }


        res.json({
            success: true,
            message:
                "Attendance deleted successfully",
            attendance: result.rows[0]
        });

    } catch (error) {
        console.error(
            "DELETE ATTENDANCE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to delete attendance"
        });
    }
});


module.exports = router;