import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers, type Context } from './graphql/resolvers.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const useMock = process.env.USE_MOCK === 'true';

async function startServer() {
  // Connect to MongoDB only in non-mock mode
  if (useMock) {
    console.log('🧪 Running in MOCK mode — no database connection');
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
  }

  const server = new ApolloServer<Context>({ typeDefs, resolvers });
  await server.start();

  app.use('/graphql', cors<cors.CorsRequest>(), express.json({ limit: '1mb' }), expressMiddleware(server));

  app.listen(port, () => {
    const mode = useMock ? '🧪 MOCK' : '🗄️  DB';
    console.log(`Server ready at http://localhost:${port}/graphql [${mode}]`);
  });
}

startServer().catch(console.error);
