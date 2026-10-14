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

const connectDB = async () => {
  console.log('[MongoDB] Connecting...');

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(
      `${GREEN}[MongoDB] Connected successfully - host: ${conn.connection.host}, database: ${conn.connection.name}${RESET}`,
    );
    registerConnectionEvents();
  } catch (error) {
    console.error(`${RED}[MongoDB] Connection failed: ${error.message}${RESET}`);
    console.error(`${YELLOW}[MongoDB] Hint: ${getErrorHint(error)}${RESET}`);
    process.exit(1);
  }
};

export default connectDB;
