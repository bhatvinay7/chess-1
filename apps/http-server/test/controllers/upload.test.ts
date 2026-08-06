import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.NODE_ENV = 'test';

// Mock Cloudinary upload service
jest.mock('../../src/services/uploadService.js', () => ({
  uploadToCloudinary: jest.fn().mockImplementation((buffer, folder) => {
    return Promise.resolve({
      secure_url: `https://fake-cloudinary.com/${folder}/fake-image.jpg`,
      public_id: `fake_public_id_${Date.now()}`
    });
  })
}));

describe('Upload Controller', () => {
  let testFilePath: string;

  beforeAll(() => {
    // Create a dummy file for testing uploads
    testFilePath = path.join(__dirname, 'test-image.jpg');
    fs.writeFileSync(testFilePath, 'dummy image content');
  });

  afterAll(() => {
    // Clean up dummy file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should upload a single file', async () => {
    const res = await request(app)
      .post('/api/v1/upload/single')
      .field('folder', 'test_folder')
      .attach('file', testFilePath);
      
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Upload successful');
    expect(typeof res.body.url).toBe('string');
    expect(res.body.publicId).toBeDefined();
  }, 15000);

  it('should reject single upload if no file is provided', async () => {
    const res = await request(app)
      .post('/api/v1/upload/single')
      .field('folder', 'test_folder');
      
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No file uploaded');
  }, 15000);

  it('should upload multiple files', async () => {
    const res = await request(app)
      .post('/api/v1/upload/multiple')
      .field('folder', 'test_folder_multi')
      .attach('files', testFilePath)
      .attach('files', testFilePath);
      
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Uploads successful');
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBe(2);
    expect(res.body.files[0].url).toContain('test_folder_multi');
  }, 15000);

  it('should reject multiple upload if no files are provided', async () => {
    const res = await request(app)
      .post('/api/v1/upload/multiple')
      .field('folder', 'test_folder_multi');
      
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No files uploaded');
  }, 15000);
});
