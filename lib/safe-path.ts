const probeOrigin = "http://rasoi.invalid";

/**
 * Returns `next` only if it resolves to a path on this site, otherwise `fallback`.
 * Uses the URL parser rather than prefix checks: browsers strip tabs/newlines and treat "\" as "/",
 * so strings like "/\t/evil.com" pass naive "//" checks yet navigate off-site.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const url = new URL(next, probeOrigin);
    if (url.origin !== probeOrigin) return fallback;
    // Normalising can itself produce "//host" (e.g. "/a/../..//evil.com"), so check the result once more.
    const path = url.pathname + url.search + url.hash;
    return new URL(path, probeOrigin).origin === probeOrigin ? path : fallback;
  } catch {
    return fallback;
  }
}

export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}
