import Api from "../models/Api.js";
import Log from "../models/Log.js";

export const createApi = async (req, res) => {
  try {
    const { name, url, expectedStatusCode } = req.body;

    const api = await Api.create({
      name,
      url,
      expectedStatusCode,
    });

    res.status(201).json(api);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getApis = async (req, res) => {
  try {
    const apis = await Api.find().sort({ createdAt: -1 });

    res.json(apis);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteApi = async (req, res) => {
  try {
    await Api.findByIdAndDelete(req.params.id);

    res.json({
      message: "API deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getLogs = async (req, res) => {
  try {
    const logs = await Log.find()
      .populate("apiId")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalApis = await Api.countDocuments();

    const upApis = await Api.countDocuments({
      lastStatus: "UP",
    });

    const downApis = await Api.countDocuments({
      lastStatus: "DOWN",
    });

    const logs = await Log.find();

    let avgResponseTime = 0;

    if (logs.length > 0) {
      const totalTime = logs.reduce(
        (acc, log) => acc + (log.responseTime || 0),
        0
      );

      avgResponseTime = totalTime / logs.length;
    }

    res.json({
      totalApis,
      upApis,
      downApis,
      avgResponseTime: Math.round(avgResponseTime),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};