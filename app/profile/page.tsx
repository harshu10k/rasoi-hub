import { Header } from "@/components/header";
import { ProfileDashboard } from "@/components/profile-dashboard";
import { Suspense } from "react";
import { RequireUser } from "@/components/require-user";

export default function ProfilePage() { return <><Header /><Suspense fallback={null}><RequireUser next="/profile"><ProfileDashboard /></RequireUser></Suspense></>; }