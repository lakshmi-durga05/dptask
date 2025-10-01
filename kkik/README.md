# Task Queue System (Node.js + BullMQ)

Features:
- Message queue with BullMQ and Redis
- Background jobs (email, report) with retries and backoff
- Scheduling (delay or run-at)
- Monitor via Bull Board at `/dashboard`
- Simple UI at `/`

## Requirements
- Node.js 18+
- Redis running locally (default `redis://127.0.0.1:6379`)

## Setup
```bash
copy .env.example .env
npm install
npm start
```
Then open:
- App UI: http://localhost:3000/
- Dashboard: http://localhost:3000/dashboard

If Redis is not installed on Windows, install via winget:
```powershell
winget install --id=Redis.Redis-Arm64 --exact -s winget
# or standard x64
winget install --id=Redis.Redis --exact -s winget
# Start the service (if needed)
redis-server
```

## API
- POST `/api/enqueue` { type, payload?, attempts?, backoffMs? }
- POST `/api/schedule` { type, payload?, delayMs?, runAt?, attempts?, backoffMs? }
- GET `/api/job/:id`
- GET `/api/queues`
