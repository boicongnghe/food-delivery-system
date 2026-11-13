// Hashes any legacy plaintext passwords stored in `users.password` with bcrypt.
// Usage (from server/):
//   npm run migrate:hash-passwords            -> DRY RUN: counts plaintext passwords without writing
//   npm run migrate:hash-passwords -- --apply -> hashes plaintext passwords in place
// Safe to re-run: valid bcrypt hashes ($2a$/$2b$/$2y$) are never hashed twice.
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const DEFAULT_SALT_ROUNDS = 10;

export const isBcryptHash = (value) =>
  typeof value === 'string' && BCRYPT_HASH_REGEX.test(value);

export const migratePlaintextPasswords = async (
  usersCollection,
  { apply = false, saltRounds = DEFAULT_SALT_ROUNDS } = {},
) => {
  const users = await usersCollection
    .find(
      { password: { $type: 'string', $ne: '' } },
      { projection: { _id: 1, email: 1, password: 1 } },
    )
    .toArray();

  let alreadyHashed = 0;
  let plaintextFound = 0;
  let migrated = 0;

  for (const user of users) {
    if (isBcryptHash(user.password)) {
      alreadyHashed += 1;
      continue;
    }

    plaintextFound += 1;
    if (!apply) {
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    const result = await usersCollection.updateOne(
      { _id: user._id, password: user.password },
      { $set: { password: hashedPassword } },
    );
    migrated += result?.modifiedCount || 0;
  }

  return {
    totalWithPassword: users.length,
    alreadyHashed,
    plaintextFound,
    migrated,
  };
};

const run = async () => {
  const apply = process.argv.includes('--apply');
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI environment variable');
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const db = mongoose.connection.db;
    console.log(`${apply ? 'APPLY' : 'DRY RUN'} on database "${mongoose.connection.name}"`);

    const summary = await migratePlaintextPasswords(db.collection('users'), { apply });
    console.log(
      `Scanned ${summary.totalWithPassword} user(s): ${summary.alreadyHashed} already bcrypt-hashed, ${summary.plaintextFound} plaintext found`
        + (apply ? `, ${summary.migrated} updated.` : '.'),
    );

    if (!apply && summary.plaintextFound > 0) {
      console.log('Nothing written. Run again with -- --apply to hash plaintext passwords.');
    }
  } finally {
    await mongoose.disconnect();
  }
};

const isCliEntry =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntry) {
  run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

