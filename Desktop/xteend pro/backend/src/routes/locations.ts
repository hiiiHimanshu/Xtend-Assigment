import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { searchLocations } from '../services/geo.js';

const querySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  lang: z.enum(['en', 'hi']).default('en')
});

export default async function locationsRoute(fastify: FastifyInstance) {
  fastify.get('/locations/search', {
    schema: {
      description: 'Search for known locations by name',
      tags: ['locations'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' },
          lang: { type: 'string', enum: ['en', 'hi'] }
        }
      }
    }
  }, async (request) => {
    const query = querySchema.parse(request.query);
    const results = await searchLocations(query.q, query.lang);
    return { results };
  });
}
