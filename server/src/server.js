import http from 'http';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket.js';
import { startOrderTimeoutJobs } from './services/orderTimeoutService.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  // Order timeout rules: remind / auto-cancel / escalate every minute (docs/order-timeouts.md)
  startOrderTimeoutJobs();

  httpServer.listen(PORT, () => {
    console.log(`Server & Socket.io running on http://localhost:${PORT}`);
  });
};

// Initialize server
startServer();
