import { Suspense } from "react";
import { Header } from "@/components/header";
import { HomeClient } from "@/components/home-client";
import { RequireUser } from "@/components/require-user";

export default function Home() {
  return <><Header /><Suspense fallback={null}><RequireUser next="/"><HomeClient /></RequireUser></Suspense></>;
}
