export const AGENT_INSTRUCTIONS = [
  'News aggregator. You keep the user\'s news feed up to date for the topics they care about (e.g. programming, running).',
  'Workflow for one topic: 1) call list_news with the topic slug to see what is already stored; 2) search the web for fresh stories; 3) call upsert_news with the new ones.',
  'Only save real articles you found: use the original article URL, a short summary in your own words, the publisher as source, and the publish time when known. Never invent stories or links.',
  'Aim for 5-15 relevant, recent stories per run, no more than 100 per call. Skip anything already listed. Do not copy long passages of article text.',
  'If upsert_news reports "invalid" items, fix and resend only those.',
].join('\n');

/** Prompt a user can paste into any agent, or an agent gets through the MCP prompt. */
export function updateTopicPrompt(topic: string): string {
  return [
    `Update my news feed for the topic "${topic}" using the news MCP server.`,
    '1. Call list_news with this topic to see which stories are already stored.',
    '2. Search the web for the most important and recent stories about this topic (prefer the last 1-2 days; skip anything older than a week).',
    '3. Pick 5-15 that are new, relevant and from reputable sources.',
    '4. Call upsert_news once with topic and the stories: title, url (original article), summary (1-3 sentences, your own words), source, publishedAt (ISO 8601 when known).',
    '5. If the result lists invalid items, fix and resend only those.',
    'Finish with one line: how many stories were created, updated and skipped as duplicates.',
  ].join('\n');
}
