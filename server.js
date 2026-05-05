import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import User from "./models/user.js"; 
import Task from "./models/Task.js";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://your-netlify-site.netlify.app"
  ],
  credentials: true
}));
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Backend running ");
});

// MongoDB connect
mongoose.connect("mongodb://127.0.0.1:27017/todo-app")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;  // 🔥 ADD name

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({ name, email, password }); // 🔥 ADD name
    await user.save();

    res.json({ message: "Signup successful ✅" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
app.post("/login", async (req, res) => {
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
});
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
    res.status(500).json({ error: err.message });
  }
});

// GET TASKS
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ ticketNumber: 1 }); // 🔥 sorted

    res.json(tasks);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});
app.delete("/delete-task/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json(err);
  }
});
app.get("/task/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    res.json(task);
  } catch (err) {
    res.status(500).json(err);
  }
});


// start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});