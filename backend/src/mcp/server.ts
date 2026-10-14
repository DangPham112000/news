import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { clampPaging, upsertNews } from '../articles.js';
import { getDataSource } from '../data/index.js';
import { LIMITS, ValidationError } from '../validate.js';
import { AGENT_INSTRUCTIONS, updateTopicPrompt } from './prompts.js';

function result(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function failure(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

// A factory, not a shared instance: reusing one zod schema makes the generated
// JSON Schema point at it with "$ref", which some clients cannot resolve.
const articleInput = () =>
  z.object({
    title: z.string().describe(`Headline, at most ${LIMITS.title} characters`),
    url: z.string().describe('Link to the original article (http or https)'),
    summary: z.string().optional().describe(`1-3 sentence summary in your own words, at most ${LIMITS.summary} characters`),
    source: z.string().optional().describe('Publisher or site name, e.g. "Hacker News"'),
    publishedAt: z.string().optional().describe('ISO 8601 publish time, e.g. 2026-10-09T14:00:00+07:00'),
  });

/** An MCP server for AI agents that keep the news up to date. Created per request (stateless). */
export function createMcpServer(): McpServer {
  const data = getDataSource();

  const server = new McpServer({ name: 'news', version: '1.0.0' }, { instructions: AGENT_INSTRUCTIONS });

  server.registerTool(
    'list_topics',
    {
      title: 'List topics',
      description: 'List the topics that already have news, with their article counts.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => result({ topics: await data.getTopics() }),
  );

  server.registerTool(
    'list_news',
    {
      title: 'List news',
      description:
        'List stored articles, newest first. Call this for a topic before adding news, so you skip stories that are already there.',
      inputSchema: {
        topic: z.string().optional().describe('Topic slug, e.g. "lap-trinh". Omit for all topics.'),
        q: z.string().optional().describe('Text to look for in titles and summaries'),
        page: z.number().int().optional().describe('Page number, from 1'),
        pageSize: z.number().int().optional().describe('Items per page (default 20, max 100)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ topic, q, page, pageSize }) => {
      const out = await data.getArticles({ topic: topic || undefined, q: q || undefined, ...clampPaging(page, pageSize) });
      return result(out);
    },
  );

  server.registerTool(
    'upsert_news',
    {
      title: 'Add or update news',
      description: [
        `Save up to ${LIMITS.batch} articles under a topic (created if new). Safe to repeat: the same URL updates the article, and the same headline under another URL is skipped as a duplicate.`,
        'Invalid items are listed by index in "invalid" and do not block the valid ones; fix and resend only those.',
      ].join(' '),
      inputSchema: {
        topic: z.string().describe('Topic name, e.g. "Lập trình" or "Chạy bộ"'),
        articles: z.array(articleInput()).describe('Articles to save'),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    },
    async ({ topic, articles }) => {
      try {
        return result(await upsertNews(topic, articles));
      } catch (err) {
        if (err instanceof ValidationError) return failure(err.errors.join('; '));
        throw err;
      }
    },
  );

  server.registerPrompt(
    'update_topic_news',
    {
      title: 'Update the news of a topic',
      description: 'Instructions for finding fresh news about a topic and saving it.',
      argsSchema: { topic: z.string().describe('Topic to update, e.g. "Lập trình" or "Chạy bộ"') },
    },
    ({ topic }) => ({
      messages: [{ role: 'user', content: { type: 'text', text: updateTopicPrompt(topic) } }],
    }),
  );

  return server;
}
