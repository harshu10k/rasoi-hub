import { Suspense } from "react"; import { AuthStage } from "@/components/auth-stage"; import { RequireUser } from "@/components/require-user";
export default function ResetPasswordPage() { return <Suspense fallback={null}><RequireUser next="/reset-password"><AuthStage mode="reset" /></RequireUser></Suspense>; }
