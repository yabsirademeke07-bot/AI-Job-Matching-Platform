const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobRoutes");
const matchRoutes = require("./routes/matchRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const cvRoutes = require("./routes/cvRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/job-seekers", jobSeekerRoutes);
app.use("/api/seeker", jobSeekerRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    message: "AI-Powered Job Matching System Backend is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});