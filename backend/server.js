
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const requireAuth = require("./middleware/auth");
const taskRoutes = require("./routes/tasks");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Basic security headers.
app.use(helmet());

// Limit JSON request size.
app.use(express.json({ limit: "20kb" }));

// Limit repeated API requests.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

// Health check: no login required.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Daily Task Manager backend is running."
  });
});

// Check the identity of the signed-in user.
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// Task management endpoints.
app.use("/api/tasks", taskRoutes);

// Serve the HTML, CSS, and JavaScript frontend.
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Return JSON for unknown API endpoints.
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// Handle malformed JSON.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON request body."
    });
  }

  next(err);
});

// Centralized error handler.
app.use((err, req, res, next) => {
  console.error("Request failed:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: "An unexpected server error occurred. Please try again."
  });
});

app.listen(PORT, () => {
  console.log(
    `Daily Task Manager running at http://localhost:${PORT}`
  );
});
