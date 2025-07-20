// Test setup file
import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(30000); // 30 seconds

// Mock console.error to reduce noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only log non-expected errors
    if (!args[0]?.toString().includes('Full campaign creation error')) {
      originalError(...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
});