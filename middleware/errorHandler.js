const { fail } = require("../helpers/responseHelper");

const errorHandler = (err, req, res, _next) => {
  console.error("❌".red, err.stack || err.message);

  if (err.name === "MulterError") {
    return fail(res, `Upload error: ${err.message}`, 400);
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return fail(res, "Validation failed", 400, errors);
  }

  if (err.code === 11000) {
    const key = Object.keys(err.keyValue).join(", ");
    return fail(res, `Duplicate value for: ${key}`, 409);
  }

  return fail(res, err.message || "Server error", err.status || 500);
};

module.exports = errorHandler;
