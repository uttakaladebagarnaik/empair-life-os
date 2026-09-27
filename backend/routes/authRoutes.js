const express = require("express");

const {
  register,
  login,
  getMe
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// PUBLIC AUTH ROUTES
// ============================================

router.post("/register", register);
router.post("/login", login);

// ============================================
// PROTECTED USER ROUTE
// ============================================

router.get("/me", authenticateToken, getMe);

module.exports = router;