# API Monitoring & Alert System

A full-stack API monitoring platform built using MERN stack.

## Features

- API uptime monitoring
- Response time tracking
- Downtime detection
- Email alert notifications
- Cron job scheduling
- Performance analytics
- Dashboard reporting
- Historical logs

## Tech Stack

Frontend:
- React
- Tailwind CSS
- Recharts

Backend:
- Node.js
- Express.js
- MongoDB
- Node Cron
- Nodemailer

## Installation

### Frontend

```bash
cd frontend
npm install
npm run dev

Backend
cd backend
npm install
npm run dev
Environment Variables

Create .env inside backend:

PORT=5000
MONGO_URI=your_mongodb_uri
EMAIL_USER=your_email
EMAIL_PASS=your_password
ALERT_EMAIL=your_email
CLIENT_URL=http://localhost:5173

Project Highlights
Automated API monitoring system
Real-time analytics dashboard
Production-ready backend architecture
Responsive frontend UI
Email-based incident alerts