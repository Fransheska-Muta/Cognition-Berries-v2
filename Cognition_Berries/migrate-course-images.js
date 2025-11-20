// migrate-course-images.js
// Script to convert local course images to base64 and store in MongoDB

const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs").promises;
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// Configuration
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "cognition-berries";
const IMAGES_FOLDER = "./course-images"; // Folder where your course images are stored

// Convert image file to base64
async function imageToBase64(imagePath) {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).substring(1).toLowerCase();
    
    // Map extensions to MIME types
    const mimeTypes = {
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'png': 'png',
      'gif': 'gif',
      'webp': 'webp',
      'svg': 'svg+xml'
    };
    
    const mimeType = mimeTypes[ext] || 'jpeg';
    const dataUrl = `data:image/${mimeType};base64,${base64}`;
    
    return {
      dataUrl,
      mimeType: `image/${mimeType}`,
      size: imageBuffer.length,
      extension: ext
    };
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error.message);
    return null;
  }
}

// Main migration function
async function migrateCourseImages() {
  let client;
  
  try {
    console.log("🚀 Starting course image migration...\n");
    
    // Connect to MongoDB
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB\n");
    
    // Get all courses
    const courses = await db.collection("material-courses").find().toArray();
    console.log(`📚 Found ${courses.length} courses\n`);
    
    if (courses.length === 0) {
      console.log("⚠️  No courses found. Please add courses first.");
      return;
    }
    
    // Check if images folder exists
    try {
      await fs.access(IMAGES_FOLDER);
    } catch {
      console.log(`⚠️  Images folder not found: ${IMAGES_FOLDER}`);
      console.log("Creating example mapping file...\n");
      
      // Create example mapping file
      const exampleMapping = courses.map(course => ({
        course_id: course.course_id || course._id.toString(),
        title: course.title,
        image_filename: "example-image.jpg" // User should update this
      }));
      
      await fs.writeFile(
        "./course-image-mapping.json",
        JSON.stringify(exampleMapping, null, 2)
      );
      
      console.log("✅ Created course-image-mapping.json");
      console.log("📝 Please edit this file to map your images to courses");
      return;
    }
    
    // Read image files from folder
    const imageFiles = await fs.readdir(IMAGES_FOLDER);
    const validImages = imageFiles.filter(file => 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)
    );
    
    console.log(`🖼️  Found ${validImages.length} images in ${IMAGES_FOLDER}\n`);
    
    if (validImages.length === 0) {
      console.log("⚠️  No valid images found. Please add images to the folder.");
      return;
    }
    
    // Try to load mapping file if exists
    let mapping = [];
    try {
      const mappingData = await fs.readFile("./course-image-mapping.json", "utf8");
      mapping = JSON.parse(mappingData);
      console.log("✅ Loaded course-image-mapping.json\n");
    } catch {
      // Auto-generate mapping based on filenames
      console.log("📝 Auto-generating image mapping based on filenames...\n");
      mapping = courses.map(course => {
        // Try to find matching image by course_id or title
        const courseId = course.course_id || course._id.toString();
        const matchingImage = validImages.find(img => 
          img.includes(courseId) || 
          img.toLowerCase().includes(course.title.toLowerCase().replace(/\s+/g, '-').substring(0, 20))
        );
        
        return {
          course_id: courseId,
          title: course.title,
          image_filename: matchingImage || validImages[0] // Default to first image
        };
      });
      
      await fs.writeFile(
        "./course-image-mapping.json",
        JSON.stringify(mapping, null, 2)
      );
      console.log("✅ Created course-image-mapping.json");
      console.log("📝 Review and edit if needed, then run script again\n");
    }
    
    // Process each mapping
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of mapping) {
      try {
        const { course_id, image_filename } = item;
        
        if (!image_filename) {
          console.log(`⚠️  No image specified for course: ${course_id}`);
          errorCount++;
          continue;
        }
        
        const imagePath = path.join(IMAGES_FOLDER, image_filename);
        
        // Check if image exists
        try {
          await fs.access(imagePath);
        } catch {
          console.log(`❌ Image not found: ${image_filename} for course ${course_id}`);
          errorCount++;
          continue;
        }
        
        // Convert image to base64
        console.log(`📸 Processing: ${image_filename} for course ${course_id}...`);
        const imageData = await imageToBase64(imagePath);
        
        if (!imageData) {
          errorCount++;
          continue;
        }
        
        // Create image document
        const imageDoc = {
          filename: image_filename,
          mimeType: imageData.mimeType,
          size: imageData.size,
          data: imageData.dataUrl,
          type: 'course_image',
          uploadedAt: new Date()
        };
        
        // Insert image
        const imageResult = await db.collection("images").insertOne(imageDoc);
        
        // Update course with image reference
        const updateResult = await db.collection("material-courses").updateOne(
          { 
            $or: [
              { course_id: course_id },
              { _id: ObjectId.isValid(course_id) ? new ObjectId(course_id) : null }
            ]
          },
          { 
            $set: { 
              image: imageResult.insertedId.toString(),
              imageType: 'base64',
              imageUrl: `/api/images/${imageResult.insertedId}`,
              updatedAt: new Date()
            } 
          }
        );
        
        if (updateResult.matchedCount > 0) {
          console.log(`✅ Successfully migrated: ${image_filename}`);
          successCount++;
        } else {
          console.log(`❌ Course not found: ${course_id}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${item.image_filename}:`, error.message);
        errorCount++;
      }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("=".repeat(50));
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run migration
migrateCourseImages().catch(console.error);