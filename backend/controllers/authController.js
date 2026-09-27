const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// ============================================
// JWT TOKEN GENERATOR
// ============================================

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};


// ============================================
// REGISTER
// ============================================

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;


    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }


    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();


    if (!cleanName || !cleanEmail || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password cannot be empty",
      });
    }


    // Minimum password length

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }


    // -------------------------------
    // CHECK EXISTING USER
    // -------------------------------

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [cleanEmail]
    );


    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }


    // -------------------------------
    // HASH PASSWORD
    // -------------------------------

    const passwordHash = await bcrypt.hash(
      password,
      12
    );


    // -------------------------------
    // CREATE USER
    // -------------------------------

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password_hash
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING
        id,
        name,
        email,
        created_at
      `,
      [
        cleanName,
        cleanEmail,
        passwordHash,
      ]
    );


    const user = result.rows[0];


    // -------------------------------
    // GENERATE JWT
    // -------------------------------

    const token = generateToken(user);


    // -------------------------------
    // RESPONSE
    // -------------------------------

    return res.status(201).json({
      success: true,
      message: "User registered successfully",

      user,

      token,
    });


  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error.message
    );


    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



// ============================================
// LOGIN
// ============================================

const login = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;


    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }


    const cleanEmail = email
      .trim()
      .toLowerCase();


    // -------------------------------
    // FIND USER
    // -------------------------------

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        created_at
      FROM users
      WHERE email = $1
      `,
      [cleanEmail]
    );


    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }


    const user = result.rows[0];


    // -------------------------------
    // CHECK PASSWORD HASH
    // -------------------------------

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message:
          "This account does not have a password yet. Please create a new account.",
      });
    }


    // -------------------------------
    // VERIFY PASSWORD
    // -------------------------------

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash
      );


    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }


    // -------------------------------
    // REMOVE PASSWORD HASH
    // -------------------------------

    delete user.password_hash;


    // -------------------------------
    // GENERATE JWT
    // -------------------------------

    const token = generateToken(user);


    // -------------------------------
    // RESPONSE
    // -------------------------------

    return res.json({
      success: true,
      message: "Login successful",

      user,

      token,
    });


  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error.message
    );


    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



// ============================================
// EXPORT
// ============================================

module.exports = {
  register,
  login,
};