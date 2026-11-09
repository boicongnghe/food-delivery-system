# Driver dashboard API

The driver dashboard reads a MongoDB dashboard snapshot for the authenticated
shipper. Completing a delivery credits its shipping fee to the shipper's
virtual wallet and updates trip earnings. Other performance metrics are read
from the dashboard snapshot. The displayed shipper rating and rating count come
from current visible customer reviews.

Both `/shipper` and `/shipper/dashboard` use the API-backed earnings dashboard.
The profile header supports avatar uploads through the authenticated Cloudinary
upload endpoint.

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/drivers/me/dashboard?period=today|week|month`
- `POST /api/drivers/me/withdrawals` with `{ "amount": 10000 }`
- `GET /api/drivers/me/settings`
- `PATCH /api/drivers/me/settings`
- `PATCH /api/drivers/me/password`
- `PATCH /api/drivers/me/status` with `{ "isOnline": true }` (only approved
  shipper profiles can go online; admin status changes set them offline)
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

Settings let a shipper update their name, phone and avatar URL, and change
their password after confirming the current password. Bank accounts are managed
in the wallet tab (`/api/wallet/payout-accounts`, shared with customers): up to
5 accounts, one default; a withdrawal goes to the default account and keeps a
copy of it (`shipperwithdrawals.bankAccount`). A bank entered in the old
settings form is moved into that list once, as the default account.
Verified identity and vehicle information are read-only after registration; the
settings endpoint returns only a masked citizen ID and the submitted vehicle
details. Completed delivery fees are credited to the shipper's virtual wallet.
Withdrawal requests must be at least 10,000 VND, at most 2,000,000 VND each,
and at most 5,000,000 VND per Vietnam calendar day. A request deducts the
virtual balance and is stored in MongoDB; it does not transfer money to a bank.
Dashboard and wallet responses only show masked account numbers.

## MongoDB document

Mongoose stores documents in the `driverdashboards` collection. The `_id` used
in `userId` must be the same ObjectId as the `id` claim in the driver's JWT.
Create a record using the `DriverDashboard` model so schema validation runs.
Each selected period should include numeric summary fields and arrays for
charts, trips, reviews, and badges. Monetary amounts are
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
  walletBalance: 0,
  periods: {
    today: {
      totalEarnings: 0,
      baseFare: 0,
      bonus: 0,
      completedTrips: 0,
      tripGoal: 0,
      pendingBalance: 0,
      weeklyEarnings: 0,
      rating: 0,
      ratingCount: 0,
      consecutiveFiveStarTrips: 0,
      payoutBank: "",
      earningsByHour: [],
      forecast: [],
      trips: [],
      reviews: [],
      badges: []
    },
    week: { /* same fields as today */ },
    month: { /* same fields as today */ }
  }
}
```

Array item fields:

- `earningsByHour`: `{ hour, base, surge }`
- `forecast`: `{ hour, demand }` where `demand` is from 0 to 100
- `trips`: `{ id, time, restaurant, address, distance, baseFare, status, surge }`
- `reviews`: `{ id, quote, customer, stars }`
- `badges`: `{ id, icon, label, count }`

Configure Atlas using the connection string from **Connect → Drivers** in
`server/.env` as `MONGO_URI`. The Atlas console URL is not a connection string.
Do not commit or share `.env` credentials. Set the client's `VITE_API_URL` to
the API base URL, for example `http://localhost:5000/api`.

Dashboard routes return `401` until a valid shipper JWT is provided. If an
authenticated shipper does not yet have a dashboard snapshot, the first
dashboard or settings request creates an empty snapshot. Values remain zero or
empty until operational data is added.

The shipper order tab refreshes available and active orders every five minutes,
and every 15 seconds while the shipper's order is still being cooked.
Available orders are not filtered by location. The application does not request
or store GPS coordinates, calculate route distance, or enforce distance-based
pickup/delivery confirmation. Shipper earnings include the order shipping fee and applicable bonuses;
tips are excluded. Delivery completion currently credits the order shipping fee to the wallet.

The kitchen cooks only after a shipper accepts (docs/order-flow.md). The open
pool lists `confirmed` orders (accepted by the restaurant, not cooked yet) and
orders returned to the pool. Accepting a `confirmed` order moves it to
`preparing` and starts the kitchen; pickup can be confirmed once the restaurant
marks it `ready_for_pickup`, then it transitions to `delivering` and
`delivered`. Acceptance can be returned to the open pool within three minutes
before pickup; the kitchen keeps its status. A shipper may only
have one active order. Delivery confirmation credits the shipping fee to the
shipper's pending dashboard balance in a MongoDB transaction, marks a COD order
as paid, and frees the shipper for a new order. When the customer confirms
receipt first (`PATCH /api/orders/:id/receive`), the same transaction runs, so
the shipper is still credited and freed; the later shipper confirmation then
returns `409`.

Issue reports are accepted only for active assigned orders and appear in the
existing open Admin delivery-issue queue. For `customer_unreachable` and
`customer_refused`, the server tracks an eight-minute wait start and at least
two shipper-recorded unanswered calls before accepting the report. The app does
not have phone-system integration, so call attempts are recorded by the shipper
after placing them. Evidence images must be uploaded to the `delivery-issues`
Cloudinary folder before submission.

## Driver dashboard data

The driver dashboard reads and writes its data in MongoDB configured by
`MONGO_URI` in `server/.env`. Earnings are recorded when a real delivery is
completed. Demo dashboard snapshots already present in MongoDB are retained,
but are not returned by the API; the first real delivery clears those snapshots
before recording the real payout.

To create a local demo shipper account for API testing, configure
`NODE_ENV=development` and `MONGO_URI`, then run this from `server/`:

```bash
npm run seed:driver-account
```

This only creates the demo account when it does not already exist. It does not
seed dashboard earnings or trips.

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
