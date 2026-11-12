import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application without starting a listener,
 * so it can be imported by tests or alternative entry points.
 */
export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  // Correct client IPs behind a reverse proxy (Render, Railway, Nginx...).
  if (env.isProduction) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (curl, server-to-server) which send no Origin.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  if (!env.isProduction) app.use(requestLogger);

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
