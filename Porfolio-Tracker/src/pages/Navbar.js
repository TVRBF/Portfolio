import React from "react";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* Logo */}
        <h1 className="font-extrabold text-xl tracking-tight text-gray-900">
          My Portfolio
        </h1>

        {/* Links */}
        <div className="flex gap-8 text-gray-700 font-medium">
          <Link
            to="/"
            className="relative group transition"
          >
            Weather
            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
          </Link>

          <Link
            to="/portfolio"
            className="relative group transition"
          >
            Portfolio
            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
          </Link>

          <Link
            to="/contact"
            className="relative group transition"
          >
            Contact
            <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;