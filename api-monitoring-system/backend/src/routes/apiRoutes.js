import express from "express";

import {
  createApi,
  getApis,
  deleteApi,
  getLogs,
  getDashboardStats,
} from "../controllers/apiController.js";

const router = express.Router();

router.post("/", createApi);

router.get("/", getApis);

router.delete("/:id", deleteApi);

router.get("/logs/all", getLogs);

router.get("/stats/dashboard", getDashboardStats);

export default router;