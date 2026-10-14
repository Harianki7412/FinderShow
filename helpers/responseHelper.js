const success = (res, data = {}, message = "OK", status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, message = "Error", status = 400, errors = null) =>
  res.status(status).json({ success: false, message, errors });

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

module.exports = { success, fail, ApiError };
