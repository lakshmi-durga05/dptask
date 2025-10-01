import { Worker, QueueEvents } from 'bullmq';
import dayjs from 'dayjs';
import { connection } from './queue.js';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const processor = async (job) => {
  const { type, payload } = job.data || {};

  if (type === 'email') {
    // Simulate email sending time
    await sleep(1500);
    return { ok: true, sentAt: dayjs().toISOString(), to: payload?.to || 'test@example.com' };
  }

  if (type === 'report') {
    // Simulate report generation
    await sleep(3000);
    return { ok: true, generatedAt: dayjs().toISOString(), format: payload?.format || 'pdf' };
  }

  throw new Error(`Unknown job type: ${type}`);
};

export const worker = new Worker('tasks', processor, {
  connection,
  concurrency: 5,
});

// Optional: basic logging for visibility
const events = new QueueEvents('tasks', { connection });
events.on('completed', ({ jobId }) => console.log(`[Worker] Job ${jobId} completed`));
events.on('failed', ({ jobId, failedReason }) => console.warn(`[Worker] Job ${jobId} failed: ${failedReason}`));
