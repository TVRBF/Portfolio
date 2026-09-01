import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// 🔥 Validate env early (prevents silent failures)
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Missing EMAIL_USER or EMAIL_PASS in .env");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔥 Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Gmail transporter failed:", error.message);
  } else {
    console.log("✅ Gmail transporter ready");
  }
});

export const sendAlertEmail = async (subject, message) => {
  try {
    console.log("📨 Sending email:", subject);

    const info = await transporter.sendMail({
      from: `API Monitor <${process.env.EMAIL_USER}>`,
      to: process.env.ALERT_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    });

    console.log("✅ EMAIL SENT SUCCESSFULLY:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ EMAIL FAILED:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);

    return false;
  }
};