import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RequireAdmin } from "@/components/admin/require-admin";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Rasoi Hub Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell><Suspense fallback={<Loading label="Checking access..." />}><RequireAdmin>{children}</RequireAdmin></Suspense></AdminShell>;
}
