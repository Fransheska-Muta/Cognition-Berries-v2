const { expect } = require("chai");

// Import server helpers using CommonJS
const server = require("../server");
const connectToMongo = server.connectToMongo;
const getDb = server.getDb;

describe("MongoDB Test Setup", function () {
  let db;

  before(async function () {
    // ensure NODE_ENV is 'test' so server doesn't auto-connect or exit
    process.env.NODE_ENV = process.env.NODE_ENV || "test";

    // Connect to mongo using exported helper
    await connectToMongo();
    db = getDb();
  });

  it("should have Users collection", async function () {
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);
    expect(names).to.include("Users");
  });

  it("should be able to insert a test user", async function () {
    const user = { name: "Test User", email: `test+${Date.now()}@example.com` };
    const result = await db.collection("Users").insertOne(user);
    expect(result.insertedId).to.exist;
  });
});
