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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const Base_API = process.env.BASE_API || "localhost";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const paystack = PAYSTACK_SECRET_KEY ? Paystack(PAYSTACK_SECRET_KEY) : null;

app.use(express.json());
app.use(cors());
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
  const client = new MongoClient(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || "cognition-berries");
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}
connectToMongo();

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

    // Ensure user exists in MongoDB
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

// Public courses listing
app.get("/courses", async (req, res) => {
  try {
    const courses = await db.collection("material-courses").find().toArray();
    res.json(courses);
  } catch (err) {
    console.error("Failed to fetch courses:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Public reviews
app.get("/reviews", async (req, res) => {
  try {
    const reviews = await db.collection("reviews").find().toArray();
    res.json(reviews);
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Public material-books
app.get("/material-books", async (req, res) => {
  try {
    const books = await db.collection("material-books").find().toArray();
    res.json(books);
  } catch (err) {
    console.error("Failed to fetch books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

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
    const course = await db.collection("material-courses").findOne({ 
      $or: [
        { course_id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ]
    });
    course ? res.json(course) : res.status(404).json({ message: "Course not found" });
  } catch (err) {
    console.error("Failed to get course:", err);
    res.status(500).json({ error: "Failed to get course" });
  }
});

app.put("/courses/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    updates.updatedBy = req.user.uid;
    const result = await db.collection("material-courses").findOneAndUpdate(
      { 
        $or: [
          { course_id: req.params.id },
          { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
        ]
      },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Course not found" });
  } catch (err) {
    console.error("Failed to update course:", err);
    res.status(500).json({ error: "Failed to update course" });
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

// ----------------------- Reviews Management -----------------------
app.post("/reviews", requireAuth, async (req, res) => {
  try {
    const review = {
      ...req.body,
      uid: req.user.uid,
      userEmail: req.user.email,
      createdAt: new Date()
    };
    const result = await db.collection("reviews").insertOne(review);
    res.status(201).json({ _id: result.insertedId, ...review });
  } catch (err) {
    console.error("Failed to create review:", err);
    res.status(500).json({ error: "Unsuccessful review save, something went wrong" });
  }
});

app.get("/reviews/:id", async (req, res) => {
  try {
    const review = await db.collection("reviews").findOne({ 
      $or: [
        { review_id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ]
    });
    review ? res.json(review) : res.status(404).json({ message: "Review not found" });
  } catch (err) {
    console.error("Failed to get review:", err);
    res.status(500).json({ error: "Failed to get review" });
  }
});

app.put("/reviews/:id", requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = new Date();
    const result = await db.collection("reviews").findOneAndUpdate(
      { 
        $and: [
          { uid: req.user.uid }, // Only allow users to update their own reviews
          {
            $or: [
              { review_id: req.params.id },
              { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
            ]
          }
        ]
      },
      { $set: updates },
      { returnDocument: "after" }
    );
    result.value ? res.json(result.value) : res.status(404).json({ message: "Review not found or access denied" });
  } catch (err) {
    console.error("Failed to update review:", err);
    res.status(500).json({ error: "Failed to update review" });
  }
});

app.delete("/reviews/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("reviews").deleteOne({ 
      $and: [
        { uid: req.user.uid }, // Only allow users to delete their own reviews
        {
          $or: [
            { review_id: req.params.id },
            { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
          ]
        }
      ]
    });
    result.deletedCount ? res.json({ message: "Review deleted" }) : res.status(404).json({ message: "Review not found or access denied" });
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
    const result = await db.collection("forum-posts").findOneAndUpdate(
      { 
        $and: [
          { uid: req.user.uid }, // Only allow users to update their own posts
          {
            $or: [
              { post_id: req.params.id },
              { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
            ]
          }
        ]
      },
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
    const sessions = await db.collection("live_sessions")
      .find({})
      .sort({ startTime: 1 })
      .toArray();

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
        recordingAvailable: session.recordingAvailable || false
      };
    });

    res.json(processedSessions);
  } catch (error) {
    console.error("Error fetching live sessions:", error);
    res.status(500).json({ error: "Failed to fetch live sessions" });
  }
});

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

    const result = await db.collection("live_sessions").insertOne(newSession);
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

app.put("/live-sessions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date(), updatedBy: req.user.uid };
    const result = await db.collection("live_sessions").findOneAndUpdate(
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

app.delete("/live-sessions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.collection("live_sessions").deleteOne({
      $or: [
        { session_id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ]
    });
    result.deletedCount ? res.json({ message: "Session deleted" }) : res.status(404).json({ message: "Session not found" });
  } catch (err) {
    console.error("Failed to delete session:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// ----------------------- Material Books Management -----------------------
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
    const book = await db.collection("material-books").findOne({
      $or: [
        { book_id: req.params.id },
        { _id: ObjectId.isValid(req.params.id) ? new ObjectId(req.params.id) : null }
      ]
    });
    book ? res.json(book) : res.status(404).json({ message: "Book not found" });
  } catch (err) {
    console.error("Failed to get book:", err);
    res.status(500).json({ error: "Failed to get book" });
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
app.listen(PORT, () => {
  console.log(`Server running at http://${Base_API}:${PORT}`);
});