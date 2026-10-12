import { GraphQLError } from 'graphql';
import { clampPaging, upsertNews } from '../articles.js';
import { getDataSource } from '../data/index.js';
import { ValidationError } from '../validate.js';

export interface Context {}

export const resolvers = {
  Query: {
    topics: () => getDataSource().getTopics(),
    articles: (_: unknown, args: { topic?: string | null; q?: string | null; page?: number | null; pageSize?: number | null }) =>
      getDataSource().getArticles({
        topic: args.topic || undefined,
        q: args.q || undefined,
        ...clampPaging(args.page, args.pageSize),
      }),
  },
  Mutation: {
    upsertArticles: async (_: unknown, args: { topic: string; articles: unknown[] }) => {
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
