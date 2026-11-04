// Removes fields that were dropped from the Mongoose models (refactor/db-cleanup).
// Usage (from server/):
//   npm run migrate:drop-unused-fields            -> DRY RUN: only counts the documents that still have them
//   npm run migrate:drop-unused-fields -- --apply -> $unset the fields
// Safe to run again: documents without the fields are not touched.
//
// Uses the raw collections on purpose: the models no longer know these paths, so Mongoose would strip them.
import 'dotenv/config';
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');

const DROPPED_FIELDS = [
  { collection: 'notifications', field: 'sender', reason: 'never set by any code path' },
  { collection: 'restaurants', field: 'image', reason: 'storefront uses coverImage / logo' },
  { collection: 'restaurants', field: 'isVerified', reason: 'status === "approved" is the source of truth' },
  { collection: 'shippers', field: 'isOnline', reason: 'online state lives in driverdashboards.isOnline' },
  { collection: 'users', field: 'deliveryAddress', reason: 'never read; addresses[] is the address book' },
  { collection: 'orders', field: 'delivery.distanceKm', reason: 'duplicate of orders.distanceKm' },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} on database "${mongoose.connection.name}"`);

  // Restaurants whose only picture is the dropped field fall back to the default storefront image
  const imageOnly = await db.collection('restaurants').countDocuments({
    image: { $nin: ['', null] },
    coverImage: { $in: ['', null] },
    logo: { $in: ['', null] },
  });
  if (imageOnly > 0) {
    console.log(`Note: ${imageOnly} restaurant(s) only have "image" (owner avatar copy); they will show the default picture until the owner uploads a cover or logo.`);
  }

  for (const { collection, field, reason } of DROPPED_FIELDS) {
    const filter = { [field]: { $exists: true } };
    const count = await db.collection(collection).countDocuments(filter);
    let note = '';
    if (apply && count > 0) {
      const result = await db.collection(collection).updateMany(filter, { $unset: { [field]: '' } });
      note = ` -> removed from ${result.modifiedCount}`;
    }
    console.log(`${collection}.${field}: ${count} document(s)${note}  (${reason})`);
  }

  if (!apply) console.log('Nothing written. Run again with -- --apply to remove the fields.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
