const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
  registerUser,
  loginUser,
  loginAdmin,
  logoutUser,
  logoutAdmin,
  createAdmin
} = require('../controllers/authController');



// -------------------- MIDDLEWARE --------------------

// Checks if a user is logged in
const isAuthenticated = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ msg: "Not authenticated" });
    }
    req.userId = req.session.userId; // attach userId for convenience
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

// Checks if logged-in user is admin
const isAdminMiddleware = (req, res, next) => {
  try {
    if (!req.session || !req.session.userId || req.session.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

// -------------------- USER ROUTES --------------------

// Register a new user
router.post('/register', registerUser);

// Login as user
router.post('/login', loginUser);

// Logout user
router.post('/logout', logoutUser);



// -------------------- ADMIN ROUTES --------------------

// Login as admin
router.post('/admin-login', loginAdmin);

router.post('/create-admin', createAdmin);


// Logout admin
router.post('/admin-logout', logoutAdmin);

// -------------------- SESSION ROUTE --------------------

// Get current logged-in user info
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({ user });
  } catch (err) {
    console.error('Error fetching user session:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------- ADMIN ONLY ROUTES --------------------

// Get all users (admin only, exclude admins)
router.get('/users', isAuthenticated, isAdminMiddleware, async (req, res) => {
  try {
    // Fetch only users with role 'user'
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// Get total users count (admin only)
// Get total users count (admin only, exclude admins)
router.get('/users/count', isAuthenticated, isAdminMiddleware, async (req, res) => {
  try {
    // Count only users with role 'user'
    const count = await User.countDocuments({ role: 'user' });
    res.json({ count });
  } catch (err) {
    console.error('Error fetching user count:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});


module.exports = router;
