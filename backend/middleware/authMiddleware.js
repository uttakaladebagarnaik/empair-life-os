const jwt = require("jsonwebtoken");


// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
  try {

    // ----------------------------------------
    // GET AUTHORIZATION HEADER
    // ----------------------------------------

    const authHeader = req.headers.authorization;


    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }


    // ----------------------------------------
    // CHECK BEARER FORMAT
    // ----------------------------------------

    const parts = authHeader.split(" ");


    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format. Use Bearer <token>",
      });
    }


    const token = parts[1];


    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }


    // ----------------------------------------
    // VERIFY JWT
    // ----------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );


    // ----------------------------------------
    // ATTACH USER TO REQUEST
    // ----------------------------------------

    req.user = decoded;


    // ----------------------------------------
    // CONTINUE REQUEST
    // ----------------------------------------

    next();


  } catch (error) {

    console.error(
      "AUTH MIDDLEWARE ERROR:",
      error.message
    );


    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired",
      });
    }


    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }


    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};


module.exports = authenticateToken;