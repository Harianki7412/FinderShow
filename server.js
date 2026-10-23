require("dotenv").config();
require("colors");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const tmpDir = path.join(__dirname, "tmp", "uploads");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const app = express();
connectDB();

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
  }),
);

// Razorpay webhook needs raw body
app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(morgan("dev"));

app.get("/", (_, res) =>
  res.json({ status: "ok", service: "findershow-api", version: "v1" }),
);

app.use("/api/v1", routes);

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 FinderShow server on port ${PORT}`.cyan.bold),
);
