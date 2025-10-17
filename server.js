// =========================
// 📁 server.js
// =========================
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173/'; // replace with actual deployed URL
const isProduction = process.env.NODE_ENV === 'production';

// =========================
// ✅ Socket.IO Setup
// =========================
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL],
    credentials: true,
  },
});

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  socket.on('registerUser', (userId) => {
    if (userId) {
      userSockets.set(userId, socket.id);
      console.log(`✅ Registered user ${userId} with socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(userId);
        console.log(`❌ User ${userId} disconnected`);
        break;
      }
    }
  });
});

// =========================
// ✅ Middleware
// =========================
app.use(express.json());
app.use(cors({
  origin: [FRONTEND_URL],
  credentials: true,
}));

// =========================
// ✅ MongoDB Connection
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Ensure default admin exists
    const User = require('./models/User');
    const adminEmail = "admin@gmail.com";
    const adminPassword = "admin123";

    const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        firstName: "System",
        lastName: "Admin",
        email: adminEmail,
        phone: "0000000000",
        address: "Head Office",
        password: hashedPassword,
        role: "admin",
      });
      console.log("✅ Default admin created successfully");
    }
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// =========================
// ✅ Session Middleware
// =========================
app.set('trust proxy', 1); // required if behind a reverse proxy (e.g., Vercel, Heroku)
app.use(session({
  secret: process.env.JWT_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'none',             // required for cross-domain cookies over HTTPS
    secure: true,                 // HTTPS only
  },
}));

// =========================
// ✅ Static files (uploads)
// =========================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================
// ✅ Routes
// =========================
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const complaintRoutes = require('./routes/complaintRoutes');
app.use('/api/complaints', complaintRoutes(io, userSockets));

// =========================
// ✅ Protected test route
// =========================
app.get('/api/profile', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ msg: 'Not authenticated' });
  const User = require('./models/User');
  const user = await User.findById(req.session.userId).select('-password');
  res.json(user);
});

// =========================
// ✅ Default route
// =========================
app.get('/', (req, res) => {
  res.send('Server is running successfully 🚀');
});

// =========================
// ✅ 404 handler
// =========================
app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

// =========================
// ✅ Start server
// =========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server + Socket.IO running on port ${PORT}`));



