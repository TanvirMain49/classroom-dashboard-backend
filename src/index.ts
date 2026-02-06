import express from "express";

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Classroom Backend API" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
});
