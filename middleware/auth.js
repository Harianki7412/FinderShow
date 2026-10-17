const User = require("../models/User");
const { verifyToken } = require("../helpers/jwtHelper");
const { fail } = require("../helpers/responseHelper");

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return fail(res, "Not authorized, no token", 401);
    }
    const decoded = verifyToken(header.split(" ")[1]);
    const user = await User.findById(decoded.id);
    if (!user) return fail(res, "User no longer exists", 401);
    req.user = user;
    next();
  } catch (err) {
    return fail(res, "Token invalid or expired", 401);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return fail(res, "Admin access required", 403);
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const decoded = verifyToken(header.split(" ")[1]);
      req.user = await User.findById(decoded.id);
    }
  } catch (_) {}
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
