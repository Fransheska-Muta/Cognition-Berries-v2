const dotenv = require("dotenv");
require("dotenv").config();

dotenv.config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const cors = require("cors");
const Paystack = require("paystack-api");
const admin = require("firebase-admin");
const path = require("path");
const dns = require("dns");
// Fix MongoDB SRV DNS resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, param, validationResult } = require("express-validator");
const { GoogleGenAI } = require("@google/genai");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const Base_API = process.env.VITE_BASE_API || "52.44.223.219";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const paystack = PAYSTACK_SECRET_KEY ? Paystack(PAYSTACK_SECRET_KEY) : null;

// ======================= Security Middleware =======================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 auth attempts per 15 minutes
  message: "Too many authentication attempts, please try again later."
});

app.use("/api/", limiter);

// Body parser with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS configuration — single unified config merging env overrides + hardcoded S3 origin
const defaultAllowedOrigins = [
  "http://52.44.223.219:3000",
  "http://localhost:5173",
  "http://cognition-berries.s3-website-us-east-1.amazonaws.com",
];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
// Explicitly handle OPTIONS preflight for all routes
app.options("*", cors(corsOptions));

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
  if (db) return db;

  const client = new MongoClient(process.env.MONGO_URI, {
    // Remove deprecated options
  });
  try {
    console.log("MONGO_URI =", process.env.MONGO_URI);
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || "cognition-berries");
    console.log("✅ Connected to MongoDB");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
}

function restoreScheduledReminders() {
  console.log("⏰ Restoring scheduled reminders from DB...");
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

// ======================= Validation Middleware =======================

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array()
    });
  }
  next();
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '');
};

const isValidObjectId = (id) => {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
};

// ----------------------- Auth middleware -----------------------
async function requireAuth(req, res, next) {
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

app.get("/", (req, res) =>
  res.json({
    message: "Cognition Berries API",
    env: process.env.NODE_ENV || "development"
  })
);

app.post("/users", async (req, res) => {
  try {
    const { uid, email, name, role } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "uid and email are required" });
    }

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

// ----------------------- Public Courses (browseable) -----------------------
app.get("/courses", requireAuth, async (req, res) => {
  try {
    if (!db) await connectToMongo();

    const courses = await db.collection("material-courses")
      .aggregate([
        {
          $addFields: {
            imageObjectId: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$image", null] },
                    { $ne: ["$image", ""] },
                    { $eq: [{ $strLenCP: "$image" }, 24] },
                    { $regexMatch: { input: "$image", regex: /^[0-9a-fA-F]{24}$/ } }
                  ]
                },
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
          $addFields: {
            displayImage: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$imageData", null] },
                    { $ne: ["$imageData.data", null] },
                    { $ne: ["$imageData.data", ""] }
                  ]
                },
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
      ])
      .toArray();

    res.json(courses);
  } catch (err) {
    console.error("❌ Failed to fetch courses:", err);
    res.status(500).json({
      error: "Failed to fetch courses",
      details: err.message
    });
  }
});

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

    if (image.data && image.data.startsWith('data:image/')) {
      return res.json({
        id: image._id,
        data: image.data,
        mimeType: image.mimeType,
        filename: image.filename,
        uploadedAt: image.uploadedAt
      });
    }

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

    res.json({
      id: image._id,
      data: image.data,
      mimeType: image.mimeType,
      filename: image.filename
    });
  } catch (err) {
    console.error("❌ Image retrieval error:", err);
    res.status(500).json({ error: "Failed to retrieve image", details: err.message });
  }
});

// ----------------------- Protected routes (requireAuth) -----------------------

app.get("/reviews", requireAuth, async (req, res) => {
  try {
    const reviews = await db.collection("reviews").find().toArray();
    res.json(reviews);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.get("/material-books", requireAuth, async (req, res) => {
  try {
    if (!db) await connectToMongo();

    const books = await db.collection("material-books")
      .aggregate([
        {
          $addFields: {
            imageObjectId: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$image", null] },
                    { $ne: ["$image", ""] },
                    { $eq: [{ $strLenCP: "$image" }, 24] },
                    { $regexMatch: { input: "$image", regex: /^[0-9a-fA-F]{24}$/ } }
                  ]
                },
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
          $addFields: {
            displayImage: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$imageData", null] },
                    { $ne: ["$imageData.data", null] },
                    { $ne: ["$imageData.data", ""] }
                  ]
                },
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
        },
        {
          $sort: { updatedAt: -1 }
        }
      ])
      .toArray();

    res.json(books);
  } catch (err) {
    console.error("❌ Failed to fetch books:", err);
    res.status(500).json({
      error: "Failed to fetch books",
      details: err.message
    });
  }
});

// Public forum posts
app.get("/forum-posts", async (req, res) => {
  try {
    const posts = await db.collection("forum-posts").find().toArray();
    res.json(posts);
  } catch (err) {
    console.error("Failed to fetch forum posts:", err);
    res.status(500).json({ error: "Failed to get forum posts" });
  }
});

// Public forum replies
app.get("/forum-replies", async (req, res) => {
  try {
    const replies = await db.collection("forum-replies").find().toArray();
    res.json(replies);
  } catch (err) {
    console.error("Failed to fetch forum replies:", err);
    res.status(500).json({ error: "Failed to get replies" });
  }
});

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

app.post("/courses/:id/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { image, filename } = req.body;
    const courseId = req.params.id;

    const course = await db.collection("material-courses").findOne({
      $or: [
        { course_id: courseId },
        { _id: ObjectId.isValid(courseId) ? new ObjectId(courseId) : null }
      ]
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

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

    if (course.image && ObjectId.isValid(course.image)) {
      await db.collection("images").deleteOne({
        _id: new ObjectId(course.image)
      });
    }

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

// ----------------------- Progress Tracking System -----------------------

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

app.get("/api/progress/:courseId", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const uid = req.user.uid;

    let progress = await db.collection("UserCourseProgress").findOne({ uid, courseId });

    if (!progress) {
      progress = {
        uid,
        courseId,
        completedLessons: [],
        lastAccessedLesson: null,
        completionPercentage: 0,
        updatedAt: new Date()
      };
    }

    res.json(progress);
  } catch (err) {
    console.error("Failed to fetch course progress:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

app.post("/api/progress/update", requireAuth, async (req, res) => {
  try {
    const { courseId, lessonId, completed } = req.body;
    const uid = req.user.uid;

    if (!courseId || !lessonId) {
      return res.status(400).json({ error: "courseId and lessonId are required" });
    }

    let progress = await db.collection("UserCourseProgress").findOne({ uid, courseId });
    let completedLessons = progress?.completedLessons || [];

    if (completed) {
      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);
      }
    } else {
      completedLessons = completedLessons.filter(id => id !== lessonId);
    }

    const completionPercentage = await calculateProgressPercentage(courseId, completedLessons);

    const updateData = {
      uid,
      courseId,
      completedLessons,
      lastAccessedLesson: lessonId,
      completionPercentage,
      updatedAt: new Date()
    };

    await db.collection("UserCourseProgress").updateOne(
      { uid, courseId },
      { $set: updateData },
      { upsert: true }
    );

    res.json({ message: "Progress updated", progress: updateData });
  } catch (err) {
    console.error("Failed to update progress:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

// ======================= Financial AI Tutor (Gemini API) =======================

const tutorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: "You're sending messages too fast. Please slow down."
  }
});

let gemini = null;

if (process.env.GEMINI_API_KEY) {
  gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  console.log("✅ Gemini AI configured");
} else {
  console.warn(
    "⚠️ GEMINI_API_KEY is missing. AI tutor will not work."
  );
}

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


// ======================= Gemini Generator =======================

async function generateGeminiResponse(contents) {
  if (!gemini) {
    throw new Error("Gemini AI is not configured.");
  }

  const modelsToTry = [
    GEMINI_MODEL,
    "gemini-2.5-flash-lite"
  ].filter(
    (model, index, array) =>
      array.indexOf(model) === index
  );

  let lastError = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(
          `🤖 Gemini model ${model} - attempt ${
            attempt + 1
          }/3`
        );

        const response =
          await gemini.models.generateContent({
            model,

            contents,

            config: {
              systemInstruction: `
You are the AI Financial Tutor for Cognition Berries.

Your purpose is to help students understand financial literacy and personal finance concepts.

You can explain:

- Budgeting
- Saving
- Emergency funds
- Credit cards
- Credit scores
- Debt
- Loans
- Interest
- Compound interest
- Banking
- Inflation
- Investing basics
- Retirement concepts
- Financial terminology
- Risk
- Diversification
- Personal finance fundamentals

TEACHING STYLE:

- Explain concepts in simple language.
- Assume the student may be a beginner.
- Avoid unnecessary jargon.
- Give simple examples when helpful.
- Break complicated ideas into small steps.
- Be friendly, patient, encouraging, and non-judgmental.
- Ask a short follow-up question when useful.
- Keep answers concise enough for a chat interface.
- Use bullets when they make an explanation easier to understand.

FINANCIAL SAFETY:

This is an educational financial literacy tool and not a financial adviser.

Do NOT:

- Recommend specific stocks.
- Recommend specific cryptocurrencies.
- Recommend specific ETFs.
- Recommend specific mutual funds.
- Recommend specific brokers.
- Tell users exactly what investments they should buy.
- Tell users exactly what investments they should sell.
- Make personalized investment decisions.
- Promise financial returns.

You MAY:

- Explain general investment concepts.
- Explain diversification.
- Explain investment risk.
- Explain compound interest.
- Explain different types of investments at a general educational level.
- Explain how financial products generally work.

If someone asks for personalized financial advice, explain the general concept and encourage them to speak with a qualified financial professional.

If the user asks something unrelated to financial education, politely explain that your main purpose is financial literacy and offer to help with a related financial topic.
`,

              temperature: 0.4,

              // FIX: was 600, which was too low for this system prompt +
              // "explain in small steps" teaching style. Gemini was hitting
              // this ceiling mid-explanation and getting cut off (e.g.
              // stopping right after "At its simplest, investing means...").
              // Raised to 1200 to give full answers room to finish.
              maxOutputTokens: 1200
            }
          });

        console.log(
          `✅ Gemini response generated using ${model}`
        );

        return response;

      } catch (error) {
        lastError = error;

        const status =
          error?.status ||
          error?.code ||
          error?.response?.status;

        console.error(
          `❌ Gemini ${model} attempt ${
            attempt + 1
          } failed:`,
          error?.message || error
        );

        // Don't retry invalid API requests,
        // authentication failures, etc.
        const retryableStatuses = [
          429,
          500,
          502,
          503,
          504
        ];

        if (!retryableStatuses.includes(status)) {
          throw error;
        }

        // Exponential backoff:
        // 1 sec -> 2 sec -> 4 sec
        const delay =
          1000 * Math.pow(2, attempt);

        console.log(
          `⏳ Retrying in ${delay / 1000}s...`
        );

        await sleep(delay);
      }
    }

    console.log(
      `⚠️ Model ${model} is unavailable.`
    );
  }

  throw lastError;
}


// ======================= AI Tutor Route =======================
//
// FIX: The frontend (AiTutorModal.jsx -> api.js) was calling
// POST /ai-tutor (hyphen), but this route was only registered
// at POST /ai/tutor (slash). That mismatch is what produced the
// "Cannot POST /ai-tutor" 404 you were seeing.
//
// The handler is now extracted into a named function and mounted
// at BOTH paths, so it works regardless of which one the frontend
// calls. Once you've confirmed everything works, feel free to pick
// just one path and update your frontend `api.js` to match, then
// remove the other `app.post(...)` line below.

const aiTutorHandler = async (req, res) => {
  try {
    const { messages } = req.body;

    // Validate request
    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return res.status(400).json({
        error: "Messages array is required."
      });
    }

    // Check Gemini configuration
    if (!gemini) {
      console.error(
        "❌ GEMINI_API_KEY is not configured."
      );

      return res.status(500).json({
        error:
          "AI tutor service is not configured."
      });
    }

    // Keep only the latest 12 messages
    const recentMessages =
      messages.slice(-12);

    // Convert frontend format to Gemini format
    let geminiMessages =
      recentMessages
        .map((message) => {
          const role =
            message.role === "assistant"
              ? "model"
              : "user";

          const text = String(
            message.content || ""
          )
            .trim()
            .slice(0, 2000);

          return {
            role,
            parts: [
              {
                text
              }
            ]
          };
        })
        .filter(
          (message) =>
            message.parts[0].text.length > 0
        );

    // Gemini conversations should begin
    // with a user message.
    while (
      geminiMessages.length > 0 &&
      geminiMessages[0].role !== "user"
    ) {
      geminiMessages.shift();
    }

    if (geminiMessages.length === 0) {
      return res.status(400).json({
        error: "A user message is required."
      });
    }

    // Gemini expects alternating roles.
    // Combine consecutive messages from the same role.
    const normalizedMessages = [];

    for (const message of geminiMessages) {
      const lastMessage =
        normalizedMessages[
          normalizedMessages.length - 1
        ];

      if (
        lastMessage &&
        lastMessage.role === message.role
      ) {
        lastMessage.parts[0].text +=
          "\n\n" +
          message.parts[0].text;
      } else {
        normalizedMessages.push({
          role: message.role,
          parts: [
            {
              text: message.parts[0].text
            }
          ]
        });
      }
    }

    console.log(
      `🤖 AI Tutor request from ${
        req.user?.email ||
        req.user?.uid ||
        "unknown user"
      }`
    );

    // Ask Gemini
    const response =
      await generateGeminiResponse(
        normalizedMessages
      );

    let aiText =
      response?.text ||
      "I couldn't generate a response. Please try again.";

    // FIX (safety net): if a reply still hits the token cap even after
    // raising maxOutputTokens, let the user know it was cut off instead
    // of silently ending mid-sentence, and invite them to continue.
    const finishReason =
      response?.candidates?.[0]?.finishReason;

    if (finishReason === "MAX_TOKENS") {
      console.warn(
        "⚠️ Gemini response hit maxOutputTokens and was truncated."
      );
      aiText +=
        "\n\n*(That answer got a bit long — ask me to continue if you'd like the rest!)*";
    }

    // Return response to frontend
    return res.json({
      reply: aiText,
      response: aiText,
      message: aiText
    });

  } catch (error) {
    console.error(
      "❌ Gemini AI Tutor Error:",
      error
    );

    const status =
      error?.status ||
      error?.code;

    // Gemini temporarily unavailable
    if (
      status === 503 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 504
    ) {
      return res.status(503).json({
        error:
          "The AI tutor is temporarily busy. Please try again in a few seconds."
      });
    }

    return res.status(500).json({
      error:
        "Internal server error contacting AI tutor."
    });
  }
};

// Mounted at both paths — see FIX note above.
app.post("/ai/tutor", requireAuth, tutorLimiter, aiTutorHandler);
app.post("/ai-tutor", requireAuth, tutorLimiter, aiTutorHandler);



// ----------------------- Cart & Checkout -----------------------

app.get("/cart", requireAuth, async (req, res) => {
  try {
    const cartItems = await db.collection("Cart").find({ uid: req.user.uid }).toArray();
    res.json(cartItems);
  } catch (err) {
    console.error("Failed to fetch cart:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

app.post("/cart", requireAuth, async (req, res) => {
  try {
    const { itemId, itemType, title, price, image } = req.body;
    const cartItem = {
      uid: req.user.uid,
      itemId,
      itemType,
      title,
      price: Number(price),
      image,
      addedAt: new Date()
    };
    const result = await db.collection("Cart").insertOne(cartItem);
    res.status(201).json({ _id: result.insertedId, ...cartItem });
  } catch (err) {
    console.error("Failed to add to cart:", err);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

app.delete("/cart/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("Cart").deleteOne({
      _id: new ObjectId(req.params.id),
      uid: req.user.uid
    });
    result.deletedCount ? res.json({ message: "Item removed" }) : res.status(404).json({ error: "Item not found" });
  } catch (err) {
    console.error("Failed to delete cart item:", err);
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
});

// ----------------------- Forum Write Operations -----------------------

app.post("/forum-posts", requireAuth, async (req, res) => {
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
    console.error("Failed to create forum post:", err);
    res.status(500).json({ error: "Failed to create forum post" });
  }
});

app.post("/forum-replies", requireAuth, async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content) {
      return res.status(400).json({ error: "postId and content are required" });
    }

    const reply = {
      postId,
      uid: req.user.uid,
      authorName: req.user.name || "Anonymous",
      content: sanitizeInput(content),
      createdAt: new Date()
    };

    const result = await db.collection("forum-replies").insertOne(reply);

    await db.collection("forum-posts").updateOne(
      { _id: ObjectId.isValid(postId) ? new ObjectId(postId) : postId },
      { $inc: { repliesCount: 1 } }
    );

    res.status(201).json({ _id: result.insertedId, ...reply });
  } catch (err) {
    console.error("Failed to submit reply:", err);
    res.status(500).json({ error: "Failed to submit reply" });
  }
});

// Universal Error Handler
app.use((err, req, res, next) => {
  console.error("Uncaught Server Error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// ======================= Server Startup =======================

async function startServer() {
  try {
    console.log("🚀 Starting Cognition Berries server...");

    // Connect to MongoDB first
    await connectToMongo();

    console.log("✅ MongoDB connection ready");

    // Create required collections after DB connection exists
    await ensureCollections();

    console.log("✅ Database collections verified");

    // Restore scheduled reminders
    restoreScheduledReminders();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? "configured" : "NOT CONFIGURED"}`);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}


// Only start server when this file is executed directly
if (require.main === module && process.env.NODE_ENV !== "test") {
  startServer();
}


// Export for testing
module.exports = app;
module.exports.connectToMongo = connectToMongo;
module.exports.getDb = () => db;