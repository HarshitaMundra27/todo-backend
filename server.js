import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import User from "./models/User.js";
import Task from "./models/Task.js";

const app = express();

// ✅ CORS
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://sweet-kitsune-5d05e0.netlify.app"
  ],
  credentials: true
}));

app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ✅ ENV-based MongoDB connection
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/todo-app";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log("Mongo error:", err));


// ================= AUTH =================

// SIGNUP
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({ name, email, password });
    await user.save();

    res.json({ message: "Signup successful ✅" });

  } catch (err) {
    console.log("Signup error:", err); // 🔥 debug
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });

    if (user) {
      res.json({
        message: "Login success",
        name: user.name
      });
    } else {
      res.status(400).json({ message: "Invalid credentials" });
    }

  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ message: err.message });
  }
});


// ================= TASKS =================

// ADD TASK
app.post("/add-task", async (req, res) => {
  try {
    const lastTask = await Task.findOne().sort({ ticketNumber: -1 });

    let newTicketNumber = 1;

    if (lastTask && !isNaN(lastTask.ticketNumber)) {
      newTicketNumber = lastTask.ticketNumber + 1;
    }

    const task = new Task({
      ...req.body,
      ticketNumber: newTicketNumber,
    });

    await task.save();
    res.json(task);

  } catch (err) {
    console.log("Add task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET TASKS
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ ticketNumber: 1 });
    res.json(tasks);
  } catch (err) {
    console.log("Fetch tasks error:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE TASK
app.put("/update-task/:id", async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.log("Update task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE TASK
app.delete("/delete-task/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.log("Delete task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE TASK
app.get("/task/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    res.json(task);
  } catch (err) {
    console.log("Get task error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ================= SERVER =================

// ✅ Works both locally & Render
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});