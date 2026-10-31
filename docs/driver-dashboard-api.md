# Driver dashboard API

The driver dashboard reads a MongoDB dashboard snapshot for the authenticated
shipper. It does not fabricate fallback data or derive earnings from orders;
earnings and performance metrics must be supplied in that snapshot.

Both `/shipper` and `/shipper/dashboard` use the API-backed earnings dashboard.
The profile header supports avatar uploads through the authenticated Cloudinary
upload endpoint.

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/drivers/me/dashboard?period=today|week|month`
- `GET /api/drivers/me/settings`
- `PATCH /api/drivers/me/settings`
- `PATCH /api/drivers/me/password`
- `PATCH /api/drivers/me/status` with `{ "isOnline": true }`
- `GET /api/orders/available-for-pickup?page=1&limit=10`
- `GET /api/orders/available-for-pickup/:id`
- `GET /api/orders/shipper/active`
- `PATCH /api/orders/:id/shipper/accept`
- `PATCH /api/orders/:id/shipper/cancel-acceptance`
- `PATCH /api/orders/:id/shipper/picked-up`
- `PATCH /api/orders/:id/shipper/delivered`
- `POST /api/orders/:id/shipper/customer-wait`
- `POST /api/orders/:id/shipper/unanswered-call`
- `POST /api/orders/:id/delivery-issues`
- `POST /api/uploads/images?folder=avatars` (multipart field `image`)

Authentication endpoints return a JWT. Driver endpoints require
`Authorization: Bearer <jwt>`. The JWT payload must
contain an ObjectId `id` and `role: "shipper"`. A driver's token can only read
or update the dashboard record whose `userId` matches that token.

Settings let a shipper update their name, phone, avatar URL, and bank account
details, and change their password after confirming the current password.
Verified identity and vehicle information are read-only after registration; the
settings endpoint returns only a masked citizen ID and the submitted vehicle
details. Bank details are stored for display/reference only; the project does
not integrate a payment provider or execute withdrawals. Full bank account
numbers are returned only from the authenticated settings endpoint and are not
included in dashboard responses.

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

The shipper order tab refreshes available and active orders every five minutes.
Available orders are not filtered by location. The application does not request
or store GPS coordinates, calculate route distance, or enforce distance-based
pickup/delivery confirmation. Estimated shipper payout uses the order shipping
fee because the project has no separate surge, tip, or commission ledger.

An accepted order remains in `ready_for_pickup` until the shipper confirms
pickup, then transitions to `delivering` and `delivered`. Acceptance can be
returned to the open pool within three minutes before pickup. A shipper may only
have one active order. Delivery confirmation credits the shipping fee to the
shipper's pending dashboard balance in a MongoDB transaction.

Issue reports are accepted only for active assigned orders and appear in the
existing open Admin delivery-issue queue. For `customer_unreachable` and
`customer_refused`, the server tracks an eight-minute wait start and at least
two shipper-recorded unanswered calls before accepting the report. The app does
not have phone-system integration, so call attempts are recorded by the shipper
after placing them. Evidence images must be uploaded to the `delivery-issues`
Cloudinary folder before submission.

## Temporary demo reviews

To log in to the API-backed driver dashboard, configure `NODE_ENV=development`
and `MONGO_URI` in `server/.env`, then run these commands from `server/`:

```bash
npm run seed:driver-account
npm run seed:driver-demo
```

The account seed creates `taixe@fooddelivery.vn` with password `password123`
and an approved demo shipper profile only when the account does not exist. It
does not modify an existing account or password. The demo login button then
authenticates through the backend and receives a real JWT for dashboard API
requests.

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

## Demo delivery orders

To add three ready-for-pickup orders to the shipper order pool, run this from
`server/`:

```bash
npm run seed:shipper-orders
```

The seed requires `NODE_ENV=development` and `MONGO_URI`. It creates an
approved demo restaurant and demo customer if needed, then creates
`DEMO-SHIPPER-001` through `DEMO-SHIPPER-003` once. The seed never deletes or
changes existing orders. The examples include both COD and prepaid orders and
can be used to test accepting, picking up, delivering, and reporting an issue.
