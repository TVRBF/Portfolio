import React, { useRef } from "react";
import emailjs from "emailjs-com";
import { motion } from "framer-motion";

function Contact() {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "service_qx4rsg8",
        "template_03dbj7k",
        form.current,
        "HNLaLZt3Wd4A8Ftce"
      )
      .then(
        () => alert("Message sent successfully!"),
        () => alert("Failed to send message.")
      );
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gray-50">
      
      {/* BACKGROUND BLOBS */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-120px] left-[-120px] w-96 h-96 bg-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-120px] right-[-120px] w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        
        {/* LEFT SIDE */}
        <div>
          <h2 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Let’s build something great
          </h2>

          <p className="text-gray-600 text-lg mb-6 leading-relaxed">
            Got an idea or project in mind? Drop a message and I’ll get back to
            you soon. I love working on interesting things 🚀
          </p>

          <div className="space-y-2 text-sm text-gray-500">
            <p>📍 India</p>
            <p>⚡ Fast responses within 24 hours</p>
          </div>
        </div>

        {/* FORM CARD */}
        <form
          ref={form}
          onSubmit={sendEmail}
          className="bg-white/70 backdrop-blur-lg shadow-xl rounded-2xl p-8 space-y-6 border border-gray-200"
        >
          <div className="space-y-4">
            <input
              type="text"
              name="user_name"
              placeholder="Your Name"
              required
              className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />

            <input
              type="email"
              name="user_email"
              placeholder="Your Email"
              required
              className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />

            <textarea
              name="message"
              placeholder="Your Message"
              required
              className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition active:scale-95 shadow-md hover:shadow-lg"
          >
            Send Message ✉️
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default Contact;