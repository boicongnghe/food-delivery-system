import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import {
  isBcryptHash,
  migratePlaintextPasswords,
} from '../scripts/hashPlaintextPasswords.js';

test('User.comparePassword accepts plaintext matching bcrypt hash and rejects raw stored hash or raw plaintext', async () => {
  const hash = await bcrypt.hash('Secret123!', 10);
  const hashedUser = new User({
    fullName: 'Hashed User',
    email: 'hashed@example.com',
    password: hash,
  });

  assert.equal(await hashedUser.comparePassword('Secret123!'), true);
  // Critical fix: pasting exact DB hash value must NEVER authenticate
  assert.equal(await hashedUser.comparePassword(hash), false);
  assert.equal(await hashedUser.comparePassword('wrong-password'), false);
  assert.equal(await hashedUser.comparePassword(''), false);
  assert.equal(await hashedUser.comparePassword(null), false);

  // Even if DB still had plaintext before migration, direct string equality is rejected
  const legacyPlaintextUser = new User({
    fullName: 'Legacy User',
    email: 'legacy@example.com',
    password: 'legacy-plain-password',
  });
  assert.equal(await legacyPlaintextUser.comparePassword('legacy-plain-password'), false);

  // OAuth user without password
  const oauthUser = new User({
    fullName: 'OAuth User',
    email: 'oauth@example.com',
    authProvider: 'google',
    googleId: 'google-123',
  });
  assert.equal(await oauthUser.comparePassword('anything'), false);
});

test('isBcryptHash distinguishes valid bcrypt hashes from plaintext passwords', async () => {
  const hash = await bcrypt.hash('password123', 10);
  assert.equal(isBcryptHash(hash), true);
  assert.equal(isBcryptHash('$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234'), true);
  assert.equal(isBcryptHash('$2a$10$tooshort'), false);
  assert.equal(isBcryptHash('password123'), false);
  assert.equal(isBcryptHash(''), false);
  assert.equal(isBcryptHash(null), false);
});

test('migratePlaintextPasswords hashes only plaintext records and leaves existing bcrypt hashes untouched', async () => {
  const existingHash = await bcrypt.hash('AlreadyHashed1!', 10);
  const docs = [
    { _id: 'u1', email: 'plain@example.com', password: 'password123' },
    { _id: 'u2', email: 'hashed@example.com', password: existingHash },
    { _id: 'u3', email: 'short@example.com', password: 'abc' },
  ];

  const updates = [];
  const fakeCollection = {
    find: () => ({
      toArray: async () => docs.map((d) => ({ ...d })),
    }),
    updateOne: async (filter, update) => {
      const target = docs.find(
        (d) => d._id === filter._id && d.password === filter.password,
      );
      if (!target) return { modifiedCount: 0 };
      target.password = update.$set.password;
      updates.push({ id: target._id, newHash: target.password });
      return { modifiedCount: 1 };
    },
  };

  // Dry run does not mutate DB
  const drySummary = await migratePlaintextPasswords(fakeCollection, { apply: false });
  assert.deepEqual(drySummary, {
    totalWithPassword: 3,
    alreadyHashed: 1,
    plaintextFound: 2,
    migrated: 0,
  });
  assert.equal(updates.length, 0);

  // Apply mode hashes only the 2 plaintext entries
  const applySummary = await migratePlaintextPasswords(fakeCollection, {
    apply: true,
    saltRounds: 4,
  });
  assert.deepEqual(applySummary, {
    totalWithPassword: 3,
    alreadyHashed: 1,
    plaintextFound: 2,
    migrated: 2,
  });
  assert.equal(updates.length, 2);
  assert.equal(isBcryptHash(docs[0].password), true);
  assert.equal(await bcrypt.compare('password123', docs[0].password), true);
  assert.equal(docs[1].password, existingHash);
  assert.equal(isBcryptHash(docs[2].password), true);
  assert.equal(await bcrypt.compare('abc', docs[2].password), true);

  // Re-running is idempotent: 0 plaintext left
  const rerunSummary = await migratePlaintextPasswords(fakeCollection, { apply: true });
  assert.deepEqual(rerunSummary, {
    totalWithPassword: 3,
    alreadyHashed: 3,
    plaintextFound: 0,
    migrated: 0,
  });
});
