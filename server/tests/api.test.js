process.env.NODE_ENV = "test";
process.env.SKIP_AUTH = "true"; // ✅ Skip real Firebase validation during tests

const chai = require("chai");
const request = require("supertest");
const { expect } = chai;

// ✅ Import server + db helpers
const server = require("../server");
const connectToMongo = server.connectToMongo;
const getDb = server.getDb;

let db;
const testUser = {
  uid: "test-uid",
  email: "test@example.com",
  name: "Test User",
  role: "admin"
};

// ✅ Helper for sending fake user into auth middleware
function withAuth(req) {
  return req.set("x-test-user", JSON.stringify(testUser));
}

before(async () => {
  await connectToMongo();
  db = getDb();

  // Clean database
  await db.collection("Users").deleteMany({});
  await db.collection("material-courses").deleteMany({});
  await db.collection("forum-posts").deleteMany({});

  // Seed test admin user
  await db.collection("Users").insertOne({
    ...testUser,
    createdAt: new Date()
  });
});

after(async () => {
  await db.collection("Users").deleteMany({});
  await db.collection("material-courses").deleteMany({});
  await db.collection("forum-posts").deleteMany({});
});

describe("✅ Cognition Berries API", () => {

  it("GET / → should return welcome message", async () => {
    const res = await request(server).get("/");
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("message", "Cognition Berries API");
  });

  describe("🧑‍💻 User Routes", () => {
    it("POST /users → should register a new user", async () => {
      const res = await request(server)
        .post("/users")
        .send({
          uid: `user-${Date.now()}`,
          email: `user${Date.now()}@example.com`,
          name: "New User"
        });
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("message", "User registered");
    });

    it("GET /me → should get logged-in user's profile", async () => {
      const res = await withAuth(request(server).get("/me"));
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("uid", testUser.uid);
    });
  });

  describe("📚 Courses Routes (CRUD)", () => {
    let courseId;

    it("POST /courses → create course", async () => {
      const res = await withAuth(
        request(server).post("/courses")
      ).send({
        title: "Test Course",
        description: "Course for testing"
      });
      expect(res.status).to.equal(201);
      courseId = res.body._id;
    });

    it("GET /courses → should list all courses", async () => {
      const res = await request(server).get("/courses");
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array");
    });

    it("PUT /courses/:id → should update course", async () => {
      const res = await withAuth(
        request(server).put(`/courses/${courseId}`)
      ).send({ description: "Updated description" });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("description", "Updated description");
    });

    it("DELETE /courses/:id → should delete course", async () => {
      const res = await withAuth(
        request(server).delete(`/courses/${courseId}`)
      );
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("message", "Course deleted");
    });
  });

  describe("💬 Forum Post Routes", () => {
    let postId;

    it("POST /forum-posts → create forum post", async () => {
      const res = await withAuth(
        request(server).post("/forum-posts")
      ).send({
        title: "Hello Forum",
        content: "Testing forum post",
        uid: testUser.uid // ✅ ensures ownership
      });
      postId = res.body._id;
      expect(res.status).to.equal(201);
    });

    it("PUT /forum-posts/:id → update forum post", async () => {
      const res = await withAuth(
        request(server).put(`/forum-posts/${postId}`)
      ).send({
        content: "Updated forum content"
      });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("content", "Updated forum content");
    });

    it("DELETE /forum-posts/:id → delete forum post", async () => {
      const res = await withAuth(
        request(server).delete(`/forum-posts/${postId}`)
      );
      expect(res.status).to.equal(200);
    });
  });
});
