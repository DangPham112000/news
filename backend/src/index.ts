import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers, type Context } from './graphql/resolvers.js';
import { bearerToken, createApiKey, verifyApiKey } from './apiKeys.js';
import { getViewer } from './auth.js';
import { handleMcpNotAllowed, handleMcpPost } from './mcp/http.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const useMock = process.env.USE_MOCK === 'true';

async function startServer() {
  // Connect to MongoDB only in non-mock mode
  if (useMock) {
    console.log('🧪 Running in MOCK mode — no database connection');
    const { key } = await createApiKey('dev');
    console.log(`🔑 Dev API key (memory only): ${key}`);
  } else {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set. Use USE_MOCK=true for mock mode.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    // Make sure the unique indexes that back dedup exist.
    await mongoose.syncIndexes();
    if (!process.env.CLERK_SECRET_KEY) {
      console.warn('⚠️  CLERK_SECRET_KEY not set: sign-in is off, everyone is anonymous.');
    }
  }

  const server = new ApolloServer<Context>({ typeDefs, resolvers });
  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json({ limit: '1mb' }),
    expressMiddleware(server, {
      // The bearer token is either an agent's nwk_ API key or a Clerk session token from the web UI.
      context: async ({ req }): Promise<Context> => {
        const token = bearerToken(req.headers.authorization);
        const [agent, viewer] = await Promise.all([verifyApiKey(token), getViewer(token)]);
        return { agent, viewer };
      },
    }),
  );

  // MCP endpoint for AI agents, authenticated with API keys.
  app.post('/mcp', cors<cors.CorsRequest>(), express.json({ limit: '1mb' }), handleMcpPost);
  app.get('/mcp', handleMcpNotAllowed);
  app.delete('/mcp', handleMcpNotAllowed);

  app.listen(port, () => {
    const mode = useMock ? '🧪 MOCK' : '🗄️  DB';
    console.log(`Server ready at http://localhost:${port}/graphql [${mode}]`);
    console.log(`MCP endpoint at http://localhost:${port}/mcp`);
  });
}

startServer().catch(console.error);
