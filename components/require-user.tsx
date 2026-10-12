import { requireUser } from "@/lib/auth";

/** Renders children only for a signed-in user. Place inside <Suspense> so the rest of the page stays in the static shell. */
export async function RequireUser({ next, children }: { next: string; children: React.ReactNode }) {
  await requireUser(next);
  return <>{children}</>;
}
