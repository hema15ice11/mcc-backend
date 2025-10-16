const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const Complaint = require("../models/Complaint");
const User = require("../models/User");

module.exports = (io, userSockets) => {
  const router = express.Router();

  // ===== Multer setup =====
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
  });
  const upload = multer({ storage });

  // ===== Simple email sender =====
  const sendEmail = async (to, subject, text) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
  };

  // ===== Middleware: User authentication =====
  const isUserAuthenticated = async (req, res, next) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ msg: "Not authenticated" });
      }
      const user = await User.findById(req.session.userId);
      if (!user) return res.status(404).json({ msg: "User not found" });
      req.user = user;
      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      res.status(500).json({ msg: "Server error in authentication" });
    }
  };

  // ===== POST: New complaint =====
  router.post("/", isUserAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const { category, subcategory, description } = req.body;
      if (!category || !subcategory || !description)
        return res.status(400).json({ msg: "All fields are required" });

      if (req.user.role !== "user")
        return res.status(403).json({ msg: "Only users can file complaints" });

      const complaint = new Complaint({
        userId: req.user._id,
        category,
        subcategory,
        description,
        fileUrl: req.file ? req.file.path.replace(/\\/g, "/") : undefined,
      });

      await complaint.save();

      io.emit("newComplaint", {
        userId: req.user._id,
        category,
        subcategory,
        description,
        createdAt: complaint.createdAt,
      });

      res.status(201).json({ msg: "Complaint submitted successfully", complaint });
    } catch (err) {
      console.error("Error creating complaint:", err);
      res.status(500).json({ msg: "Server error while creating complaint" });
    }
  });

  // ===== GET: Complaints by user =====
  router.get("/user/:userId", async (req, res) => {
    try {
      const complaints = await Complaint.find({ userId: req.params.userId }).sort({ createdAt: -1 });
      res.json(complaints);
    } catch (err) {
      console.error("Error fetching user complaints:", err);
      res.status(500).json({ msg: "Server error while fetching complaints" });
    }
  });

  // ===== GET: All complaints (Admin only) =====
  router.get("/all", async (req, res) => {
    try {
      const complaints = await Complaint.find()
        .populate("userId", "firstName lastName email phone address")
        .sort({ createdAt: -1 });
      res.json(complaints);
    } catch (err) {
      console.error("Error fetching all complaints:", err);
      res.status(500).json({ msg: "Server error while fetching all complaints" });
    }
  });

  // ===== PATCH: Update complaint status (Admin only) =====
  router.patch("/status/:id", async (req, res) => {
    try {
      const { status } = req.body;
      const complaintId = req.params.id;

      if (!status) return res.status(400).json({ msg: "Status is required" });
      if (!complaintId) return res.status(400).json({ msg: "Complaint ID missing" });

      const complaint = await Complaint.findByIdAndUpdate(
        complaintId,
        { $set: { status } },
        { new: true, runValidators: true }
      ).populate("userId", "firstName lastName email phone address");

      if (!complaint) {
        console.error("Complaint not found:", complaintId);
        return res.status(404).json({ msg: "Complaint not found" });
      }

      // Emit socket update
      io.emit("complaintUpdated", { complaintId, status });

      // Send email notification to user
      if (complaint.userId && complaint.userId.email) {
        const emailSubject = "Complaint Status Updated";
        const emailBody = `Hello ${complaint.userId.firstName},
Your complaint has been ${status}.
Thank you, Municipal Corporation Support Team`;

        try {
          await sendEmail(complaint.userId.email, emailSubject, emailBody);
          console.log(`Email sent to ${complaint.userId.email}`);
        } catch (emailErr) {
          console.error("Error sending status email:", emailErr);
        }
      }

      res.json(complaint);
    } catch (err) {
      console.error("Error while updating status:", err.message);
      res.status(500).json({ msg: "Server error while updating status" });
    }
  });

  return router;
};
