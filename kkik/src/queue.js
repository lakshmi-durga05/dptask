import dotenv from 'dotenv';
dotenv.config();
import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Shared Redis connection
export const connection = new Redis(redisUrl, {
  // Required by BullMQ when using blocking commands
  maxRetriesPerRequest: null,
  // Recommended for serverless/managed Redis like Upstash
  enableReadyCheck: false,
});

// Main queue for tasks
export const tasksQueue = new Queue('tasks', { connection });
