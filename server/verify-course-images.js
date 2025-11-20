// verify-course-images.js
// Script to verify that course images were migrated correctly

const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "cognition-berries";

async function verifyCourseImages() {
  let client;
  
  try {
    console.log("🔍 Verifying course images...\n");
    
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB\n");
    
    // Get all courses
    const courses = await db.collection("material-courses").find().toArray();
    console.log(`📚 Found ${courses.length} courses\n`);
    
    // Get all images
    const images = await db.collection("images").find({ type: 'course_image' }).toArray();
    console.log(`🖼️  Found ${images.length} course images\n`);
    
    if (images.length === 0) {
      console.log("⚠️  No images found! Did you run the migration script?\n");
      return;
    }
    
    // Check each course
    let coursesWithImages = 0;
    let coursesWithoutImages = 0;
    let invalidImageRefs = 0;
    
    console.log("=" .repeat(80));
    console.log("Course Image Status:");
    console.log("=".repeat(80));
    
    for (const course of courses) {
      const courseId = course.course_id || course._id.toString();
      const courseName = course.title || "Unnamed Course";
      
      if (course.image) {
        // Check if image exists
        let imageExists = false;
        
        try {
          if (ObjectId.isValid(course.image)) {
            const image = await db.collection("images").findOne({ 
              _id: new ObjectId(course.image) 
            });
            imageExists = !!image;
            
            if (imageExists) {
              const imageSizeKB = Math.round(image.size / 1024);
              console.log(`✅ ${courseName}`);
              console.log(`   ID: ${courseId}`);
              console.log(`   Image: ${image.filename} (${imageSizeKB} KB)`);
              console.log(`   MIME: ${image.mimeType}`);
              console.log("");
              coursesWithImages++;
            } else {
              console.log(`❌ ${courseName}`);
              console.log(`   ID: ${courseId}`);
              console.log(`   Issue: Image reference exists but image not found`);
              console.log(`   Image ID: ${course.image}`);
              console.log("");
              invalidImageRefs++;
            }
          } else {
            console.log(`⚠️  ${courseName}`);
            console.log(`   ID: ${courseId}`);
            console.log(`   Issue: Invalid image ID format`);
            console.log(`   Image ID: ${course.image}`);
            console.log("");
            invalidImageRefs++;
          }
        } catch (err) {
          console.log(`❌ ${courseName}`);
          console.log(`   ID: ${courseId}`);
          console.log(`   Error: ${err.message}`);
          console.log("");
          invalidImageRefs++;
        }
      } else {
        console.log(`⚪ ${courseName}`);
        console.log(`   ID: ${courseId}`);
        console.log(`   Status: No image assigned`);
        console.log("");
        coursesWithoutImages++;
      }
    }
    
    // Summary
    console.log("=".repeat(80));
    console.log("Summary:");
    console.log("=".repeat(80));
    console.log(`✅ Courses with valid images: ${coursesWithImages}`);
    console.log(`⚪ Courses without images: ${coursesWithoutImages}`);
    console.log(`❌ Courses with invalid image refs: ${invalidImageRefs}`);
    console.log(`📊 Total courses: ${courses.length}`);
    console.log(`🖼️  Total images in database: ${images.length}`);
    console.log("=".repeat(80));
    
    // Recommendations
    if (coursesWithoutImages > 0) {
      console.log("\n💡 Recommendations:");
      console.log(`   - ${coursesWithoutImages} courses need images`);
      console.log("   - Run the migration script to add images");
      console.log("   - Or use the admin panel to upload images individually");
    }
    
    if (invalidImageRefs > 0) {
      console.log("\n⚠️  Issues Found:");
      console.log(`   - ${invalidImageRefs} courses have invalid image references`);
      console.log("   - These need to be fixed or re-uploaded");
      
      console.log("\n🔧 Fix command:");
      console.log("   Run: node fix-invalid-image-refs.js");
    }
    
    if (coursesWithImages === courses.length) {
      console.log("\n🎉 All courses have valid images! Great job!");
    }
    
    // Test aggregation query
    console.log("\n🧪 Testing aggregation query...");
    const testQuery = await db.collection("material-courses")
      .aggregate([
        { $limit: 1 },
        {
          $addFields: {
            imageObjectId: {
              $cond: {
                if: { $and: [
                  { $ne: ["$image", null] },
                  { $ne: ["$image", ""] }
                ]},
                then: { $toObjectId: "$image" },
                else: null
              }
            }
          }
        },
        {
          $lookup: {
            from: "images",
            localField: "imageObjectId",
            foreignField: "_id",
            as: "imageData"
          }
        }
      ])
      .toArray();
    
    if (testQuery.length > 0 && testQuery[0].imageData?.length > 0) {
      console.log("✅ Aggregation query works correctly!");
      console.log(`   Sample: ${testQuery[0].title} has image data`);
    } else if (testQuery.length > 0 && !testQuery[0].image) {
      console.log("⚪ Aggregation works, but sample course has no image");
    } else {
      console.log("⚠️  Aggregation returned unexpected results");
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run verification
verifyCourseImages().catch(console.error);