import 'fastify';
import type { SessionRecord } from './db.js';

declare module 'fastify' {
  interface FastifyRequest {
    authSession: SessionRecord | null;
  }
}
