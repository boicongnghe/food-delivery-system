import mongoose from 'mongoose';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Map common connection errors to a hint so new members can fix setup quickly
const getErrorHint = (error) => {
  const message = error.message || '';

  if (!process.env.MONGO_URI) {
    return 'MONGO_URI is missing. Copy server/.env.example to server/.env and fill it in.';
  }
  if (/authentication failed|bad auth/i.test(message)) {
    return 'Wrong username or password in MONGO_URI.';
  }
  if (/whitelist|IP address|Could not connect to any servers/i.test(message)) {
    return 'Your IP may not be allowed. Add it in Atlas > Security > Network Access.';
  }
  if (/ECONNREFUSED/i.test(message)) {
    return 'Local MongoDB is not running. Start the "MongoDB Server" service.';
  }
  if (/ENOTFOUND|querySrv/i.test(message)) {
    return 'Cannot resolve the database host. Check the cluster address and your internet connection.';
  }
  return 'Check MONGO_URI in server/.env.';
};

const registerConnectionEvents = () => {
  mongoose.connection.on('disconnected', () => {
    console.warn(`${YELLOW}[MongoDB] Disconnected${RESET}`);
  });
  mongoose.connection.on('reconnected', () => {
    console.log(`${GREEN}[MongoDB] Reconnected${RESET}`);
  });
  mongoose.connection.on('error', (error) => {
    console.error(`${RED}[MongoDB] Error: ${error.message}${RESET}`);
  });
};

const connectDB = async (retries = 5, delay = 2500) => {
  for (let i = 1; i <= retries; i++) {
    console.log(`[MongoDB] Connecting (attempt ${i}/${retries})...`);
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
      });
      console.log(
        `${GREEN}[MongoDB] Connected successfully - host: ${conn.connection.host}, database: ${conn.connection.name}${RESET}`,
      );
      registerConnectionEvents();
      return conn;
    } catch (error) {
      console.error(`${RED}[MongoDB] Connection attempt ${i} failed: ${error.message}${RESET}`);
      if (i === retries) {
        console.error(`${YELLOW}[MongoDB] Hint: ${getErrorHint(error)}${RESET}`);
        process.exit(1);
      }
      console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
