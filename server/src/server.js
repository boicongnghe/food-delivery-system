import http from 'http';
import mongoose from 'mongoose';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket.js';
import { startHearingReminderJobs } from './services/hearingService.js';
import { startOrderTimeoutJobs } from './services/orderTimeoutService.js';

const PORT = process.env.PORT || 5000;
let httpServer;

// Global process error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception thrown:', err);
  process.exit(1);
});

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n[Process] Received ${signal}. Shutting down gracefully...`);
  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
      console.log('[Process] HTTP & Socket.io server closed.');
    }
    await mongoose.connection.close(false);
    console.log('[Process] MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('[Process] Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const startServer = async () => {
  await connectDB();
  httpServer = http.createServer(app);
  initSocket(httpServer);
  // Order timeout rules: remind / auto-cancel / escalate every minute (docs/order-timeouts.md)
  startOrderTimeoutJobs();
  // Hearings (UC42, UC45): remind the parties who have not written before the deadline
  startHearingReminderJobs();

  httpServer.listen(PORT, () => {
    console.log(`Server & Socket.io running on http://localhost:${PORT}`);
  });
};

// Initialize server with error handling
startServer().catch((err) => {
  console.error('[Process] Failed to start server:', err);
  process.exit(1);
});
