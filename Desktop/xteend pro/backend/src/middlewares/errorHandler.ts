import fp from 'fastify-plugin';
import { ZodError } from 'zod';

import { AppError, ValidationError } from '../services/errors.js';

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const validationError = new ValidationError('Invalid request parameters', {
        issues: error.issues
      });
      reply.status(validationError.statusCode).send({
        error: validationError.code,
        message: validationError.message,
        details: validationError.details,
        traceId: request.traceId ?? request.id
      });
      return;
    }

    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
        traceId: request.traceId ?? request.id
      });
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    reply.status(error.statusCode ?? 500).send({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      traceId: request.traceId ?? request.id
    });
  });
});
