const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Make sure path is correct

// GET all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }); // latest first
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET total users count
router.get('/users/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count }); // return as { count: number }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// session check route
router.get('/api/auth/session', async (req, res) => {
  const User = require('./models/User');
  if (!req.session.userId) return res.json({ user: null });
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json({ user });
  } catch (err) {
    res.json({ user: null });
  }
});

module.exports = router;
