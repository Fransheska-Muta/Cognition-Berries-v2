// server.js
// Enhanced Express server using Firebase Auth (verifyIdToken) + MongoDB
// All endpoints properly protected with Firebase authentication where appropriate

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const multer = require("multer");
const cors = require("cors");
const Paystack = require("paystack-api");
const admin = require("firebase-admin");
const path = require("path");
const dns = require("dns")

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const Base_API = "localhost";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const paystack = PAYSTACK_SECRET_KEY ? Paystack(PAYSTACK_SECRET_KEY) : null;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://52.44.223.219:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// ----------------------- Firebase Admin Init -----------------------
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Case 1: JSON string in .env
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Invalid FIREBASE_SERVICE_ACCOUNT JSON:", err);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // Case 2: Path to JSON file in .env
  const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  serviceAccount = require(serviceAccountPath);
} else {
  // Case 3: Default local file
  try {
    serviceAccount = require("./firebase-service-account.json");
  } catch (err) {
    console.warn("⚠️ No Firebase service account found. Skipping Firebase init.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}


// ----------------------- MongoDB -----------------------
let db;

async function connectToMongo() {
  /*
    ===========================
    Server initialization notes
    ===========================
    - This file creates an Express app and registers routes.
    - When running normally (node server.js) the app listens on PORT.
    - For tests we avoid automatic listen/connect behavior:
      - NODE_ENV=test prevents automatic connectToMongo() on import.
      - SKIP_AUTH=true (set in tests) short-circuits Firebase auth to a fake test user.
    - Exports: module.exports = app; plus helpers connectToMongo/getDb for test harness reuse.
    - Keep side-effects minimal on require() — tests import the app and then call helpers.
  */

  // Skip connection if already connected (for tests)
  if (db) return db;
  
  const client = new MongoClient(process.env.MONGO_URI, {
    // Remove deprecated options
  });
  try {
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || "cognition-berries");
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    if (process.env.NODE_ENV !== 'test') {
      // In production/dev we want the process to stop so the failure is obvious.
      process.exit(1);
    }
    // In test, rethrow so test setup can handle it.
    throw err;
  }
}

// Connect immediately if not in test mode
if (process.env.NODE_ENV !== 'test') {
  connectToMongo().then(() => {
    // Only restore reminders after DB connection is established
    restoreScheduledReminders();
  }).catch(err => {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  });
}
if (process.env.NODE_ENV !== 'test') {
  connectToMongo();
}

const requiredCollections = [
  "Users",
  "material-courses",
  "reviews",
  "Cart",
  "order-summary",
  "forum-posts",
  "forum-replies",
  "live-sessions",
  "material-books",
  "transactions",
  "images",           
  "session-bookings",
  "enrollments",
  "UserCourseProgress"
];

// Create missing collections
async function ensureCollections() {
  const collections = await db.listCollections().toArray();
  const existingNames = collections.map(c => c.name);

  for (const col of requiredCollections) {
    if (!existingNames.includes(col)) {
      await db.createCollection(col);
      console.log(`✅ Created missing collection: ${col}`);
    }
  }
}

// ----------------------- File upload (multer) -----------------------
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----------------------- Auth middleware -----------------------
async function requireAuth(req, res, next) {
  /*
    -----------------------
    Auth middleware (requireAuth)
    -----------------------
    Purpose:
    - Protect endpoints by verifying a Firebase ID token from the Authorization header.
    - Attach a normalized req.user object containing { uid, email, name, phone } on success.

    Test-mode behavior:
    - When NODE_ENV === 'test' AND SKIP_AUTH === 'true' the middleware injects a synthetic test user:
        req.user = { uid: 'test-uid', email: 'test@example.com', ... }
      This allows tests to exercise protected routes without contacting Firebase.

    Security notes:
    - Always require Authorization header format: "Bearer <idToken>"
    - In production do not set SKIP_AUTH — it's only for local unit/integration tests.
  */

  // Skip auth in test mode if needed
  if (process.env.NODE_ENV === 'test' && process.env.SKIP_AUTH === 'true') {
    req.user = {
      uid: 'test-uid',
      email: 'test@example.com',
      name: 'Test User',
      phone: ''
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.displayName || "",
      phone: decoded.phone_number || "",
    };

    // Ensure user record exists in Mongo; upsert to avoid missing profile later.
    if (db) {
      await db.collection("Users").updateOne(
        { uid: req.user.uid },
        {
          $setOnInsert: {
            uid: req.user.uid,
            email: req.user.email,
            name: req.user.name,
            createdAt: new Date(),
            role: "student"
          },
        },
        { upsert: true }
      );
    }

    next();
  } catch (err) {
    console.error("Firebase auth verification failed:", err);
    return res.status(401).json({ error: "Unauthorized", detail: err.message });
  }
}

// Optional middleware for admin-only routes
async function requireAdmin(req, res, next) {
  try {
    const user = await db.collection("Users").findOne({ uid: req.user.uid });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    console.error("Admin check failed:", err);
    res.status(500).json({ error: "Failed to verify admin status" });
  }
}

// ----------------------- Public routes (no auth required) -----------------------

// Health check or welcome route (optional)
app.get("/", (req, res) => 
  res.json({ 
    message: "Cognition Berries API", 
    env: process.env.NODE_ENV || "development" 
  })
);

// Public: Register a new user (sign-up)
app.post("/users", async (req, res) => {
  try {
    const { uid, email, name, role } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "uid and email are required" });
    }

    // 🧠 Optional: Check if domain has MX record
    const domain = email.split("@")[1];
    await new Promise((resolve, reject) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
          reject(new Error("Invalid email domain"));
        } else resolve();
      });
    });

    const user = {
      uid,
      email,
      name: name || "",
      role: role || "student",
      createdAt: new Date()
    };
    await db.collection("Users").updateOne(
      { uid: user.uid },
      { $setOnInsert: user },
      { upsert: true }
    );
    res.status(201).json({ message: "User registered", user });
  } catch (err) {
    console.error("Failed to register user:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// app.post("/verify-recaptcha", async (req, res) => {
//   const { token } = req.body;
//   const secretKey = process.env.RECAPTCHA_SECRET_KEY;

//   try {
//     const response = await fetch(
//       `https://recaptchaenterprise.googleapis.com/v1/projects/YOUR_PROJECT_ID/assessments?key=${secretKey}`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           event: {
//             token: token,
//             siteKey: "YOUR_SITE_KEY",
//             expectedAction: "LOGIN",
//           },
//         }),
//       }
//     );

//     const data = await response.json();
//     res.json({
//       success: data.tokenProperties.valid,
//       score: data.riskAnalysis?.score || 0,
//     });
//   } catch (error) {
//     console.error("reCAPTCHA verification error:", error);
//     res.status(500).json({ success: false });
//   }
// });


// ----------------------- Public Courses (browseable) -----------------------
// Make courses browseable without requiring Firebase auth so the app can show available courses.
// This also ensures the DB connection is established and logs collection diagnostics to help troubleshooting.
// Replace the GET /courses endpoint in server.js with this:



// Also add a dedicated endpoint to fetch individual images if needed
app.get("/api/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    
    if (!ObjectId.isValid(imageId)) {
      return res.status(400).json({ error: "Invalid image ID" });
    }
    
    const image = await db.collection("images").findOne({ 
      _id: new ObjectId(imageId) 
    });
    
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    // Return the image data directly
    res.json({
      id: image._id,
      data: image.data,
      mimeType: image.mimeType,
      filename: image.filename
    });
    
  } catch (err) {
    console.error("❌ Image retrieval error:", err);
    res.status(500).json({ error: "Failed to retrieve image" });
  }
});
// ----------------------- Protected routes (requireAuth) -----------------------

// All other routes below require authentication (and admin where needed)
app.get("/reviews", requireAuth, async (req, res) => {
  try {
    const reviews = await db.collection("reviews").find().toArray();
    res.json(reviews);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Replace the /courses GET endpoint in server.js (around line 473)

// This fixes the aggregation error AND adds placeholder images



// Public forum posts (read-only)
app.get("/forum-posts", async (req, res) => {
  try {
    const posts = await db.collection("forum-posts").find().toArray();
    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch forum posts:", err);
    res.status(500).json({ error: "Failed to get forum posts" });
  }
});

// Public forum replies (read-only)
app.get("/forum-replies", async (req, res) => {
  try {
    const replies = await db.collection("forum-replies").find().toArray();
    res.json(replies);
  } catch (err) {
    console.error("Failed to fetch forum replies:", err);
    res.status(500).json({ error: "Failed to get replies" });
  }
});

// ----------------------- Auth-protected routes -----------------------

// User profile management
app.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db.collection("Users").findOne({ uid: req.user.uid });
    res.json(user || { uid: req.user.uid, email: req.user.email, name: req.user.name });
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.put("/me", requireAuth, async (req, res) => {
  try {
    const updates = req.body || {};
    updates.updatedAt = new Date();
    const result = await db.collection("Users").findOneAndUpdate(
      { uid: req.user.uid },
      { $set: updates },
      { returnDocument: "after", upsert: true }
    );
    res.json(result.value);
  } catch (err) {
    console.error("Failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Upload profile picture
app.post("/api/upload-profile", requireAuth, upload.single("profilePicture"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  try {
    await db.collection("Users").updateOne(
      { uid: req.user.uid },
      { $set: { avatar: imageUrl, updatedAt: new Date() } },
      { upsert: true }
    );
    res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("Error saving avatar:", err);
    res.status(500).json({ error: "Failed to save avatar" });
  }
});

// ----------------------- User Management (Admin only) -----------------------
app.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.collection("Users").find().toArray();
    res.json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/users/:email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await db.collection("Users").findOne({ email: req.params.email });
    user ? res.json(user) : res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Failed to get user:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

app.put("/users/:email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    const result = await db.collection("Users").findOneAndUpdate(
      { email: req.params.email },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Failed to update user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/users/:email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.collection("Users").deleteOne({ email: req.params.email });
    result.deletedCount ? res.json({ message: "User deleted" }) : res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ----------------------- Course Management -----------------------
app.post("/courses", requireAuth, requireAdmin, async (req, res) => {
  try {
    const course = req.body;
    course.createdAt = new Date();
    course.createdBy = req.user.uid;
    const result = await db.collection("material-courses").insertOne(course);
    res.status(201).json({ _id: result.insertedId, ...course });
  } catch (err) {
    console.error("Failed to create course:", err);
    res.status(500).json({ error: "Failed to create course" });
  }
});

app.get("/courses/:id", async (req, res) => {
  try {
    const idParam = req.params.id;
    
    // Build match query for course_id or _id
    const matchQuery = {
      $or: [
        { course_id: idParam }
      ]
    };
    
    if (ObjectId.isValid(idParam)) {
      matchQuery.$or.push({ _id: new ObjectId(idParam) });
    }

    const courses = await db.collection("material-courses")
      .aggregate([
        { $match: matchQuery },
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
        },
        {
          $unwind: {
            path: "$imageData",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            imageObjectId: 0
          }
        }
      ])
      .toArray();

    if (courses.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(courses[0]);
  } catch (err) {
    console.error("Failed to get course with image:", err);
    res.status(500).json({ error: "Failed to get course" });
  }
});

app.get("/api/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    
    console.log(`🖼️ Image request received for ID: ${imageId}`);
    
    if (!ObjectId.isValid(imageId)) {
      console.error(`❌ Invalid image ID format: ${imageId}`);
      return res.status(400).json({ error: "Invalid image ID" });
    }
    
    const image = await db.collection("images").findOne({ 
      _id: new ObjectId(imageId) 
    });
    
    if (!image) {
      console.error(`❌ Image not found: ${imageId}`);
      return res.status(404).json({ error: "Image not found" });
    }
    
    console.log(`✅ Image found: ${image.filename || 'unnamed'}, type: ${image.mimeType}`);
    
    // If data is already a complete data URL, return it as JSON
    if (image.data && image.data.startsWith('data:image/')) {
      return res.json({
        id: image._id,
        data: image.data,
        mimeType: image.mimeType,
        filename: image.filename,
        uploadedAt: image.uploadedAt
      });
    }
    
    // If data is base64 without prefix, add it
    if (image.data && image.mimeType) {
      const dataUrl = `data:${image.mimeType};base64,${image.data}`;
      return res.json({
        id: image._id,
        data: dataUrl,
        mimeType: image.mimeType,
        filename: image.filename,
        uploadedAt: image.uploadedAt
      });
    }
    
    // Fallback
    return res.json({
      id: image._id,
      data: image.data,
      mimeType: image.mimeType,
      filename: image.filename,
      uploadedAt: image.uploadedAt
    });
    
  } catch (err) {
    console.error("❌ Image retrieval error:", err);
    res.status(500).json({ error: "Failed to retrieve image", details: err.message });
  }
});


app.post("/courses/:id/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { image, filename } = req.body;
    const courseId = req.params.id;
    
    // Validate course exists
    const course = await db.collection("material-courses").findOne({
      $or: [
        { course_id: courseId },
        { _id: ObjectId.isValid(courseId) ? new ObjectId(courseId) : null }
      ]
    });
    
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    // Validate base64 image
    if (!image || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: "Invalid image format" });
    }
    
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Invalid base64 image format" });
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 5) {
      return res.status(400).json({ error: "Image too large. Maximum 5MB" });
    }
    
    // Delete old image if exists
    if (course.image && ObjectId.isValid(course.image)) {
      await db.collection("images").deleteOne({ 
        _id: new ObjectId(course.image) 
      });
    }
    
    // Create new image document
    const imageDoc = {
      filename: filename || `course_${courseId}_${Date.now()}.${mimeType}`,
      mimeType: `image/${mimeType}`,
      size: sizeInBytes,
      data: image,
      type: 'course_image',
      courseId: courseId,
      uploadedAt: new Date(),
      uploadedBy: req.user.uid
    };
    
    const result = await db.collection("images").insertOne(imageDoc);
    
    // Update course with new image reference
    await db.collection("material-courses").updateOne(
      {
        $or: [
          { course_id: courseId },
          { _id: ObjectId.isValid(courseId) ? new ObjectId(courseId) : null }
        ]
      },
      {
        $set: {
          image: result.insertedId.toString(),
          imageType: 'base64',
          imageUrl: `/api/images/${result.insertedId}`,
          updatedAt: new Date(),
          updatedBy: req.user.uid
        }
      }
    );
    
    res.json({
      message: "Course image uploaded successfully",
      imageId: result.insertedId,
      imageUrl: `/api/images/${result.insertedId}`
    });
    
  } catch (err) {
    console.error("Course image upload error:", err);
    res.status(500).json({ error: "Failed to upload course image" });
  }
});
app.delete("/courses/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.collection("material-courses").deleteOne({ 
      $or: [
        { course_id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ]
    });
    result.deletedCount ? res.json({ message: "Course deleted" }) : res.status(404).json({ message: "Course not found" });
  } catch (err) {
    console.error("Failed to delete course:", err);
    res.status(500).json({ error: "Failed to delete course" });
  }
});


// ==========================================
// ADD THESE ROUTES TO YOUR server.js
// Place them after the existing routes section
// ==========================================

// ----------------------- Progress Tracking System -----------------------

// Helper: Calculate course completion percentage
async function calculateProgressPercentage(courseId, completedLessons) {
  try {
    const course = await db.collection("material-courses").findOne({
      $or: [
        { course_id: courseId },
        { _id: ObjectId.isValid(courseId) ? new ObjectId(courseId) : null }
      ]
    });

    if (!course || !course.modules) return 0;

    const totalLessons = course.modules.reduce((sum, module) => 
      sum + (module.lessons?.length || 0), 0);

    if (totalLessons === 0) return 0;

    return Math.round((completedLessons.length / totalLessons) * 100);
  } catch (err) {
    console.error("Error calculating progress:", err);
    return 0;
  }
}

// Helper: Get next lesson
async function getNextLesson(courseId, completedLessons) {
  try {
    const course = await db.collection("material-courses").findOne({
      $or: [
        { course_id: courseId },
        { _id: ObjectId.isValid(courseId) ? new ObjectId(courseId) : null }
      ]
    });

    if (!course || !course.modules) return null;

    const allLessons = course.modules.flatMap(module => 
      (module.lessons || []).map(lesson => ({
        ...lesson,
        moduleId: module.id,
        moduleTitle: module.title
      }))
    );

    // Find first incomplete lesson
    for (const lesson of allLessons) {
      if (!completedLessons.includes(lesson.id)) {
        return lesson;
      }
    }

    return null; // All lessons completed
  } catch (err) {
    console.error("Error getting next lesson:", err);
    return null;
  }
}

// GET: Fetch user's progress for a specific course
app.get("/progress/:userId/:courseId", requireAuth, async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Security: Users can only access their own progress
    if (req.user.uid !== userId) {
      const user = await db.collection("Users").findOne({ uid: req.user.uid });
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Check enrollment
    const enrollment = await db.collection("enrollments").findOne({
      uid: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return res.status(404).json({ error: "User not enrolled in this course" });
    }

    // Fetch or create progress record
    let progress = await db.collection("UserCourseProgress").findOne({
      userId: userId,
      courseId: courseId
    });

    if (!progress) {
      // Create initial progress record
      progress = {
        userId: userId,
        courseId: courseId,
        completedLessons: [],
        videoPositions: {},
        quizScores: {},
        lessonAttempts: {},
        percentComplete: 0,
        lastOpenedLesson: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection("UserCourseProgress").insertOne(progress);
      progress._id = result.insertedId;
    }

    // Get next lesson
    const nextLesson = await getNextLesson(courseId, progress.completedLessons);

    res.json({
      ...progress,
      nextLesson: nextLesson
    });
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// POST: Update progress (comprehensive update)
app.post("/progress/update", requireAuth, async (req, res) => {
  try {
    const {
      courseId,
      completedLessons,
      videoPositions,
      quizScores,
      lastOpenedLesson
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const userId = req.user.uid;

    // Verify enrollment
    const enrollment = await db.collection("enrollments").findOne({
      uid: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return res.status(403).json({ error: "User not enrolled in this course" });
    }

    // Build update object
    const updates = {
      updatedAt: new Date()
    };

    if (completedLessons) {
      updates.completedLessons = completedLessons;
      updates.percentComplete = await calculateProgressPercentage(courseId, completedLessons);
    }

    if (videoPositions) {
      updates.videoPositions = videoPositions;
    }

    if (quizScores) {
      updates.quizScores = quizScores;
    }

    if (lastOpenedLesson !== undefined) {
      updates.lastOpenedLesson = lastOpenedLesson;
    }

    // Upsert progress record
    const result = await db.collection("UserCourseProgress").findOneAndUpdate(
      { userId: userId, courseId: courseId },
      { 
        $set: updates,
        $setOnInsert: {
          userId: userId,
          courseId: courseId,
          createdAt: new Date()
        }
      },
      { 
        upsert: true, 
        returnDocument: "after" 
      }
    );

    // Update enrollment progress
    await db.collection("enrollments").updateOne(
      { uid: userId, courseId: courseId },
      { 
        $set: { 
          progress: updates.percentComplete || 0,
          lastAccessedAt: new Date()
        } 
      }
    );

    res.json({
      message: "Progress updated successfully",
      progress: result.value
    });
  } catch (err) {
    console.error("Error updating progress:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

// POST: Autosave video position
app.post("/progress/autosave-video", requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId, position, duration } = req.body;

    if (!courseId || !lessonId || position === undefined) {
      return res.status(400).json({ 
        error: "courseId, lessonId, and position are required" 
      });
    }

    const userId = req.user.uid;

    // Verify enrollment
    const enrollment = await db.collection("enrollments").findOne({
      uid: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return res.status(403).json({ error: "User not enrolled in this course" });
    }

    // Update video position
    const updateKey = `videoPositions.${lessonId}`;
    const attemptKey = `lessonAttempts.${lessonId}`;
    
    const updates = {
      [updateKey]: position,
      updatedAt: new Date(),
      lastOpenedLesson: lessonId
    };

    // Track lesson attempt
    const progress = await db.collection("UserCourseProgress").findOne({
      userId: userId,
      courseId: courseId
    });

    if (progress) {
      const attempt = progress.lessonAttempts?.[lessonId] || {};
      if (!attempt.firstOpenedAt) {
        updates[`${attemptKey}.firstOpenedAt`] = new Date();
      }
      updates[`${attemptKey}.lastVisitedAt`] = new Date();
    } else {
      updates[`${attemptKey}.firstOpenedAt`] = new Date();
      updates[`${attemptKey}.lastVisitedAt`] = new Date();
    }

    await db.collection("UserCourseProgress").updateOne(
      { userId: userId, courseId: courseId },
      { 
        $set: updates,
        $setOnInsert: {
          userId: userId,
          courseId: courseId,
          completedLessons: [],
          quizScores: {},
          percentComplete: 0,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Auto-complete if watched > 90%
    let autoCompleted = false;
    if (duration && position / duration > 0.9) {
      const progressDoc = await db.collection("UserCourseProgress").findOne({
        userId: userId,
        courseId: courseId
      });

      if (progressDoc && !progressDoc.completedLessons.includes(lessonId)) {
        const newCompleted = [...progressDoc.completedLessons, lessonId];
        const newPercent = await calculateProgressPercentage(courseId, newCompleted);

        await db.collection("UserCourseProgress").updateOne(
          { userId: userId, courseId: courseId },
          { 
            $set: { 
              completedLessons: newCompleted,
              percentComplete: newPercent,
              updatedAt: new Date()
            } 
          }
        );

        autoCompleted = true;
      }
    }

    res.json({
      message: "Video position saved",
      position: position,
      autoCompleted: autoCompleted
    });
  } catch (err) {
    console.error("Error autosaving video:", err);
    res.status(500).json({ error: "Failed to autosave video position" });
  }
});

// POST: Complete a lesson
app.post("/progress/complete-lesson", requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId, quizScore } = req.body;

    if (!courseId || !lessonId) {
      return res.status(400).json({ 
        error: "courseId and lessonId are required" 
      });
    }

    const userId = req.user.uid;

    // Verify enrollment
    const enrollment = await db.collection("enrollments").findOne({
      uid: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return res.status(403).json({ error: "User not enrolled in this course" });
    }

    // Get current progress
    const progress = await db.collection("UserCourseProgress").findOne({
      userId: userId,
      courseId: courseId
    });

    const currentCompleted = progress?.completedLessons || [];

    // Add lesson if not already completed
    if (!currentCompleted.includes(lessonId)) {
      currentCompleted.push(lessonId);
    }

    // Calculate new percentage
    const newPercent = await calculateProgressPercentage(courseId, currentCompleted);

    // Build updates
    const updates = {
      completedLessons: currentCompleted,
      percentComplete: newPercent,
      updatedAt: new Date()
    };

    // Add quiz score if provided
    if (quizScore !== undefined) {
      updates[`quizScores.${lessonId}`] = quizScore;
    }

    // Update progress
    await db.collection("UserCourseProgress").updateOne(
      { userId: userId, courseId: courseId },
      { 
        $set: updates,
        $setOnInsert: {
          userId: userId,
          courseId: courseId,
          videoPositions: {},
          lessonAttempts: {},
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Update enrollment
    await db.collection("enrollments").updateOne(
      { uid: userId, courseId: courseId },
      { 
        $set: { 
          progress: newPercent,
          lastAccessedAt: new Date()
        } 
      }
    );

    // Get next lesson
    const nextLesson = await getNextLesson(courseId, currentCompleted);

    res.json({
      message: "Lesson completed successfully",
      percentComplete: newPercent,
      nextLesson: nextLesson,
      totalCompleted: currentCompleted.length
    });
  } catch (err) {
    console.error("Error completing lesson:", err);
    res.status(500).json({ error: "Failed to complete lesson" });
  }
});

// POST: Reset course progress
app.post("/progress/reset", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const userId = req.user.uid;

    // Verify enrollment
    const enrollment = await db.collection("enrollments").findOne({
      uid: userId,
      courseId: courseId
    });

    if (!enrollment) {
      return res.status(403).json({ error: "User not enrolled in this course" });
    }

    // Reset progress
    const resetData = {
      userId: userId,
      courseId: courseId,
      completedLessons: [],
      videoPositions: {},
      quizScores: {},
      lessonAttempts: {},
      percentComplete: 0,
      lastOpenedLesson: null,
      updatedAt: new Date(),
      createdAt: new Date()
    };

    await db.collection("UserCourseProgress").findOneAndUpdate(
      { userId: userId, courseId: courseId },
      { $set: resetData },
      { upsert: true, returnDocument: "after" }
    );

    // Reset enrollment progress
    await db.collection("enrollments").updateOne(
      { uid: userId, courseId: courseId },
      { $set: { progress: 0 } }
    );

    res.json({
      message: "Progress reset successfully",
      progress: resetData
    });
  } catch (err) {
    console.error("Error resetting progress:", err);
    res.status(500).json({ error: "Failed to reset progress" });
  }
});

// GET: Get all progress for a user (dashboard view)
app.get("/user/all-progress", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const progressRecords = await db.collection("UserCourseProgress")
      .find({ userId: userId })
      .toArray();

    // Fetch course details for each progress record
    const progressWithCourses = await Promise.all(
      progressRecords.map(async (prog) => {
        const course = await db.collection("material-courses").findOne({
          $or: [
            { course_id: prog.courseId },
            { _id: ObjectId.isValid(prog.courseId) ? new ObjectId(prog.courseId) : null }
          ]
        });

        return {
          ...prog,
          courseTitle: course?.title || "Unknown Course",
          courseDescription: course?.description || ""
        };
      })
    );

    res.json(progressWithCourses);
  } catch (err) {
    console.error("Error fetching all progress:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// ==========================================
// ADMIN ROUTES - Progress Management
// ==========================================

// GET: View any user's progress (admin only)
app.get("/admin/progress/:userId/:courseId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    const progress = await db.collection("UserCourseProgress").findOne({
      userId: userId,
      courseId: courseId
    });

    if (!progress) {
      return res.status(404).json({ error: "Progress record not found" });
    }

    res.json(progress);
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// POST: Reset any user's progress (admin only)
app.post("/admin/progress/reset", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: "userId and courseId are required" });
    }

    const resetData = {
      userId: userId,
      courseId: courseId,
      completedLessons: [],
      videoPositions: {},
      quizScores: {},
      lessonAttempts: {},
      percentComplete: 0,
      lastOpenedLesson: null,
      updatedAt: new Date(),
      createdAt: new Date()
    };

    await db.collection("UserCourseProgress").findOneAndUpdate(
      { userId: userId, courseId: courseId },
      { $set: resetData },
      { upsert: true }
    );

    await db.collection("enrollments").updateOne(
      { uid: userId, courseId: courseId },
      { $set: { progress: 0 } }
    );

    res.json({
      message: "User progress reset successfully",
      userId: userId,
      courseId: courseId
    });
  } catch (err) {
    console.error("Error resetting user progress:", err);
    res.status(500).json({ error: "Failed to reset user progress" });
  }
});


// ----------------------- Reviews Management -----------------------
app.get("/reviews", requireAuth, async (req, res) => {
  try {
    const courses = await db.collection("reviews").find().toArray();

    // Flatten nested course reviews
    const allReviews = courses.flatMap(course =>
      course.reviews.map(r => ({
        courseId: course.courseId,
        courseName: course.courseName,
        ...r
      }))
    );

    res.json(allReviews);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.get("/reviews/:courseId", requireAuth, async (req, res) => {
  try {
    const course = await db.collection("reviews").findOne({ courseId: req.params.courseId });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course.reviews || []);
  } catch (err) {
    console.error("Failed to fetch course reviews:", err);
    res.status(500).json({ error: "Failed to fetch course reviews" });
  }
});


app.post("/reviews/:courseId", requireAuth, async (req, res) => {
  try {
    const newReview = {
      reviewId: `REV-${Math.floor(Math.random() * 100000)}`,
      studentName: req.body.studentName || req.user.name || "Anonymous",
      rating: req.body.rating,
      date: new Date().toISOString().split("T")[0],
      title: req.body.title,
      review: req.body.review,
      helpful: 0,
      verified: true,
      uid: req.user.uid,
      userEmail: req.user.email
    };

    const result = await db.collection("reviews").updateOne(
      { courseId: req.params.courseId },
      { $push: { reviews: newReview } },
      { upsert: false }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(201).json(newReview);
  } catch (err) {
    console.error("Failed to add review:", err);
    res.status(500).json({ error: "Failed to add review" });
  }
});


app.put("/reviews/:courseId/:reviewId", requireAuth, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updatedAt: new Date()
    };

    const result = await db.collection("reviews").updateOne(
      {
        courseId: req.params.courseId,
        "reviews.reviewId": req.params.reviewId,
        "reviews.uid": req.user.uid
      },
      { $set: { "reviews.$": { ...updates, reviewId: req.params.reviewId, uid: req.user.uid } } }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Review not found or not owned by user" });

    res.json({ message: "Review updated" });
  } catch (err) {
    console.error("Failed to update review:", err);
    res.status(500).json({ error: "Failed to update review" });
  }
});


app.delete("/reviews/:courseId/:reviewId", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("reviews").updateOne(
      { courseId: req.params.courseId },
      { $pull: { reviews: { reviewId: req.params.reviewId, uid: req.user.uid } } }
    );

    if (result.modifiedCount === 0)
      return res.status(404).json({ message: "Review not found or access denied" });

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("Failed to delete review:", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
});


// ----------------------- Cart Management -----------------------
app.post("/cart", requireAuth, async (req, res) => {
  try {
    const { title, price, author, description, quantity, productId } = req.body;
    const item = {
      uid: req.user.uid,
      userEmail: req.user.email,
      productId: productId || null,
      title,
      price: parseFloat(price) || 0,
      author: author || "Unknown",
      description: description || "",
      quantity: parseInt(quantity) || 1,
      createdAt: new Date(),
    };
    const result = await db.collection("Cart").insertOne(item);
    res.status(201).json({ _id: result.insertedId, ...item });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

app.get("/cart", requireAuth, async (req, res) => {
  try {
    const items = await db.collection("Cart").find({ uid: req.user.uid }).toArray();
    res.json(items);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Failed to get user cart items" });
  }
});

app.put("/cart/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid cart item ID format" });
    
    const { quantity, ...otherUpdates } = req.body;
    const updates = {
      ...otherUpdates,
      quantity: parseInt(quantity) || 1,
      updatedAt: new Date(),
    };
    
    const result = await db.collection("Cart").findOneAndUpdate(
      { _id: new ObjectId(id), uid: req.user.uid },
      { $set: updates },
      { returnDocument: "after" }
    );
    
    if (!result.value) return res.status(404).json({ error: "Cart item not found" });
    res.json(result.value);
  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

app.delete("/cart/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid cart item ID format" });
    
    const result = await db.collection("Cart").deleteOne({ _id: new ObjectId(id), uid: req.user.uid });
    if (!result.deletedCount) return res.status(404).json({ message: "Cart item not found" });
    res.json({ message: "Cart item deleted" });
  } catch (err) {
    console.error("Delete cart error:", err);
    res.status(500).json({ error: "Failed to delete cart item" });
  }
});

app.delete("/cart", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("Cart").deleteMany({ uid: req.user.uid });
    res.json({ message: `Deleted ${result.deletedCount} items` });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

// ----------------------- Checkout & Orders -----------------------
app.post("/checkout", requireAuth, async (req, res) => {
  try {
    const { paymentMethod, customer } = req.body;
    const cartItems = await db.collection("Cart").find({ uid: req.user.uid }).toArray();
    if (!cartItems.length) return res.status(400).json({ error: "Cart is empty" });

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const order = {
      uid: req.user.uid,
      userEmail: req.user.email,
      items: cartItems.map(item => ({
        productId: item.productId,
        title: item.title,
        quantity: item.quantity || 1,
        price: item.price,
      })),
      totalAmount,
      paymentMethod: paymentMethod || "unknown",
      customer,
      status: "Confirmed",
      createdAt: new Date(),
    };

    const result = await db.collection("order-summary").insertOne(order);
    await db.collection("Cart").deleteMany({ uid: req.user.uid });

    res.status(201).json({ message: "Order placed successfully", orderId: result.insertedId, order });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

app.get("/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await db.collection("order-summary").find().toArray();
    res.json(orders);
  } catch (err) {
    console.error("Failed to fetch all orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/orders/user", requireAuth, async (req, res) => {
  try {
    const orders = await db.collection("order-summary").find({ uid: req.user.uid }).toArray();
    res.json(orders);
  } catch (err) {
    console.error("User orders fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

app.put("/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    const updates = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    const result = await db.collection("order-summary").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Order not found" });
  } catch (err) {
    console.error("Failed to update order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

app.delete("/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }
    const result = await db.collection("order-summary").deleteOne({ _id: new ObjectId(req.params.id) });
    result.deletedCount ? res.json({ message: "Order deleted" }) : res.status(404).json({ message: "Order not found" });
  } catch (err) {
    console.error("Failed to delete order:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ----------------------- Forum Management -----------------------
app.post("/forum-posts", requireAuth, async (req, res) => {
  try {
    const post = {
      ...req.body,
      uid: req.user.uid,
      userEmail: req.user.email,
      createdAt: new Date(),
    };
    const result = await db.collection("forum-posts").insertOne(post);
    res.status(201).json({ _id: result.insertedId, ...post });
  } catch (err) {
    console.error("Failed to create forum post:", err);
    res.status(500).json({ error: "Failed to create forum post" });
  }
});

app.put("/forum-posts/:id", requireAuth, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };

    // Resolve param id robustly
    const idParam = req.params.id;
    const idObj = resolveIdParam(idParam);

    const query = idObj
      ? {
          $and: [
            { uid: req.user.uid }, // Only allow users to update their own posts
            {
              $or: [
                { post_id: idParam },
                { _id: idObj }
              ]
            }
          ]
        }
      : {
          $and: [
            { uid: req.user.uid },
            { $or: [{ post_id: idParam }] }
          ]
        };

    const result = await db.collection("forum-posts").findOneAndUpdate(
      query,
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Forum post not found or access denied" });
  } catch (err) {
    console.error("Failed to update forum post:", err);
    res.status(500).json({ error: "Failed to update forum post" });
  }
});

app.delete("/forum-posts/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("forum-posts").deleteOne({ 
      $and: [
        { uid: req.user.uid }, // Only allow users to delete their own posts
        {
          $or: [
            { post_id: req.params.id },
            { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
          ]
        }
      ]
    });
    result.deletedCount ? res.json({ message: "Forum post deleted" }) : res.status(404).json({ message: "Forum post not found or access denied" });
  } catch (err) {
    console.error("Failed to delete forum post:", err);
    res.status(500).json({ error: "Failed to delete forum post" });
  }
});

app.post("/forum-replies", requireAuth, async (req, res) => {
  try {
    const reply = {
      ...req.body,
      uid: req.user.uid,
      userEmail: req.user.email,
      createdAt: new Date(),
    };
    const result = await db.collection("forum-replies").insertOne(reply);
    res.status(201).json({ _id: result.insertedId, ...reply });
  } catch (err) {
    console.error("Failed to create reply:", err);
    res.status(500).json({ error: "Failed to create reply" });
  }
});

app.put("/forum-replies/:id", requireAuth, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    const result = await db.collection("forum-replies").findOneAndUpdate(
      { 
        $and: [
          { uid: req.user.uid }, // Only allow users to update their own replies
          {
            $or: [
              { reply_id: req.params.id },
              { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
            ]
          }
        ]
      },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Reply not found or access denied" });
  } catch (err) {
    console.error("Failed to update reply:", err);
    res.status(500).json({ error: "Failed to update reply" });
  }
});

app.delete("/forum-replies/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("forum-replies").deleteOne({ 
      $and: [
        { uid: req.user.uid }, // Only allow users to delete their own replies
        {
          $or: [
            { reply_id: req.params.id },
            { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
          ]
        }
      ]
    });
    result.deletedCount ? res.json({ message: "Reply deleted" }) : res.status(404).json({ message: "Reply not found or access denied" });
  } catch (err) {
    console.error("Failed to delete reply:", err);
    res.status(500).json({ error: "Failed to delete reply" });
  }
});

// ----------------------- Live Sessions -----------------------
app.get("/live-sessions", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Fetch all sessions
    const sessions = await db.collection("live-sessions")
      .find({})
      .sort({ startTime: 1 })
      .toArray();

    // Fetch user's bookings
    const userBookings = await db.collection("session-bookings")
      .find({ userId: userId })
      .toArray();
    
    const bookedSessionIds = new Set(
      userBookings.map(booking => booking.sessionId.toString())
    );

    const currentTime = new Date();
    const processedSessions = sessions.map(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);

      let status;
      if (currentTime >= startTime && currentTime <= endTime) {
        status = "live";
      } else if (currentTime < startTime) {
        status = "upcoming";
      } else {
        status = "completed";
      }

      return {
        id: session._id.toString(),
        _id: session._id,
        title: session.title,
        description: session.description,
        instructor: session.instructor,
        startTime: session.startTime,
        endTime: session.endTime,
        status: status,
        participants: session.participants || 0,
        maxParticipants: session.maxParticipants || 100,
        category: session.category || "General",
        meetingLink: session.meetingLink || "",
        recordingAvailable: session.recordingAvailable || false,
        isBooked: bookedSessionIds.has(session._id.toString())
      };
    });

    res.json(processedSessions);
  } catch (error) {
    console.error("Error fetching live sessions:", error);
    res.status(500).json({ error: "Failed to fetch live sessions" });
  }
});

// BOOK a session
app.post("/live-sessions/:id/book", requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.uid;
    const userEmail = req.user.email;
    const userName = req.user.name || req.user.email;

    // Validate session ID
    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid session ID" });
    }

    // Fetch session
    const session = await db.collection("live-sessions").findOne({
      _id: new ObjectId(sessionId)
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if session is in the future
    const sessionStart = new Date(session.startTime);
    if (sessionStart < new Date()) {
      return res.status(400).json({ error: "Cannot book a session that has already started" });
    }

    // Check if already booked
    const existingBooking = await db.collection("session-bookings").findOne({
      sessionId: new ObjectId(sessionId),
      userId: userId
    });

    if (existingBooking) {
      return res.status(400).json({ error: "You have already booked this session" });
    }

    // Check if session is full
    const bookingCount = await db.collection("session-bookings").countDocuments({
      sessionId: new ObjectId(sessionId)
    });

    if (session.maxParticipants && bookingCount >= session.maxParticipants) {
      return res.status(400).json({ error: "Session is full" });
    }

    // Create booking
    const booking = {
      sessionId: new ObjectId(sessionId),
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      bookedAt: new Date(),
      remindersSent: []
    };

    await db.collection("session-bookings").insertOne(booking);

    // Update participant count
    await db.collection("live-sessions").updateOne(
      { _id: new ObjectId(sessionId) },
      { $inc: { participants: 1 } }
    );

    // Schedule reminders
    scheduleSessionReminders(sessionId, userId, session, { email: userEmail, name: userName });

    res.json({
      message: "Session booked successfully",
      sessionId: sessionId,
      booking: booking
    });
  } catch (error) {
    console.error("Error booking session:", error);
    res.status(500).json({ error: "Failed to book session" });
  }
});

// CANCEL booking
app.post("/live-sessions/:id/cancel-booking", requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.uid;

    // Validate session ID
    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid session ID" });
    }

    // Delete booking
    const result = await db.collection("session-bookings").deleteOne({
      sessionId: new ObjectId(sessionId),
      userId: userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update participant count
    await db.collection("live-sessions").updateOne(
      { _id: new ObjectId(sessionId) },
      { $inc: { participants: -1 } }
    );

    // Cancel scheduled reminders
    cancelSessionReminders(sessionId, userId);

    res.json({
      message: "Booking cancelled successfully",
      sessionId: sessionId
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// GET user's bookings
app.get("/my-bookings", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const bookings = await db.collection("session-bookings")
      .aggregate([
        { $match: { userId: userId } },
        {
          $lookup: {
            from: "live-sessions",
            localField: "sessionId",
            foreignField: "_id",
            as: "session"
          }
        },
        { $unwind: "$session" },
        { $sort: { "session.startTime": 1 } }
      ])
      .toArray();

    const processedBookings = bookings.map(booking => ({
      bookingId: booking._id,
      bookedAt: booking.bookedAt,
      session: {
        id: booking.session._id,
        title: booking.session.title,
        description: booking.session.description,
        instructor: booking.session.instructor,
        startTime: booking.session.startTime,
        endTime: booking.session.endTime,
        category: booking.session.category,
        meetingLink: booking.session.meetingLink
      }
    }));

    res.json(processedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// CREATE session (existing route, kept for reference)
app.post("/live-sessions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      title, description, instructor, startTime, endTime,
      category, maxParticipants, meetingLink
    } = req.body;

    // Validation
    if (!title || !description || !instructor || !startTime || !endTime) {
      return res.status(400).json({
        error: "Missing required fields: title, description, instructor, startTime, endTime"
      });
    }

    const newSession = {
      title,
      description,
      instructor,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      category: category || "General",
      maxParticipants: maxParticipants || 100,
      participants: 0,
      meetingLink: meetingLink || "",
      recordingAvailable: false,
      createdAt: new Date(),
      createdBy: req.user.uid
    };

    const result = await db.collection("live-sessions").insertOne(newSession);
    res.status(201).json({
      message: "Session created successfully",
      sessionId: result.insertedId,
      session: newSession
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// UPDATE session (existing route)
app.put("/live-sessions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    const result = await db.collection("live-sessions").findOneAndUpdate(
      {
        $or: [
          { session_id: req.params.id },
          { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
        ]
      },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Session not found" });
  } catch (err) {
    console.error("Failed to update session:", err);
    res.status(500).json({ error: "Failed to update session" });
  }
});

// DELETE session (existing route)
app.delete("/live-sessions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const objectId = ObjectId.isValid(sessionId) ? new ObjectId(sessionId) : null;

    // Delete all bookings for this session first
    await db.collection("session-bookings").deleteMany({
      sessionId: objectId
    });

    // Cancel all reminders for this session
    const jobKeys = Array.from(reminderJobs.keys()).filter(
      key => key.startsWith(`${sessionId}-`)
    );
    jobKeys.forEach(key => {
      clearTimeout(reminderJobs.get(key));
      reminderJobs.delete(key);
    });

    const result = await db.collection("live-sessions").deleteOne({
      $or: [
        { session_id: sessionId },
        { _id: objectId }
      ]
    });

    result.deletedCount ? res.json({ message: "Session deleted" }) : res.status(404).json({ message: "Session not found" });
  } catch (err) {
    console.error("Failed to delete session:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// ===== REMINDER SYSTEM =====

function scheduleSessionReminders(sessionId, userId, session, user) {
  const sessionStart = new Date(session.startTime);
  const now = new Date();

  // Reminder intervals: 1 hour, 30 min, 15 min, 5 min
  const reminderIntervals = [
    { minutes: 60, label: '1 hour' },
    { minutes: 30, label: '30 minutes' },
    { minutes: 15, label: '15 minutes' },
    { minutes: 5, label: '5 minutes' }
  ];

  reminderIntervals.forEach(({ minutes, label }) => {
    const reminderTime = new Date(sessionStart.getTime() - (minutes * 60 * 1000));

    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      const jobKey = `${sessionId}-${userId}-${minutes}`;

      const timeoutId = setTimeout(async () => {
        await sendSessionReminder(userId, user, session, label);
        reminderJobs.delete(jobKey);
      }, delay);

      reminderJobs.set(jobKey, timeoutId);
      console.log(`Scheduled reminder for session ${sessionId}, user ${userId} at ${reminderTime}`);
    }
  });
}

function cancelSessionReminders(sessionId, userId) {
  const jobKeys = Array.from(reminderJobs.keys()).filter(
    key => key.startsWith(`${sessionId}-${userId}-`)
  );

  jobKeys.forEach(key => {
    clearTimeout(reminderJobs.get(key));
    reminderJobs.delete(key);
    console.log(`Cancelled reminder: ${key}`);
  });
}

async function sendSessionReminder(userId, user, session, timeLabel) {
  try {
    // Send email notification (implement with your email service)
    await sendEmail({
      to: user.email,
      subject: `Reminder: ${session.title} starts in ${timeLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Your session is starting soon!</h2>
          <p>Hi ${user.name},</p>
          <p>This is a reminder that your booked session "<strong>${session.title}</strong>" starts in <strong>${timeLabel}</strong>.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Session Details:</h3>
            <p><strong>Title:</strong> ${session.title}</p>
            <p><strong>Instructor:</strong> ${session.instructor}</p>
            <p><strong>Start Time:</strong> ${new Date(session.startTime).toLocaleString()}</p>
            ${session.category ? `<p><strong>Category:</strong> ${session.category}</p>` : ''}
          </div>
          
          ${session.meetingLink ? `
            <a href="${session.meetingLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
              Join Session
            </a>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            See you there!<br>
            The Finance App Team
          </p>
        </div>
      `
    });

    // Create in-app notification
    await db.collection("notifications").insertOne({
      userId: userId,
      title: 'Session Reminder',
      message: `${session.title} starts in ${timeLabel}`,
      type: 'session_reminder',
      referenceId: session._id.toString(),
      isRead: false,
      createdAt: new Date()
    });

    // Update booking to mark reminder sent
    await db.collection("session-bookings").updateOne(
      { sessionId: session._id, userId: userId },
      { $push: { remindersSent: { time: new Date(), label: timeLabel } } }
    );

    console.log(`Sent reminder to ${user.email} for session ${session.title} (${timeLabel})`);
  } catch (error) {
    console.error('Error sending reminder:', error);
  }
}

// Email sending function (configure with your email service)
async function sendEmail({ to, subject, html }) {
  // TODO: Implement with nodemailer, SendGrid, or your email service
  // Example with nodemailer:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: to,
    subject: subject,
    html: html
  });
  */
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
}

// Restore reminders on server restart
async function restoreScheduledReminders() {
  try {
    const upcomingBookings = await db.collection("session-bookings")
      .aggregate([
        {
          $lookup: {
            from: "live-sessions",
            localField: "sessionId",
            foreignField: "_id",
            as: "session"
          }
        },
        { $unwind: "$session" },
        {
          $match: {
            "session.startTime": { $gt: new Date() }
          }
        }
      ])
      .toArray();

    upcomingBookings.forEach(booking => {
      scheduleSessionReminders(
        booking.sessionId.toString(),
        booking.userId,
        booking.session,
        { email: booking.userEmail, name: booking.userName }
      );
    });

    console.log(`✓ Restored ${upcomingBookings.length} session reminders`);
  } catch (error) {
    console.error('Error restoring reminders:', error);
  }
}

module.exports = { restoreScheduledReminders };


// ----------------------- Material Books Management -----------------------

// Add this GET endpoint for all books - place it before the /material-books/:id endpoint
app.get("/material-books", async (req, res) => {
  console.log("📚 Fetching books and Images..............");
  try {
    // Simple query without aggregation first
    const books = await db.collection("material-books").find({}).toArray();
    
    // Then fetch images separately for books that have image references
    const booksWithImages = await Promise.all(
      books.map(async (book) => {
        if (book.image && ObjectId.isValid(book.image)) {
          try {
            const imageDoc = await db.collection("images").findOne({ 
              _id: new ObjectId(book.image) 
            });
            return {
              ...book,
              displayImage: imageDoc ? imageDoc.data : null,
              hasImage: !!imageDoc
            };
          } catch (imageErr) {
            console.warn(`⚠️ Could not fetch image for book ${book._id}`);
            return {
              ...book,
              displayImage: null,
              hasImage: false
            };
          }
        }
        return {
          ...book,
          displayImage: null,
          hasImage: false
        };
      })
    );

    console.log(`✅ Found ${booksWithImages.length} books`);
    res.json(booksWithImages);
  } catch (err) {
    console.error("❌ Failed to fetch books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

app.post("/material-books", requireAuth, requireAdmin, async (req, res) => {
  try {
    const book = {
      ...req.body,
      createdAt: new Date(),
      createdBy: req.user.uid
    };
    const result = await db.collection("material-books").insertOne(book);
    res.status(201).json({ _id: result.insertedId, ...book });
  } catch (err) {
    console.error("Failed to create book:", err);
    res.status(500).json({ error: "Failed to create book" });
  }
});

app.get("/material-books/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    
    const book = await db.collection("material-books")
      .aggregate([
        // Match the specific book
        {
          $match: {
            $or: [
              { book_id: bookId },
              { _id: ObjectId.isValid(bookId) ? new ObjectId(bookId) : null }
            ]
          }
        },
        // Convert image string to ObjectId
        {
          $addFields: {
            imageObjectId: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$image", null] },
                    { $ne: ["$image", ""] },
                    { $regexMatch: { input: "$image", regex: /^[0-9a-fA-F]{24}$/ } }
                  ]
                },
                then: { $toObjectId: "$image" },
                else: null
              }
            }
          }
        },
        // Lookup image
        {
          $lookup: {
            from: "images",
            localField: "imageObjectId",
            foreignField: "_id",
            as: "imageData"
          }
        },
        {
          $unwind: {
            path: "$imageData",
            preserveNullAndEmptyArrays: true
          }
        },
        // Add displayImage
        {
          $addFields: {
            displayImage: {
              $cond: {
                if: { $ne: ["$imageData.data", null] },
                then: "$imageData.data",
                else: null
              }
            }
          }
        },
        {
          $project: {
            imageObjectId: 0,
            imageData: 0
          }
        }
      ],{ allowDiskUse: true })
      .toArray();

    if (!book || book.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(book[0]);
  } catch (err) {
    console.error("Failed to fetch book:", err);
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

app.put("/material-books/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    const result = await db.collection("material-books").findOneAndUpdate(
      {
        $or: [
          { book_id: req.params.id },
          { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
        ]
      },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Book not found" });
  } catch (err) {
    console.error("Failed to update book:", err);
    res.status(500).json({ error: "Failed to update book" });
  }
});

app.delete("/material-books/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.collection("material-books").deleteOne({
      $or: [
        { book_id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ]
    });
    result.deletedCount ? res.json({ message: "Book deleted" }) : res.status(404).json({ message: "Book not found" });
  } catch (err) {
    console.error("Failed to delete book:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// ----------------------- Transactions Management -----------------------
app.post("/transactions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const txn = {
      ...req.body,
      createdAt: new Date(),
      createdBy: req.user.uid
    };
    const result = await db.collection("transactions").insertOne(txn);
    res.status(201).json({ _id: result.insertedId, ...txn });
  } catch (err) {
    console.error("Failed to create transaction:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

app.get("/transactions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const txns = await db.collection("transactions").find().toArray();
    res.json(txns);
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.get("/transactions/:payment_id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const txn = await db.collection("transactions").findOne({ payment_id: req.params.payment_id });
    txn ? res.json(txn) : res.status(404).json({ message: "Transaction not found" });
  } catch (err) {
    console.error("Failed to get transaction:", err);
    res.status(500).json({ error: "Failed to get transaction" });
  }
});

app.put("/transactions/:payment_id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    const result = await db.collection("transactions").findOneAndUpdate(
      { payment_id: req.params.payment_id },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Transaction not found" });
  } catch (err) {
    console.error("Failed to update transaction:", err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

app.delete("/transactions/:payment_id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.collection("transactions").deleteOne({ payment_id: req.params.payment_id });
    result.deletedCount ? res.json({ message: "Transaction deleted" }) : res.status(404).json({ message: "Transaction not found" });
  } catch (err) {
    console.error("Failed to delete transaction:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ----------------------- Dashboard Endpoints -----------------------
app.get("/dashboard/user", requireAuth, async (req, res) => {
  try {
    const user = await db.collection("Users").findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await db.collection("order-summary").find({ uid: req.user.uid }).toArray();
    const courses = await db.collection("material-courses").find().toArray();
    const posts = await db.collection("forum-posts").find({ uid: req.user.uid }).toArray();
    const replies = await db.collection("forum-replies").find({ uid: req.user.uid }).toArray();

    // Calculate progress
    const totalCourses = orders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
    const completedCourses = orders.filter(o => o.status === "Completed").length;
    const progress = {
      totalCourses,
      completedCourses,
      inProgressCourses: totalCourses - completedCourses,
      completionRate: totalCourses ? Math.round((completedCourses / totalCourses) * 100) : 0,
      totalStudyTime: user.totalStudyTime || 0,
      averageScore: user.averageScore || 0,
      certificatesEarned: completedCourses
    };

    // Achievements
    const achievements = [];
    if (completedCourses > 0) achievements.push({ name: "First Course", icon: "🎓", earned: true });
    if (progress.totalStudyTime > 1000) achievements.push({ name: "Study Master", icon: "📖", earned: true });
    if (progress.averageScore > 80) achievements.push({ name: "High Achiever", icon: "⭐", earned: true });

    // Recent activity
    const activity = [
      ...orders.map(o => ({ type: "purchase", title: "Bought a course", time: o.createdAt })),
      ...posts.map(p => ({ type: "forum", title: "Posted in forum", time: p.createdAt })),
      ...replies.map(r => ({ type: "forum_reply", title: "Replied in forum", time: r.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        joinedDate: user.createdAt
      },
      progress,
      achievements,
      recentActivity: activity,
      enrolledCourses: courses.slice(0, 3),
      studyStreak: user.studyStreak || 0,
      weeklyGoals: user.weeklyGoals || { studyHours: { current: 0, target: 5 } }
    });

  } catch (err) {
    console.error("User dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch user dashboard" });
  }
});

app.get("/dashboard/admin", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.collection("Users").find().toArray();
    const courses = await db.collection("material-courses").find().toArray();
    const orders = await db.collection("order-summary").find().toArray();
    const transactions = await db.collection("transactions").find().toArray();
    const reviews = await db.collection("reviews").find().toArray();

    // Stats
    const totalUsers = users.length;
    const revenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const completionRate = orders.length ? Math.round((orders.filter(o => o.status === "Completed").length / orders.length) * 100) : 0;
    const avgRating = reviews.length ? Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) : 0;

    // Top performers
    const userStats = {};
    orders.forEach(order => {
      if (!userStats[order.userEmail]) userStats[order.userEmail] = { email: order.userEmail, spent: 0 };
      userStats[order.userEmail].spent += order.totalAmount || 0;
    });
    const topPerformers = Object.values(userStats).sort((a, b) => b.spent - a.spent).slice(0, 5);

    res.json({
      stats: { totalUsers, revenue, completionRate, avgRating, courses: courses.length },
      topPerformers,
      recentOrders: orders.slice(-10).reverse(),
      systemAlerts: []
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch admin dashboard" });
  }
});

// ----------------------- Enrollment Management -----------------------
// GET user's enrollments (courses they are enrolled in)
app.get("/user/enrollments", requireAuth, async (req, res) => {
  try {
    const enrollments = await db.collection("enrollments").find({ uid: req.user.uid }).toArray();
    
    // Optionally fetch full course details for each enrollment
    const enrollmentsWithCourses = await Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await db.collection("material-courses").findOne({
          $or: [
            { course_id: enrollment.courseId },
            { _id: ObjectId.isValid(enrollment.courseId) ? new ObjectId(enrollment.courseId) : null }
          ]
        });
        return {
          ...enrollment,
          course: course || null
        };
      })
    );

    res.json(enrollmentsWithCourses);
  } catch (err) {
    console.error("Failed to fetch user enrollments:", err);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

// POST: Enroll user in a course
app.post("/enroll/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const uid = req.user.uid;
    const email = req.user.email;

    // Validate course exists
    const course = await db.collection("material-courses").findOne({
      $or: [
        { course_id: courseId },
        { _id: ObjectId.isValid(courseId) ? new ObjectId(courseId) : null }
      ]
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check if user is already enrolled
    const existingEnrollment = await db.collection("enrollments").findOne({
      uid: uid,
      courseId: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: "User already enrolled in this course" });
    }

    // Create enrollment record
    const enrollment = {
      uid: uid,
      email: email,
      courseId: courseId,
      courseName: course.title,
      enrolledAt: new Date(),
      progress: 0,
      status: "active",
      lastAccessedAt: new Date()
    };

    const result = await db.collection("enrollments").insertOne(enrollment);

    res.status(201).json({
      message: "Enrolled successfully",
      enrollmentId: result.insertedId,
      enrollment: enrollment
    });
  } catch (err) {
    console.error("Enrollment error:", err);
    res.status(500).json({ error: "Failed to enroll in course" });
  }
});

// DELETE: Unenroll user from a course
app.delete("/enroll/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const uid = req.user.uid;

    const result = await db.collection("enrollments").deleteOne({
      uid: uid,
      courseId: courseId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    res.json({ message: "Unenrolled successfully" });
  } catch (err) {
    console.error("Unenrollment error:", err);
    res.status(500).json({ error: "Failed to unenroll from course" });
  }
});

// GET: Check if user is enrolled in a course
app.get("/enroll/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const uid = req.user.uid;

    const enrollment = await db.collection("enrollments").findOne({
      uid: uid,
      courseId: courseId
    });

    res.json({
      isEnrolled: !!enrollment,
      enrollment: enrollment || null
    });
  } catch (err) {
    console.error("Check enrollment error:", err);
    res.status(500).json({ error: "Failed to check enrollment status" });
  }
});

// ----------------------- Paystack Integration -----------------------
app.post("/api/paystack/initialize", requireAuth, async (req, res) => {
  if (!paystack) return res.status(501).json({ error: "Paystack not configured" });
  try {
    const { email, amount } = req.body;
    const response = await paystack.transaction.initialize({
      email: email || req.user.email,
      amount: Math.round((amount || 0) * 100),
      currency: "ZAR",
      metadata: {
        uid: req.user.uid,
        userEmail: req.user.email
      }
    });
    res.json(response);
  } catch (err) {
    console.error("Paystack init error:", err);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

app.get("/api/verify-payment/:reference", requireAuth, async (req, res) => {
  if (!paystack) return res.status(501).json({ error: "Paystack not configured" });
  try {
    const response = await paystack.transaction.verify(req.params.reference);
    if (response.data && response.data.status === "success") {
      const transaction = {
        payment_id: response.data.reference,
        email: response.data.customer.email,
        amount: response.data.amount / 100,
        status: response.data.status,
        uid: req.user.uid,
        userEmail: req.user.email,
        created_at: new Date(),
        gateway_response: response.data.gateway_response,
      };
      await db.collection("transactions").insertOne(transaction);
      res.json({ status: "success", data: response.data });
    } else {
      res.json({ status: "failed", message: "Payment verification failed" });
    }
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Paystack webhook (no auth - Paystack will call this)
app.post("/api/paystack/callback", async (req, res) => {
  try {
    const event = req.body;
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      if (paystack) {
        const response = await paystack.transaction.verify(reference);
        if (response.data && response.data.status === "success") {
          const transaction = {
            payment_id: response.data.reference,
            email: response.data.customer.email,
            amount: response.data.amount / 100,
            status: response.data.status,
            created_at: new Date(),
            gateway_response: response.data.gateway_response,
          };
          await db.collection("transactions").insertOne(transaction);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Callback error:", err);
    res.sendStatus(500);
  }
});

// ----------------------- Error Handling -----------------------
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ----------------------- Server Start -----------------------
// Replace unconditional listen with conditional start and export app
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

/*
  -----------------------
  Testing notes (for contributors)
  -----------------------
  - Tests use NODE_ENV=test and SKIP_AUTH=true to:
    * Prevent automatic process.exit on DB connect failure.
    * Bypass Firebase remote calls in middleware.
  - Tests should call server.connectToMongo() then server.getDb() to share the same DB instance with the app.
  - Always clean up test collections between tests to avoid cross-test interference.
*/

/*
  -----------------------
  Server start & exports
  -----------------------
  - Only call app.listen() when module is executed directly (require.main === module).
  - Export app + helpers (connectToMongo, getDb) via CommonJS so Mocha can require them.
*/
module.exports = app;
module.exports.connectToMongo = connectToMongo;
module.exports.getDb = () => db;

// ----------------------- Helpers -----------------------
/*
  -----------------------
  Helper: resolveIdParam
  -----------------------
  - Accepts route param strings and attempts to return a MongoDB ObjectId when possible.
  - Supports:
    - plain hex string (ObjectId.isValid)
    - JSON-encoded forms like {"_id":"..."} or {"$oid":"..."} (defensive)
  - Returns: new ObjectId(...) or null if unable to resolve.
  - Used by update handlers (PUT /courses/:id, PUT /forum-posts/:id) to robustly match document identifiers.
*/
function resolveIdParam(param) {
  // ...existing code...
  try {
    const parsed = JSON.parse(param);
    if (!parsed) return null;
    if (parsed._id && ObjectId.isValid(parsed._id)) return new ObjectId(parsed._id);
    if (parsed.$oid && ObjectId.isValid(parsed.$oid)) return new ObjectId(parsed.$oid);
    if (parsed.id && ObjectId.isValid(parsed.id)) return new ObjectId(parsed.id);
  } catch (e) {
    // not JSON — ignore and fall through
  }

  return null;
}