import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import dayjs from 'dayjs';

import { tasksQueue } from './queue.js';
import './worker.js'; // start worker side-by-side with API

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static UI
app.use(express.static(path.join(__dirname, '..', 'public')));

// Bull Board dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/dashboard');
createBullBoard({
  queues: [new BullMQAdapter(tasksQueue)],
  serverAdapter,
});
app.use('/dashboard', serverAdapter.getRouter());

// Health
app.get('/health', (_req, res) => res.json({ ok: true, time: dayjs().toISOString() }));

// Enqueue immediate job
app.post('/api/enqueue', async (req, res) => {
  try {
    const { type = 'email', payload = {}, attempts = 3, backoffMs = 2000 } = req.body || {};

    const job = await tasksQueue.add(type, { type, payload }, {
      attempts,
      backoff: { type: 'fixed', delay: Number(backoffMs) || 0 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600 },
    });

    res.json({ ok: true, id: job.id, name: job.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Schedule job (delayMs or runAt ISO)
app.post('/api/schedule', async (req, res) => {
  try {
    const { type = 'report', payload = {}, delayMs, runAt, attempts = 3, backoffMs = 2000 } = req.body || {};

    let delay = 0;
    if (typeof delayMs === 'number') delay = Math.max(0, delayMs);
    else if (runAt) {
      const ts = new Date(runAt).getTime() - Date.now();
      delay = Math.max(0, ts || 0);
    }

    const job = await tasksQueue.add(type, { type, payload }, {
      delay,
      attempts,
      backoff: { type: 'fixed', delay: Number(backoffMs) || 0 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600 },
    });

    res.json({ ok: true, id: job.id, name: job.name, delay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Job status
app.get('/api/job/:id', async (req, res) => {
  try {
    const job = await tasksQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
    const state = await job.getState();
    const logs = await job.getLogs();
    res.json({ ok: true, id: job.id, name: job.name, state, progress: job.progress, attemptsMade: job.attemptsMade, returnvalue: job.returnvalue, logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Queue counts
app.get('/api/queues', async (_req, res) => {
  try {
    const counts = await tasksQueue.getJobCounts();
    res.json({ ok: true, counts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Dashboard at http://localhost:${PORT}/dashboard`);
});
