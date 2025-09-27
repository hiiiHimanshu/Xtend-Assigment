import { randomUUID } from 'node:crypto';

import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    traceId?: string;
  }
}

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const id = request.headers['x-request-id']?.toString() ?? request.id ?? randomUUID();
    request.id = id;
    request.traceId = id;
    reply.header('X-Request-Id', id);
  });
});
