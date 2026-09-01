import cron from "node-cron";

import { monitorApis } from "../services/monitorService.js";

const startMonitoringCron = () => {
  cron.schedule("* * * * *", async () => {
    console.log("Running API Monitoring Job...");

    await monitorApis();
  });
};

export default startMonitoringCron;