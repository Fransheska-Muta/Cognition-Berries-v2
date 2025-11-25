#!/usr/bin/env node
/**
 * seed-admin.js
 * 
 * Creates an admin user in the Users collection
 * 
 * Usage: node scripts/seed-admin.js <uid> <email> [name]
 * Example: node scripts/seed-admin.js abc123 admin@example.com "Admin User"
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'cognition-berries';

async function seedAdmin(uid, email, name = 'Admin User') {
  console.log('🌱 Seeding admin user...\n');

  if (!uid || !email) {
    console.error('❌ Error: uid and email are required');
    console.log('\nUsage: node scripts/seed-admin.js <uid> <email> [name]');
    console.log('Example: node scripts/seed-admin.js abc123 admin@example.com "Admin User"\n');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('Users');

    // Check if user already exists
    const existing = await usersCollection.findOne({ uid });

    if (existing) {
      console.log(`👤 User already exists: ${existing.email}`);
      console.log(`   Current role: ${existing.role}`);

      if (existing.role === 'admin') {
        console.log('   ✅ User is already an admin\n');
        return;
      }

      // Upgrade to admin
      console.log('   🔄 Upgrading user to admin...');
      await usersCollection.updateOne(
        { uid },
        {
          $set: {
            role: 'admin',
            updatedAt: new Date()
          }
        }
      );
      console.log('   ✅ User upgraded to admin\n');
    } else {
      // Create new admin user
      console.log(`👤 Creating new admin user: ${email}`);
      const adminUser = {
        uid,
        email,
        name,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await usersCollection.insertOne(adminUser);
      console.log('   ✅ Admin user created successfully\n');
    }

    // Display admin user info
    const admin = await usersCollection.findOne({ uid });
    console.log('📋 Admin User Details:');
    console.log(`   UID: ${admin.uid}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Created: ${admin.createdAt?.toISOString()}\n`);

    console.log('✅ Admin seeding completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Sign in with this email in your app');
    console.log('   2. Navigate to /admin or /dashboard');
    console.log('   3. Start managing your platform!\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const [uid, email, name] = args;

if (require.main === module) {
  seedAdmin(uid, email, name).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { seedAdmin };