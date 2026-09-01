import React from "react";
import { motion } from "framer-motion";

const projects = [
  {
    title: "Weather App",
    description: "Interactive weather app with API integration.",
    link: "/",
  },
  {
    title: "Portfolio Website",
    description: "Responsive portfolio showcasing resume and contact info.",
    link: "/portfolio",
  },
];

function Portfolio() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 px-6 py-14">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto text-center mb-12">
        <h1 className="text-5xl font-extrabold text-gray-900">
          My Projects
        </h1>
        <p className="text-gray-600 mt-3">
          A collection of things I’ve built and experimented with.
        </p>
      </div>

      {/* PROJECT GRID */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        {projects.map((project, index) => (
          <motion.div
            key={index}
            className="group relative bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
          >
            {/* ACCENT BAR */}
            <div className="absolute top-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:w-full transition-all duration-300 rounded-t-2xl"></div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {project.title}
            </h2>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {project.description}
            </p>

            <a
              href={project.link}
              className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              View Project →
            </a>
          </motion.div>
        ))}
      </div>

      {/* RESUME SECTION */}
      <div className="max-w-5xl mx-auto mt-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          <div>
            <h2 className="text-3xl font-bold mb-2">Resume</h2>
            <p className="text-white/80">
              Download my resume to learn more about my skills and experience.
            </p>
          </div>

          <a
            href="/resume.pdf"
            download
            className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition shadow-md"
          >
            Download Resume
          </a>
        </div>
      </div>

    </div>
  );
}

export default Portfolio;