import mongoose from "mongoose";

const apiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    expectedStatusCode: {
      type: Number,
      default: 200,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastChecked: {
      type: Date,
    },

    lastStatus: {
      type: String,
      enum: ["UP", "DOWN"],
      default: "UP",
    },

    lastAlertSent: {
      type: Date,
    },

    lastDowntime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Api = mongoose.model("Api", apiSchema);

export default Api;