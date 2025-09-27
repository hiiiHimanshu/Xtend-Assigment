import { loadEnv } from './config/env.js';
import { buildServer } from './server.js';

const start = async () => {
  const env = loadEnv();
  const server = await buildServer();

  try {
    await server.listen({ port: env.PORT, host: env.HOST });
    server.log.info(`Server listening on ${env.HOST}:${env.PORT}`);
  } catch (error) {
    server.log.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

void start();
