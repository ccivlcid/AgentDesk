/**
 * CLI configuration — server connection defaults
 */
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_API_PORT = 8790;

export function getBaseUrl(): string {
  const host = process.env.AGENTDESK_HOST ?? DEFAULT_HOST;
  const port = process.env.AGENTDESK_PORT ?? DEFAULT_API_PORT;
  return `http://${host}:${port}`;
}

export function getWsUrl(): string {
  const host = process.env.AGENTDESK_HOST ?? DEFAULT_HOST;
  const port = process.env.AGENTDESK_PORT ?? DEFAULT_API_PORT;
  return `ws://${host}:${port}`;
}
