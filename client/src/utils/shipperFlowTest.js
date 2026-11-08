// shipperFlowTest.js – Node script to verify shipper API flow
// Run with: node src/utils/shipperFlowTest.js
// Prompts for shipper email & password, obtains JWT, then calls key shipper endpoints.

const readline = require('readline');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000'; // backend base URL

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  try {
    const email = await askQuestion('Shipper email: ');
    const password = await askQuestion('Shipper password: ');
    // login
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const token = loginRes.data.token || loginRes.data.accessToken;
    if (!token) throw new Error('No token returned from login');
    console.log('✅ Logged in, token received');
    const authHeader = { Authorization: `Bearer ${token}` };

    // 1. Get active orders
    const activeRes = await axios.get(`${BASE_URL}/orders/shipper/active`, { headers: authHeader });
    console.log(`✅ Active orders: ${activeRes.data.length} order(s)`);
    if (activeRes.data.length === 0) {
      console.log('⚠️ No active orders to continue the flow.');
      return;
    }
    const orderId = activeRes.data[0]._id;
    // 2. Accept order
    await axios.patch(`${BASE_URL}/orders/${orderId}/shipper/accept`, {}, { headers: authHeader });
    console.log('✅ Order accepted');
    // 3. Picked up
    await axios.patch(`${BASE_URL}/orders/${orderId}/shipper/picked-up`, {}, { headers: authHeader });
    console.log('✅ Order picked up');
    // 4. Delivered
    await axios.patch(`${BASE_URL}/orders/${orderId}/shipper/delivered`, {}, { headers: authHeader });
    console.log('✅ Order delivered');
    console.log('🚀 All shipper flow endpoints succeeded');
  } catch (err) {
    console.error('❌ Error during shipper flow verification:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

main();
