import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { allowRequest, bearerToken, verifyApiKey } from '../apiKeys.js';
import { createMcpServer } from './server.js';

function rpcError(res: Response, status: number, message: string) {
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32000, message }, id: null });
}

/** POST /mcp — stateless Streamable HTTP: a fresh server per request. Needs "Authorization: Bearer nwk_...". */
export async function handleMcpPost(req: Request, res: Response) {
  const apiKey = await verifyApiKey(bearerToken(req.headers.authorization));
  if (!apiKey) {
    rpcError(res, 401, 'Missing or invalid API key. Send "Authorization: Bearer <key>".');
    return;
  }
  if (!allowRequest(apiKey.id)) {
    res.set('Retry-After', '60');
    rpcError(res, 429, 'Rate limit exceeded. Try again in a minute.');
    return;
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request failed:', err);
    if (!res.headersSent) rpcError(res, 500, 'Internal server error');
  }
}

/** GET/DELETE /mcp — no sessions or server-sent streams in stateless mode. */
export function handleMcpNotAllowed(_req: Request, res: Response) {
  res.set('Allow', 'POST');
  rpcError(res, 405, 'Method not allowed.');
}
