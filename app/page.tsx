import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { HomeClient } from "@/components/home-client";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) redirect("/login");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return <><Header /><HomeClient /></>;
}
