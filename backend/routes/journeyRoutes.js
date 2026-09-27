const express = require("express");

const pool = require("../config/db");

const router = express.Router();


// =====================================================
// GET JOURNEY PROFILE
// =====================================================

router.get("/profile", async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `
            SELECT
                id,
                user_id,
                college,
                degree,
                branch,
                current_year,
                current_semester,
                start_year,
                graduation_year,
                created_at,
                updated_at
            FROM journey_profile
            WHERE user_id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                profile: null
            });
        }

        res.json({
            success: true,
            profile: result.rows[0]
        });

    } catch (error) {
        console.error(
            "GET JOURNEY PROFILE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to load journey profile"
        });
    }
});


// =====================================================
// CREATE / UPDATE JOURNEY PROFILE
// =====================================================

router.put("/profile", async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            college,
            degree,
            branch,
            current_year,
            current_semester,
            start_year,
            graduation_year
        } = req.body;

        if (
            current_year !== undefined &&
            current_year !== null &&
            (Number(current_year) < 1 ||
                Number(current_year) > 4)
        ) {
            return res.status(400).json({
                success: false,
                message: "Current year must be between 1 and 4"
            });
        }

        if (
            current_semester !== undefined &&
            current_semester !== null &&
            (Number(current_semester) < 1 ||
                Number(current_semester) > 8)
        ) {
            return res.status(400).json({
                success: false,
                message: "Current semester must be between 1 and 8"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO journey_profile (
                user_id,
                college,
                degree,
                branch,
                current_year,
                current_semester,
                start_year,
                graduation_year,
                updated_at
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                COALESCE($5, 1),
                COALESCE($6, 1),
                $7,
                $8,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id)
            DO UPDATE SET
                college = EXCLUDED.college,
                degree = EXCLUDED.degree,
                branch = EXCLUDED.branch,
                current_year = EXCLUDED.current_year,
                current_semester = EXCLUDED.current_semester,
                start_year = EXCLUDED.start_year,
                graduation_year = EXCLUDED.graduation_year,
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                id,
                user_id,
                college,
                degree,
                branch,
                current_year,
                current_semester,
                start_year,
                graduation_year,
                created_at,
                updated_at
            `,
            [
                userId,
                college || null,
                degree || null,
                branch || null,
                current_year ?? null,
                current_semester ?? null,
                start_year || null,
                graduation_year || null
            ]
        );

        res.json({
            success: true,
            message: "Journey profile saved successfully",
            profile: result.rows[0]
        });

    } catch (error) {
        console.error(
            "SAVE JOURNEY PROFILE ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to save journey profile"
        });
    }
});


// =====================================================
// GET JOURNEY ITEMS
// =====================================================

router.get("/items", async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `
            SELECT
                id,
                user_id,
                type,
                title,
                description,
                item_date::text AS item_date,
                link,
                created_at,
                updated_at
            FROM journey_items
            WHERE user_id = $1
            ORDER BY item_date DESC NULLS LAST, created_at DESC
            `,
            [userId]
        );

        res.json({
            success: true,
            items: result.rows
        });

    } catch (error) {
        console.error(
            "GET JOURNEY ITEMS ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to load journey items"
        });
    }
});


// =====================================================
// CREATE JOURNEY ITEM
// =====================================================

router.post("/items", async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            type,
            title,
            description,
            item_date,
            link
        } = req.body;

        const allowedTypes = [
            "project",
            "certificate",
            "hackathon"
        ];

        if (!type || !allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message:
                    "Type must be project, certificate or hackathon"
            });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title is required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO journey_items (
                user_id,
                type,
                title,
                description,
                item_date,
                link
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                user_id,
                type,
                title,
                description,
                item_date::text AS item_date,
                link,
                created_at,
                updated_at
            `,
            [
                userId,
                type,
                title.trim(),
                description?.trim() || null,
                item_date || null,
                link?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Journey item created successfully",
            item: result.rows[0]
        });

    } catch (error) {
        console.error(
            "CREATE JOURNEY ITEM ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to create journey item"
        });
    }
});


// =====================================================
// UPDATE JOURNEY ITEM
// =====================================================

router.put("/items/:id", async (req, res) => {
    try {
        const userId = req.user.userId;
        const itemId = req.params.id;

        const {
            type,
            title,
            description,
            item_date,
            link
        } = req.body;

        const allowedTypes = [
            "project",
            "certificate",
            "hackathon"
        ];

        if (type && !allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message:
                    "Type must be project, certificate or hackathon"
            });
        }

        if (title !== undefined && !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title cannot be empty"
            });
        }

        const result = await pool.query(
            `
            UPDATE journey_items
            SET
                type = COALESCE($1, type),
                title = COALESCE($2, title),
                description = $3,
                item_date = $4,
                link = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
              AND user_id = $7
            RETURNING
                id,
                user_id,
                type,
                title,
                description,
                item_date::text AS item_date,
                link,
                created_at,
                updated_at
            `,
            [
                type || null,
                title !== undefined
                    ? title.trim()
                    : null,
                description?.trim() || null,
                item_date || null,
                link?.trim() || null,
                itemId,
                userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Journey item not found"
            });
        }

        res.json({
            success: true,
            message: "Journey item updated successfully",
            item: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE JOURNEY ITEM ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to update journey item"
        });
    }
});


// =====================================================
// DELETE JOURNEY ITEM
// =====================================================

router.delete("/items/:id", async (req, res) => {
    try {
        const userId = req.user.userId;
        const itemId = req.params.id;

        const result = await pool.query(
            `
            DELETE FROM journey_items
            WHERE id = $1
              AND user_id = $2
            RETURNING id
            `,
            [itemId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Journey item not found"
            });
        }

        res.json({
            success: true,
            message: "Journey item deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE JOURNEY ITEM ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete journey item"
        });
    }
});


module.exports = router;