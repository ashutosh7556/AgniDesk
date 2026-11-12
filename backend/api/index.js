import { createApp } from '../src/app.js';

/**
 * Vercel serverless entry point. vercel.json rewrites every path here, and
 * Express handles routing exactly as in the long-running server.
 * Startup work (Google Sheets checks, owner account, settings) runs lazily on
 * the first request of each instance via the `readiness` middleware.
 */
const app = createApp();

export default app;
