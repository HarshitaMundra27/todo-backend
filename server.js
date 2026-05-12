import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import User from "./models/User.js";
import Task from "./models/Task.js";
import Notification from "./models/Notification.js";

import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

const app = express();


// ================= CORS =================

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://bucolic-cuchufli-c4e457.netlify.app"
    ],
    credentials: true
  })
);

app.use(express.json());


// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});


// ================= MONGODB =================

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/todo-app";

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected ✅");
  })
  .catch((err) => {
    console.log("Mongo error:", err);
  });

// ================= AUTH =================


// SIGNUP
app.post("/signup", async (req, res) => {

  const { name, email, password } =
    req.body;

  try {

    const existingUser =
      await User.findOne({ email });

    if (existingUser) {

      return res.status(400).json({
        message: "User already exists"
      });

    }

    const user = new User({
      name,
      email,
      password
    });

    await user.save();

    res.json({
      message: "Signup successful ✅"
    });

  } catch (err) {

    console.log(
      "Signup error:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }

});


// LOGIN
app.post("/login", async (req, res) => {

  try {

    const { email, password } =
      req.body;

    const user =
      await User.findOne({
        email,
        password
      });

    if (user) {

      res.json({

        message: "Login success",

        name: user.name,

        userId: user._id

      });

    } else {

      res.status(400).json({
        message:
          "Invalid credentials"
      });

    }

  } catch (err) {

    console.log(
      "Login error:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }

});


// ================= TASKS =================


// ADD TASK
app.post("/add-task", async (req, res) => {

  try {

    // LAST TASK
    const lastTask =
      await Task.findOne()
        .sort({
          ticketNumber: -1
        });

    let newTicketNumber = 1;

    if (
      lastTask &&
      !isNaN(lastTask.ticketNumber)
    ) {

      newTicketNumber =
        lastTask.ticketNumber + 1;

    }

    // =========================
    // 🔥 REMINDER LOGIC
    // =========================

    const now =
      new Date();

    const dueDate =
      new Date(
        req.body.dueDate +
        "T00:00:00"
      );

    const sameDay =
      now.toDateString() ===
      dueDate.toDateString();

    let reminderTime;

    // =========================
    // 🔥 SAME DAY TASK
    // =========================

    if (sameDay) {

      reminderTime =
        new Date(dueDate);

      // 11:30 PM
      reminderTime.setHours(
        23,
        30,
        0,
        0
      );

      // USER SAME DAY TASK COUNT
      const count =
        await Task.countDocuments({

          userId:
            req.body.userId,

          dueDate:
            req.body.dueDate

        });

      // 5 MIN REVERSE GAP
      reminderTime.setMinutes(

        reminderTime.getMinutes()
        - (count * 5)

      );

    }

    // =========================
    // 🔥 FUTURE TASK
    // =========================

    else {

      reminderTime =
        new Date(dueDate);

      // CREATED TIME
      reminderTime.setHours(
        now.getHours(),
        now.getMinutes(),
        0,
        0
      );

      // 30 MIN BEFORE
      reminderTime =
        new Date(

          reminderTime.getTime()
          - 30 * 60 * 1000

        );

    }

    // =========================
    // 🔥 SAVE TASK
    // =========================

    const task =
      new Task({

        ...req.body,

        ticketNumber:
          newTicketNumber,

        reminderTime,

        notificationSent: false

      });

    await task.save();

    res.json(task);

  } catch (err) {

    console.log(
      "Add task error:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }

});


// =========================
// 🔥 CRON JOB
// =========================

cron.schedule("* * * * *", async () => {

  try {

    const now =
      new Date();

    const tasks =
      await Task.find({

        reminderTime: {
          $lte: now
        },

        notificationSent: false,

        status: {
          $ne: "Completed"
        }

      });

    for (const task of tasks) {

      await Notification.create({

        userId: task.userId,

        taskId: task._id,

        type: "REMINDER",

        message:
          `Task "${task.title}" due today is pending`

      });

      task.notificationSent = true;

      await task.save();

      console.log(
        "Reminder sent:",
        task.title
      );

    }

  } catch (err) {

    console.log(
      "Cron error:",
      err
    );

  }

});
// GET TASKS
app.get("/tasks/:userId", async (req, res) => {

  try {

    const { userId } = req.params;

   const {

  page = 1,

  limit = 10,

  search = ""

} = req.query;

   const filter = {

  userId,

  ...(search && {

    $or: [

      {
        title: {
          $regex: search,
          $options: "i"
        }
      },

      {
        description: {
          $regex: search,
          $options: "i"
        }
      },

      {
        ticketNumber:
          isNaN(search)
            ? -1
            : Number(search)
      }

    ]

  })

};
    /* TASKS */

    const tasks = await Task.aggregate([

      {
        $match: filter
      },

      {
        $addFields: {

          statusOrder: {

            $switch: {

              branches: [

                {
                  case: {
                    $eq: ["$status", "Pending"]
                  },
                  then: 1
                },

                {
                  case: {
                    $eq: ["$status", "On Hold"]
                  },
                  then: 2
                },

                {
                  case: {
                    $eq: ["$status", "In Progress"]
                  },
                  then: 3
                },

                {
                  case: {
                    $eq: ["$status", "Completed"]
                  },
                  then: 4
                }

              ],

              default: 5

            }
          }

        }
      },

      {
        $sort: {

          statusOrder: 1,

          dueDate: 1,

          createdAt: 1

        }
      },

      {
        $skip:
          (page - 1) * limit
      },

      {
        $limit:
          Number(limit)
      }

    ]);

    /* TOTAL TASKS */

    const totalTasks =
      await Task.countDocuments(filter);

    res.json({

      tasks,

      totalPages:
        Math.ceil(
          totalTasks / limit
        )

    });

  }

  catch (err) {

    console.log(
      "Fetch tasks error:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }

});

// UPDATE TASK
app.put("/update-task/:id", async (req, res) => {

  try {

    const updated =
      await Task.findByIdAndUpdate(

        req.params.id,

        req.body,

        { new: true }

      );

    res.json(updated);

  } catch (err) {

    console.log(
      "Update task error:",
      err
    );

    res.status(500).json({
      error: err.message 
    });

  }

});


// DELETE TASK
app.delete("/delete-task/:id", async (req, res) => {

  try {

    await Task.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message: "Deleted"
    });

  } catch (err) {

    console.log(
      "Delete task error:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }

});


// GET SINGLE TASK
app.get("/task/:id", async (req, res) => {

  try {

    const task =
      await Task.findById(
        req.params.id
      );

    res.json(task);

  } catch (err) {

    console.log(
      "Get task error:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }

});


// ================= NOTIFICATIONS =================


// GET USER NOTIFICATIONS
app.get(
  "/notifications/:userId",

  async (req, res) => {

    try {

      const notifications =
        await Notification.find({

          userId:
            req.params.userId

        }).sort({

          createdAt: -1

        });

      res.json(
        notifications
      );

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: err.message
      });

    }

  }
);


// ================= SERVER =================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT} 🚀`
  );

});