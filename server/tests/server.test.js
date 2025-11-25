// tests/server.test.js
/**
 * Backend Integration Tests
 * Tests admin endpoints, image upload, and authentication
 */

const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SKIP_AUTH = 'true';
process.env.MONGO_URI = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
process.env.MONGO_DB_NAME = 'cognition-berries-test';

const app = require('../server');
const { connectToMongo, getDb } = require('../server');

describe('Admin API Tests', () => {
  let db;
  let testCourseId;
  let testImageId;

  beforeAll(async () => {
    // Connect to test database
    db = await connectToMongo();
    
    // Create test admin user
    await db.collection('Users').insertOne({
      uid: 'test-uid',
      email: 'test@example.com',
      name: 'Test Admin',
      role: 'admin',
      createdAt: new Date()
    });

    // Create test course
    const courseResult = await db.collection('material-courses').insertOne({
      course_id: 'TEST-001',
      title: 'Test Course',
      description: 'Test Description',
      price: 99.99,
      createdAt: new Date()
    });
    testCourseId = courseResult.insertedId.toString();
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.collection('Users').deleteMany({ email: 'test@example.com' });
      await db.collection('material-courses').deleteMany({ course_id: 'TEST-001' });
      await db.collection('images').deleteMany({ courseId: testCourseId });
      
      const client = db.client;
      if (client) {
        await client.close();
      }
    }
  });

  describe('Authentication Middleware', () => {
    it('should require authentication for admin endpoints', async () => {
      // Temporarily disable SKIP_AUTH
      const originalSkip = process.env.SKIP_AUTH;
      delete process.env.SKIP_AUTH;

      const response = await request(app)
        .get('/dashboard/admin')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      
      // Restore SKIP_AUTH
      process.env.SKIP_AUTH = originalSkip;
    });

    it('should allow authenticated admin users', async () => {
      const response = await request(app)
        .get('/dashboard/admin')
        .set('Authorization', 'Bearer fake-token-for-test')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
    });
  });

  describe('Admin Dashboard Endpoint', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/dashboard/admin')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body).toMatchObject({
        stats: expect.objectContaining({
          totalUsers: expect.any(Number),
          activeUsers: expect.any(Number),
          revenue: expect.any(Number),
          courses: expect.any(Number),
          completionRate: expect.any(Number),
          averageScore: expect.any(Number)
        }),
        topPerformers: expect.any(Array),
        recentOrders: expect.any(Array),
        recentTransactions: expect.any(Array),
        systemAlerts: expect.any(Array)
      });
    });

    it('should support time range filtering', async () => {
      const response = await request(app)
        .get('/dashboard/admin?range=30d')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body.stats).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/dashboard/admin?page=1&limit=5')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
        total: expect.any(Number)
      });
    });
  });

  describe('Course Image Upload', () => {
    it('should upload a valid base64 image', async () => {
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await request(app)
        .post(`/courses/${testCourseId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({
          image: testImage,
          filename: 'test.png'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Course image uploaded successfully',
        imageId: expect.any(String),
        imageUrl: expect.stringContaining('/api/images/')
      });

      testImageId = response.body.imageId;
    });

    it('should reject invalid image format', async () => {
      const response = await request(app)
        .post(`/courses/${testCourseId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({
          image: 'not-a-valid-image',
          filename: 'test.png'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid image format');
    });

    it('should reject oversized images', async () => {
      // Create a large base64 string (> 5MB)
      const largeData = 'A'.repeat(7 * 1024 * 1024);
      const largeImage = `data:image/png;base64,${largeData}`;

      const response = await request(app)
        .post(`/courses/${testCourseId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({
          image: largeImage,
          filename: 'large.png'
        })
        .expect(400);

      expect(response.body.error).toContain('too large');
    });

    it('should reject invalid course ID', async () => {
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await request(app)
        .post('/courses/invalid-id')
        .set('Authorization', 'Bearer fake-token')
        .send({
          image: testImage,
          filename: 'test.png'
        })
        .expect(404);

      expect(response.body.error).toBe('Course not found');
    });
  });

  describe('Image Retrieval', () => {
    it('should retrieve uploaded image', async () => {
      if (!testImageId) {
        // Upload an image first
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const uploadResponse = await request(app)
          .post(`/courses/${testCourseId}`)
          .set('Authorization', 'Bearer fake-token')
          .send({ image: testImage, filename: 'test.png' });
        testImageId = uploadResponse.body.imageId;
      }

      const response = await request(app)
        .get(`/api/images/${testImageId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testImageId,
        data: expect.stringContaining('data:image'),
        mimeType: expect.any(String),
        filename: expect.any(String),
        uploadedAt: expect.any(String)
      });
    });

    it('should return 404 for non-existent image', async () => {
      const fakeId = new ObjectId().toString();
      
      const response = await request(app)
        .get(`/api/images/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Image not found');
    });

    it('should reject invalid image ID format', async () => {
      const response = await request(app)
        .get('/api/images/invalid-id')
        .expect(400);

      expect(response.body.error).toContain('Invalid image ID');
    });
  });

  describe('Image Deletion', () => {
    it('should delete course image', async () => {
      // First upload an image
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const uploadResponse = await request(app)
        .post(`/courses/${testCourseId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({ image: testImage, filename: 'test.png' });

      expect(uploadResponse.status).toBe(200);

      // Now delete it
      const deleteResponse = await request(app)
        .delete(`/courses/${testCourseId}/image`)
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(deleteResponse.body.message).toBe('Course image deleted successfully');

      // Verify it's deleted from images collection
      const imageDoc = await db.collection('images').findOne({ 
        _id: new ObjectId(uploadResponse.body.imageId) 
      });
      expect(imageDoc).toBeNull();
    });

    it('should return 400 when trying to delete non-existent image', async () => {
      const response = await request(app)
        .delete(`/courses/${testCourseId}/image`)
        .set('Authorization', 'Bearer fake-token')
        .expect(400);

      expect(response.body.error).toBe('Course has no image');
    });
  });

  describe('Courses with Image Aggregation', () => {
    it('should return courses with imageData populated', async () => {
      // Upload an image first
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      await request(app)
        .post(`/courses/${testCourseId}`)
        .set('Authorization', 'Bearer fake-token')
        .send({ image: testImage, filename: 'test.png' });

      const response = await request(app)
        .get('/courses')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Find our test course
      const testCourse = response.body.find(c => c._id.toString() === testCourseId);
      expect(testCourse).toBeDefined();
      expect(testCourse.imageData).toBeDefined();
      expect(testCourse.imageData.data).toContain('data:image');
    });
  });
});