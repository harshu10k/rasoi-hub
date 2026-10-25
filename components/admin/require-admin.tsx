import { requireAdmin } from "@/lib/auth";

/** Renders the admin pages only for admins/owner; everyone else gets a 404 (see lib/auth.ts). Place inside <Suspense>. */
export async function RequireAdmin({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin");
  return <>{children}</>;
}
