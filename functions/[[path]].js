import adminWorker from '../cloudflare/worker.js';

// Cloudflare Pages catch-all function: route only admin API requests through
// the existing authentication/API worker and let static site requests pass on.
export async function onRequest(context) {
  const { request, next, env } = context;
  const pathname = new URL(request.url).pathname;

  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/analytics/')
  ) {
    return adminWorker.fetch(request, env);
  }

  return next();
}
