// Migrates legacy embedded addresses from users.addresses[] into the standalone collection 'addresses'.
// Usage (from server/):
//   npm run migrate:addresses            -> DRY RUN: only reports what would be migrated
//   npm run migrate:addresses -- --apply -> writes new addresses and unsets users.addresses
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const apply = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`[Migrate Addresses] Running on database "${mongoose.connection.name}" (${apply ? 'APPLY' : 'DRY RUN'})`);

  const users = await db.collection('users').find({ 'addresses.0': { $exists: true } }).toArray();
  console.log(`Found ${users.length} user(s) with embedded addresses.`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    const embeddedAddrs = Array.isArray(user.addresses) ? user.addresses : [];
    for (const addr of embeddedAddrs) {
      const line = (addr.street || addr.addressLine || '').trim();
      if (!line) continue;

      // Check if already in addresses collection
      const exists = await db.collection('addresses').findOne({
        user: user._id,
        $or: [
          { addressLine: line },
          { _id: addr._id }
        ]
      });

      if (exists) {
        skippedCount++;
        continue;
      }

      if (apply) {
        await db.collection('addresses').insertOne({
          user: user._id,
          title: (addr.title || 'Nhà riêng').trim(),
          recipientName: (addr.receiverName || addr.recipientName || user.fullName || 'Khách hàng').trim(),
          phone: (addr.receiverPhone || addr.phone || user.phone || '').trim(),
          addressLine: line,
          location: addr.location || null,
          isDefault: Boolean(addr.isDefault),
          note: addr.note || '',
          createdAt: addr.createdAt || new Date(),
          updatedAt: addr.updatedAt || new Date(),
        });
      }
      insertedCount++;
    }
  }

  console.log(`Summary: ${insertedCount} address(es) to insert, ${skippedCount} already existed.`);

  if (apply) {
    const unsetResult = await db.collection('users').updateMany(
      { addresses: { $exists: true } },
      { $unset: { addresses: '' } }
    );
    console.log(`Unset 'addresses' field from ${unsetResult.modifiedCount} user document(s).`);
  } else {
    console.log('DRY RUN complete. Re-run with -- --apply to commit changes.');
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('[Migrate Addresses] Error:', err);
  process.exit(1);
});
