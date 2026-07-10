import { loadProjectEnv, requireSupabaseEnv } from './helpers/load-env';

export default async function globalSetup() {
  loadProjectEnv();

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5199';
  const useLocalWebServer = baseURL.includes('127.0.0.1') || baseURL.includes('localhost');

  if (useLocalWebServer) {
    requireSupabaseEnv();
  }
}
