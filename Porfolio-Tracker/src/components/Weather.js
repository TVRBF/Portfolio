import React, { useState } from "react";
import { motion } from "framer-motion";

function Weather() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_KEY = "88ffa86018378fa038e997f45d47f990";

  const fetchWeather = async () => {
    if (!city) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) throw new Error("City not found");

      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-100">

      <motion.div
        className="w-full max-w-md backdrop-blur-xl bg-white/70 border border-gray-200 shadow-2xl rounded-2xl p-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* TITLE */}
        <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Weather App
        </h2>

        {/* INPUT */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter city name..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
          />

          <button
            onClick={fetchWeather}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:scale-105 active:scale-95 transition shadow-md"
          >
            Search
          </button>
        </div>

        {/* STATES */}
        {loading && (
          <p className="text-center text-gray-500">Fetching weather...</p>
        )}

        {error && (
          <p className="text-center text-red-500 font-medium">{error}</p>
        )}

        {/* WEATHER CARD */}
        {weather && (
          <motion.div
            className="mt-6 space-y-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* HEADER */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800">
                {weather.name}
              </h3>
              <p className="text-gray-500 capitalize">
                {weather.weather[0].description}
              </p>
              <img
                className="mx-auto"
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                alt="weather icon"
              />
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Temperature</p>
                <p className="text-xl font-bold text-blue-600">
                  {weather.main.temp}°C
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Humidity</p>
                <p className="text-xl font-bold text-indigo-600">
                  {weather.main.humidity}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default Weather;