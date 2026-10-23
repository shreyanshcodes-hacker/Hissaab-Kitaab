import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ShopLedger backend server listening on port ${env.PORT}`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    projectId: env.FIREBASE_PROJECT_ID,
  });
});

// Graceful shutdown handling for Cloud Run & container orchestration
function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed successfully. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10 seconds if connections hang
  setTimeout(() => {
    logger.error('Forcefully exiting server due to hung connections');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
