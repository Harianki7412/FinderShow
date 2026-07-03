const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const colors = require("colors");
const morgan = require("morgan");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
app.use("/api/v1/auth", require("./routes/userRoutes"));
app.use("/api/v1/coins", require("./routes/coinRoutes"));
app.use("/api/v1/withdrawals", require("./routes/withdrawalRoutes"));
app.use("/api/v1/payments", require("./routes/paymentRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/spinwheel", require("./routes/spinRoutes"));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Server running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res
    .status(500)
    .json({ success: false, message: err.message || "Internal server error" });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.bgGreen.white);
});
