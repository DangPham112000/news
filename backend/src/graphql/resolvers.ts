import { GraphQLError } from 'graphql';
import { allowRequest, type ApiKeyInfo } from '../apiKeys.js';
import type { Viewer } from '../auth.js';
import { clampPaging, upsertNews } from '../articles.js';
import { getDataSource } from '../data/index.js';
import { ValidationError } from '../validate.js';

export interface Context {
  /** The API key of the caller, or null when the request has none. */
  agent: ApiKeyInfo | null;
  /** The person signed in with Clerk, or null. Optional so tests can leave it out. */
  viewer?: Viewer | null;
}

export const resolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: Context) => ctx.viewer ?? null,
    topics: () => getDataSource().getTopics(),
    articles: (_: unknown, args: { topic?: string | null; q?: string | null; page?: number | null; pageSize?: number | null }) =>
      getDataSource().getArticles({
        topic: args.topic || undefined,
        q: args.q || undefined,
        ...clampPaging(args.page, args.pageSize),
      }),
  },
  Mutation: {
    upsertArticles: async (_: unknown, args: { topic: string; articles: unknown[] }, ctx: Context) => {
      if (!ctx.agent) {
        throw new GraphQLError('A valid API key is required to add news', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      if (!allowRequest(ctx.agent.id)) {
        throw new GraphQLError('Rate limit exceeded', { extensions: { code: 'RATE_LIMITED' } });
      }
      try {
        return await upsertNews(args.topic, args.articles);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new GraphQLError(err.errors.join('; '), { extensions: { code: 'BAD_USER_INPUT', errors: err.errors } });
        }
        throw err;
      }
    },
  },
};
