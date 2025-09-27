import { FastifyInstance } from 'fastify';

export default async function metricsRoute(fastify: FastifyInstance) {
  fastify.get('/metrics', {
    schema: {
      description: 'Prometheus formatted metrics',
      tags: ['system']
    }
  }, async (_, reply) => {
    if (!fastify.metrics) {
      reply.code(404);
      return { error: 'NOT_ENABLED', message: 'Metrics are disabled' };
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return fastify.metrics.toPrometheus();
  });
}
