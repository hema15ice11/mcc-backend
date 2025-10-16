const isAuthenticated = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ msg: "Not authenticated" });
    }
    // Attach userId to request for convenience
    req.userId = req.session.userId;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { isAuthenticated };
