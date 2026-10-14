import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createApiKey, listApiKeys, revokeApiKey } from '../apiKeys.js';

dotenv.config();

const [command, arg] = process.argv.slice(2);

async function main() {
  if (!['create', 'list', 'revoke'].includes(command ?? '')) {
    console.log('Usage: pnpm --filter backend apikey <create <name> | list | revoke <id>>');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  if (command === 'create') {
    const { key, apiKey } = await createApiKey(arg ?? '');
    console.log(`Created "${apiKey.name}" (${apiKey.id}). Copy the key now, it is not shown again:\n\n${key}\n`);
  } else if (command === 'list') {
    for (const k of await listApiKeys()) {
      console.log(`${k.id}  ${k.prefix}…  ${k.name}  created ${k.createdAt}  last used ${k.lastUsedAt ?? 'never'}`);
    }
  } else {
    console.log((await revokeApiKey(arg ?? '')) ? 'Revoked.' : 'No key with that id.');
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
