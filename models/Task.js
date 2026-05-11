import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    ticketNumber: Number,

    title: String,

    description: String,

    status: String,

    priority: String,

    category: String,

    dueDate: String,
    reminderTime: Date,

    notificationSent: {
      type: Boolean,
      default: false
    },
    userId: String   // ✅ ADD THIS
  },

  { timestamps: true }
);

export default mongoose.model("Task", taskSchema);