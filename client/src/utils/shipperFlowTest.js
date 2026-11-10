// Node CLI (not bundled in the app): checks the shipper API flow against a running server.
// Usage (from the repo root, Node 20+):
//   API_URL=http://localhost:5000/api node client/src/utils/shipperFlowTest.js
// Asks for a shipper's email and password, then: log in -> go online -> accept the oldest order of the
// pickup pool -> pick up -> deliver. It changes real data of the database the server is connected to.
import { createInterface } from 'node:readline/promises'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { stdin, stdout } from 'node:process'

const API_URL = process.env.API_URL

const request = async (method, path, token, body) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${json.message || ''}`)
  return json.data
}

const uploadDeliveryProof = async (filePath, token) => {
  const mimeType = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }[extname(filePath).toLowerCase()]
  if (!mimeType) throw new Error('Ảnh chứng minh phải là JPG, PNG hoặc WEBP')

  const formData = new FormData()
  formData.append('image', new Blob([await readFile(filePath)], { type: mimeType }), basename(filePath))
  const response = await fetch(`${API_URL}/uploads/images?folder=delivery-proofs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`POST /uploads/images -> ${response.status} ${json.message || ''}`)
  return json.data.url
}

const main = async () => {
  if (!API_URL) throw new Error('Set API_URL, e.g. API_URL=http://localhost:5000/api')

  // Read line by line so it works when typed and when piped (rl.question drops lines that arrive early)
  const rl = createInterface({ input: stdin })
  const lines = rl[Symbol.asyncIterator]()
  const ask = async (question) => {
    stdout.write(question)
    const { value } = await lines.next()
    return (value || '').trim()
  }
  const email = await ask('Shipper email: ')
  const password = await ask('Shipper password: ')
  const proofPath = await ask('Delivery proof image path: ')
  rl.close()

  if (!proofPath) throw new Error('Delivery proof image path is required')

  const { token } = await request('POST', '/auth/login', null, { email, password })
  stdout.write('OK  logged in\n')
  await request('PATCH', '/drivers/me/status', token, { isOnline: true })
  stdout.write('OK  online\n')

  const active = await request('GET', '/orders/shipper/active', token)
  if (active.length > 0) throw new Error(`Finish the order you hold first: ${active[0].orderCode}`)

  const { items } = await request('GET', '/orders/available-for-pickup?page=1&limit=1', token)
  if (items.length === 0) {
    stdout.write('--  no order waiting for a shipper (run "npm run seed:shipper-orders" in server/)\n')
    return
  }
  const order = items[0]
  await request('PATCH', `/orders/${order._id}/shipper/accept`, token)
  stdout.write(`OK  accepted ${order.orderCode}\n`)
  await request('PATCH', `/orders/${order._id}/shipper/picked-up`, token)
  stdout.write('OK  picked up\n')
  const deliveryProofUrl = await uploadDeliveryProof(proofPath, token)
  const { payout } = await request('PATCH', `/orders/${order._id}/shipper/delivered`, token, { deliveryProofUrl })
  stdout.write(`OK  delivered, ${payout} VND credited\n`)
}

main().catch((error) => {
  process.stderr.write(`FAIL ${error.message}\n`)
  process.exitCode = 1
})
