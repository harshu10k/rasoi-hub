/** Returns `next` only if it is a same-origin relative path, otherwise `fallback`. */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}
