import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Api",
    },

    type: {
      type: String,
      enum: ["DOWN", "RECOVERED"],
    },

    message: {
      type: String,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;