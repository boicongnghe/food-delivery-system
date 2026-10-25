# Driver dashboard API

The driver dashboard reads a MongoDB dashboard snapshot for the authenticated
shipper. It does not fabricate fallback data or derive earnings from orders;
the project does not yet have an order model to calculate those metrics.

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/drivers/me/dashboard?period=today|week|month`
- `GET /api/drivers/me/settings`
- `PATCH /api/drivers/me/settings`
- `PATCH /api/drivers/me/password`
- `PATCH /api/drivers/me/status` with `{ "isOnline": true }`

Authentication endpoints return a JWT. Driver endpoints require
`Authorization: Bearer <jwt>`. The JWT payload must
contain an ObjectId `id` and `role: "shipper"`. A driver's token can only read
or update the dashboard record whose `userId` matches that token.

Settings let a shipper update their name, phone, avatar URL, vehicle, license
plate, and bank account details, and change their password after confirming the
current password. Bank details are stored for display/reference only; the
project does not integrate a payment provider or execute withdrawals. Full bank
account numbers are returned only from the authenticated settings endpoint and
are not included in dashboard responses.

## MongoDB document

Mongoose stores documents in the `driverdashboards` collection. The `_id` used
in `userId` must be the same ObjectId as the `id` claim in the driver's JWT.
Create a record using the `DriverDashboard` model so schema validation runs.
Each selected period should include numeric summary fields and arrays for
charts, trips, missions, reviews, badges, and hotspots. Monetary amounts are
integer VND.

Example shape (replace the placeholder ObjectId and values with real data):

```js
{
  userId: ObjectId("000000000000000000000001"),
  profile: {
    name: "Driver name",
    driverCode: "TX-0001",
    restaurant: "Restaurant name",
    shiftStart: "06:30",
    vehicle: "Motorbike model",
    licensePlate: "00A0-000.00",
    tier: "Partner tier",
    avatarUrl: ""
  },
  isOnline: false,
  periods: {
    today: {
      totalEarnings: 0,
      baseFare: 0,
      bonus: 0,
      tips: 0,
      completedTrips: 0,
      tripGoal: 0,
      walletBalance: 0,
      pendingBalance: 0,
      weeklyEarnings: 0,
      rating: 0,
      ratingCount: 0,
      consecutiveFiveStarTrips: 0,
      payoutBank: "",
      earningsByHour: [],
      forecast: [],
      trips: [],
      missions: [],
      reviews: [],
      badges: [],
      hotspots: []
    },
    week: { /* same fields as today */ },
    month: { /* same fields as today */ }
  }
}
```

Array item fields:

- `earningsByHour`: `{ hour, base, bonus, tip, surge }`
- `forecast`: `{ hour, demand }` where `demand` is from 0 to 100
- `trips`: `{ id, time, restaurant, address, distance, baseFare, bonus, tip, status, surge }`
- `missions`: `{ id, title, reward, current, target, status }`
- `reviews`: `{ id, quote, customer, stars }`
- `badges`: `{ id, icon, label, count }`
- `hotspots`: `{ id, name, district, level, demand, orders, pin, zone }`; `level` is `hot`, `med`, or `low`, and `pin` uses percentage `top`/`left` strings when shown on the map.

Configure Atlas using the connection string from **Connect → Drivers** in
`server/.env` as `MONGO_URI`. The Atlas console URL is not a connection string.
Do not commit or share `.env` credentials. Set the client's `VITE_API_URL` to
the API base URL, for example `http://localhost:5000/api`.

Dashboard routes return `401` until a valid shipper JWT is provided. If an
authenticated shipper does not yet have a dashboard snapshot, the first
dashboard or settings request creates an empty snapshot. Values remain zero or
empty until operational data is added.

## Temporary demo reviews

For local/demo use, `npm run seed:driver-demo` fills the selected shipper's
profile, earnings, wallet, trips, missions, reviews, badges, chart, forecast,
and hotspots for today, week, and month. It targets
`taixe@fooddelivery.vn`; if that account does not exist and there is exactly one
shipper account, it targets that account instead. To choose a specific shipper,
set `DRIVER_DEMO_EMAIL` in `server/.env`. The script refuses to overwrite a
dashboard with existing non-demo operational data.

Set `NODE_ENV=development`; the script refuses to run unless this is explicitly
configured. It does not create or reset user accounts.

Run it from `server/` after configuring `MONGO_URI`:

```bash
npm run seed:driver-demo
```

The dashboard record and seeded reviews/badges are marked as demo data, and the
dashboard shows a notice. All seeded metrics and records are illustrative, not
real delivery operations or customer-submitted reviews.
