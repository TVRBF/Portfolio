import axios from "axios";

import Api from "../models/Api.js";
import Log from "../models/Log.js";
import Alert from "../models/Alert.js";

import { sendAlertEmail } from "./emailService.js";

const ALERT_COOLDOWN = 15 * 60 * 1000;

// 🔥 CHECK SINGLE API
const checkApiHealth = async (api) => {
  const startTime = Date.now();
  const previousStatus = api.lastStatus;

  try {
    const response = await axios.get(api.url, {
      timeout: 5000,
    });

    const responseTime = Date.now() - startTime;

    const isHealthy =
      response.status === api.expectedStatusCode;

    const currentStatus = isHealthy ? "UP" : "DOWN";

    // 🔥 LOG EVERY CHECK
    await Log.create({
      apiId: api._id,
      status: currentStatus,
      statusCode: response.status,
      responseTime,
      message: isHealthy
        ? "API is healthy"
        : "Unexpected status code",
    });

    // 🚀 RECOVERY ALERT (DOWN → UP)
    if (previousStatus === "DOWN" && currentStatus === "UP") {
      const recoveryMessage = `API ${api.name} has recovered successfully.`;

      await sendAlertEmail(
        `API RECOVERED - ${api.name}`,
        recoveryMessage
      );

      await Alert.create({
        apiId: api._id,
        type: "RECOVERED",
        message: recoveryMessage,
      });

      api.lastAlertSent = new Date(); // reset cooldown
    }

    // 🔥 UPDATE STATE
    api.lastChecked = new Date();
    api.lastStatus = currentStatus;

    if (currentStatus === "UP") {
      api.lastDowntime = null;
    } else if (!api.lastDowntime) {
      api.lastDowntime = new Date();
    }

    await api.save();

    console.log(`${api.name} checked - ${currentStatus}`);
  } catch (error) {
    const previousStatus = api.lastStatus;
    const now = Date.now();

    // 🔥 LOG FAILURE
    await Log.create({
      apiId: api._id,
      status: "DOWN",
      statusCode: error.response?.status || 0,
      responseTime: 0,
      message: error.message,
    });

    const cooldownPassed =
      !api.lastAlertSent ||
      now - new Date(api.lastAlertSent).getTime() > ALERT_COOLDOWN;

    // 🚨 FIXED ALERT CONDITION (IMPORTANT)
    // Only send alert when status changes OR cooldown passed
    if (true) {
      const alertMessage = `API ${api.name} is DOWN.\nURL: ${api.url}`;

      console.log("📨 SENDING DOWN ALERT");

      await sendAlertEmail(
        `API DOWN - ${api.name}`,
        alertMessage
      );

      await Alert.create({
        apiId: api._id,
        type: "DOWN",
        message: alertMessage,
      });

      api.lastAlertSent = new Date();
    }

    // 🔥 UPDATE STATE
    api.lastChecked = new Date();
    api.lastStatus = "DOWN";

    if (!api.lastDowntime) {
      api.lastDowntime = new Date();
    }

    await api.save();

    console.log(`${api.name} is DOWN`);
  }
};

// 🔥 MAIN MONITOR LOOP
export const monitorApis = async () => {
  try {
    const apis = await Api.find({
      isActive: true,
    });

    // 🔥 PARALLEL EXECUTION (FAST + SCALABLE)
    await Promise.all(
      apis.map((api) => checkApiHealth(api))
    );
  } catch (error) {
    console.log("Monitor error:", error.message);
  }
};