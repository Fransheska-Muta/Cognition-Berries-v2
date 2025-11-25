#!/usr/bin/env node
/**
 * migrate-image-paths-to-docs.js
 * 
 * Migrates existing course image paths to MongoDB images collection
 * Converts simple path strings to ObjectId references
 * 
 * Usage: node scripts/migrate-image-paths-to-docs.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'cognition-berries';

async function migrate() {
  console.log('🔄 Starting image migration...\n');

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const coursesCollection = db.collection('material-courses');
    const imagesCollection = db.collection('images');

    // Find all courses with image paths (not ObjectIds)
    const courses = await coursesCollection.find({
      image: { $exists: true, $ne: null, $ne: '' }
    }).toArray();

    console.log(`📊 Found ${courses.length} courses with image fields\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const course of courses) {
      const imageField = course.image;

      // Skip if already an ObjectId
      if (ObjectId.isValid(imageField) && imageField.length === 24) {
        console.log(`⏭️  Skipped: ${course.title} (already has ObjectId)`);
        skippedCount++;
        continue;
      }

      // It's a path string - migrate it
      try {
        console.log(`🔄 Migrating: ${course.title}`);
        console.log(`   Old path: ${imageField}`);

        let imageData = null;
        let mimeType = 'image/jpeg';
        let filename = path.basename(imageField);

        // Try to read the actual file if it exists locally
        const possiblePaths = [
          path.join(process.cwd(), imageField),
          path.join(process.cwd(), 'uploads', filename),
          path.join(process.cwd(), 'public', imageField)
        ];

        for (const filePath of possiblePaths) {
          try {
            const fileBuffer = await fs.readFile(filePath);
            const base64 = fileBuffer.toString('base64');

            // Detect MIME type from extension
            const ext = path.extname(filename).toLowerCase();
            const mimeMap = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp'
            };
            mimeType = mimeMap[ext] || 'image/jpeg';

            imageData = `data:${mimeType};base64,${base64}`;
            console.log(`   ✓ Found file at: ${filePath}`);
            break;
          } catch (err) {
            // File not found at this path, try next
            continue;
          }
        }

        // Create image document
        const imageDoc = {
          filename: filename,
          mimeType: mimeType,
          size: imageData ? Buffer.from(imageData.split(',')[1], 'base64').length : 0,
          data: imageData || null,
          url: imageField, // Keep original path as reference
          type: 'course_image',
          courseId: course._id.toString(),
          migratedAt: new Date(),
          migratedFrom: 'legacy_path'
        };

        if (!imageData) {
          console.log(`   ⚠️  File not found locally, storing path only`);
        }

        const result = await imagesCollection.insertOne(imageDoc);
        const newImageId = result.insertedId.toString();

        // Update course document
        await coursesCollection.updateOne(
          { _id: course._id },
          {
            $set: {
              image: newImageId,
              imageUrl: `/api/images/${newImageId}`,
              imageType: 'base64',
              legacyImagePath: imageField, // Keep old path for reference
              migratedAt: new Date()
            }
          }
        );

        console.log(`   ✅ Migrated to ObjectId: ${newImageId}\n`);
        migratedCount++;

      } catch (err) {
        console.error(`   ❌ Error migrating ${course.title}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total processed: ${courses.length}\n`);

    // Verify migration
    console.log('🔍 Verifying migration...');
    const coursesWithImages = await coursesCollection.aggregate([
      {
        $match: {
          image: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $addFields: {
          imageObjectId: {
            $cond: {
              if: { $regexMatch: { input: "$image", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$image" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'images',
          localField: 'imageObjectId',
          foreignField: '_id',
          as: 'imageData'
        }
      },
      {
        $project: {
          title: 1,
          image: 1,
          hasImageData: { $gt: [{ $size: "$imageData" }, 0] }
        }
      }
    ]).toArray();

    const withData = coursesWithImages.filter(c => c.hasImageData).length;
    const withoutData = coursesWithImages.filter(c => !c.hasImageData).length;

    console.log(`   ✅ Courses with valid image references: ${withData}`);
    console.log(`   ⚠️  Courses with missing image data: ${withoutData}\n`);

    console.log('✅ Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };