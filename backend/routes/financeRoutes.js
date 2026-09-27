const express = require("express");

const pool = require("../config/db");

const router = express.Router();


// =====================================================
// GET FINANCE BALANCE
// =====================================================

router.get("/balance", async (req, res) => {
    try {
        const userId = req.user.userId;

        const settingsResult = await pool.query(
            `
            SELECT opening_balance
            FROM finance_settings
            WHERE user_id = $1
            `,
            [userId]
        );

        const openingBalance =
            settingsResult.rows.length > 0
                ? Number(settingsResult.rows[0].opening_balance)
                : 0;

        const totalsResult = await pool.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'income' THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_income,

                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'expense' THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_expense

            FROM finance_transactions
            WHERE user_id = $1
            `,
            [userId]
        );

        const totalIncome = Number(
            totalsResult.rows[0].total_income
        );

        const totalExpense = Number(
            totalsResult.rows[0].total_expense
        );

        const currentBalance =
            openingBalance +
            totalIncome -
            totalExpense;

        return res.status(200).json({
            success: true,
            balance: {
                opening_balance: openingBalance,
                total_income: totalIncome,
                total_expense: totalExpense,
                current_balance: currentBalance
            }
        });

    } catch (error) {
        console.error(
            "GET FINANCE BALANCE ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch finance balance"
        });
    }
});


// =====================================================
// UPDATE OPENING BALANCE
// =====================================================

router.put("/balance", async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            opening_balance
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (
            opening_balance === undefined ||
            opening_balance === null ||
            opening_balance === "" ||
            Number.isNaN(Number(opening_balance)) ||
            Number(opening_balance) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Opening balance must be 0 or greater"
            });
        }


        // -------------------------------------------------
        // INSERT / UPDATE
        // -------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO finance_settings
            (
                user_id,
                opening_balance
            )
            VALUES
            (
                $1,
                $2
            )
            ON CONFLICT (user_id)
            DO UPDATE SET
                opening_balance = EXCLUDED.opening_balance,
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                user_id,
                opening_balance,
                updated_at
            `,
            [
                userId,
                Number(opening_balance)
            ]
        );


        return res.status(200).json({
            success: true,
            message: "Opening balance updated successfully",
            balance: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE OPENING BALANCE ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update opening balance"
        });
    }
});


// =====================================================
// GET ALL FINANCE TRANSACTIONS
// =====================================================

router.get("/", async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `
            SELECT
                id,
                type,
                amount,
                category,
                description,
                transaction_date::text AS transaction_date,
                created_at,
                updated_at
            FROM finance_transactions
            WHERE user_id = $1
            ORDER BY transaction_date DESC, created_at DESC
            `,
            [userId]
        );


        return res.status(200).json({
            success: true,
            transactions: result.rows
        });

    } catch (error) {
        console.error(
            "GET FINANCE TRANSACTIONS ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch finance transactions"
        });
    }
});


// =====================================================
// GET SINGLE TRANSACTION
// =====================================================

router.get("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactionId = req.params.id;


        const result = await pool.query(
            `
            SELECT
                id,
                type,
                amount,
                category,
                description,
                transaction_date::text AS transaction_date,
                created_at,
                updated_at
            FROM finance_transactions
            WHERE id = $1
            AND user_id = $2
            `,
            [
                transactionId,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Finance transaction not found"
            });
        }


        return res.status(200).json({
            success: true,
            transaction: result.rows[0]
        });

    } catch (error) {
        console.error(
            "GET SINGLE FINANCE TRANSACTION ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch finance transaction"
        });
    }
});


// =====================================================
// CREATE TRANSACTION
// =====================================================

router.post("/", async (req, res) => {
    try {
        const userId = req.user.userId;


        const {
            type,
            amount,
            category,
            description,
            transaction_date
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (
            !type ||
            !["income", "expense"].includes(type)
        ) {
            return res.status(400).json({
                success: false,
                message: "Type must be income or expense"
            });
        }


        if (
            amount === undefined ||
            amount === null ||
            amount === "" ||
            Number.isNaN(Number(amount)) ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }


        if (
            !category ||
            !category.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }


        // -------------------------------------------------
        // INSERT
        // -------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO finance_transactions
            (
                user_id,
                type,
                amount,
                category,
                description,
                transaction_date
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                COALESCE($6::date, CURRENT_DATE)
            )
            RETURNING
                id,
                type,
                amount,
                category,
                description,
                transaction_date::text AS transaction_date,
                created_at,
                updated_at
            `,
            [
                userId,
                type,
                Number(amount),
                category.trim(),
                description?.trim() || null,
                transaction_date || null
            ]
        );


        return res.status(201).json({
            success: true,
            message: "Finance transaction created successfully",
            transaction: result.rows[0]
        });

    } catch (error) {
        console.error(
            "CREATE FINANCE TRANSACTION ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create finance transaction"
        });
    }
});


// =====================================================
// UPDATE TRANSACTION
// =====================================================

router.put("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactionId = req.params.id;


        const {
            type,
            amount,
            category,
            description,
            transaction_date
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (
            !type ||
            !["income", "expense"].includes(type)
        ) {
            return res.status(400).json({
                success: false,
                message: "Type must be income or expense"
            });
        }


        if (
            amount === undefined ||
            amount === null ||
            amount === "" ||
            Number.isNaN(Number(amount)) ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }


        if (
            !category ||
            !category.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }


        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        const result = await pool.query(
            `
            UPDATE finance_transactions
            SET
                type = $1,
                amount = $2,
                category = $3,
                description = $4,
                transaction_date =
                    COALESCE(
                        $5::date,
                        transaction_date
                    ),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            AND user_id = $7
            RETURNING
                id,
                type,
                amount,
                category,
                description,
                transaction_date::text AS transaction_date,
                created_at,
                updated_at
            `,
            [
                type,
                Number(amount),
                category.trim(),
                description?.trim() || null,
                transaction_date || null,
                transactionId,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Finance transaction not found"
            });
        }


        return res.status(200).json({
            success: true,
            message: "Finance transaction updated successfully",
            transaction: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE FINANCE TRANSACTION ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update finance transaction"
        });
    }
});


// =====================================================
// DELETE TRANSACTION
// =====================================================

router.delete("/:id", async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactionId = req.params.id;


        const result = await pool.query(
            `
            DELETE FROM finance_transactions
            WHERE id = $1
            AND user_id = $2
            RETURNING id
            `,
            [
                transactionId,
                userId
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Finance transaction not found"
            });
        }


        return res.status(200).json({
            success: true,
            message: "Finance transaction deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE FINANCE TRANSACTION ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to delete finance transaction"
        });
    }
});


module.exports = router;