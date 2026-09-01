import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Api",
      required: true,
    },

    status: {
      type: String,
      enum: ["UP", "DOWN"],
      required: true,
    },

    statusCode: {
      type: Number,
    },

    responseTime: {
      type: Number,
    },

    message: {
      type: String,
    },

    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model("Log", logSchema);

export default Log;