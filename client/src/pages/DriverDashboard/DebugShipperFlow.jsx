// DebugShipperFlow.jsx – simple UI to test shipper API flow
import { useEffect, useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000'; // backend base URL

function DebugShipperFlow() {
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);

  const addLog = (msg) => setLog((prev) => [...prev, { type: 'info', msg }]);
  const addSuccess = (msg) => setLog((prev) => [...prev, { type: 'success', msg }]);
  const addError = (msg) => setLog((prev) => [...prev, { type: 'error', msg }]);

  useEffect(() => {
    async function runFlow() {
      try {
        // Prompt for credentials via simple window.prompt (dev only)
        const email = window.prompt('Shipper email');
        const password = window.prompt('Shipper password');
        if (!email || !password) {
          addError('✖️ Email or password not provided');
          return;
        }
        // login
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
        const token = loginRes.data.token || loginRes.data.accessToken;
        if (!token) throw new Error('No token returned');
        addSuccess('✅ Logged in');
        const authHeader = { Authorization: `Bearer ${token}` };
        // active orders
        const activeRes = await axios.get(`${BASE_URL}/orders/shipper/active`, { headers: authHeader });
        const orders = activeRes.data;
        addInfo(`✅ Active orders fetched: ${orders.length}`);
        if (orders.length === 0) {
          addInfo('⚠️ No active orders to continue flow');
          return;
        }
        const orderId = orders[0]._id;
        // accept
        await axios.patch(`${BASE_URL}/orders/${orderId}/shipper/accept`, {}, { headers: authHeader });
        addSuccess('✅ Order accepted');
        // picked up
        await axios.patch(`${BASE_URL}/orders/${orderId}/shipper/picked-up`, {}, { headers: authHeader });
        addSuccess('✅ Order picked up');
        // delivered
        await axios.patch(`${BASE_URL}/orders/${orderId}/shipper/delivered`, {}, { headers: authHeader });
        addSuccess('✅ Order delivered');
        addSuccess('🚀 Shipper flow completed successfully');
      } catch (err) {
        const msg = err.response ? err.response.data : err.message;
        addError(`❌ Error: ${msg}`);
        setError(err);
      }
    }
    runFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addInfo = (msg) => setLog((prev) => [...prev, { type: 'info', msg }]);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Debug Shipper Flow</h2>
      <div>
        {log.map((entry, idx) => (
          <p key={idx} style={{ color: entry.type === 'error' ? 'red' : entry.type === 'success' ? 'green' : 'inherit' }}>
            {entry.msg}
          </p>
        ))}
      </div>
      {error && <pre style={{ color: 'red' }}>{JSON.stringify(error, null, 2)}</pre>}
    </div>
  );
}

export default DebugShipperFlow;
