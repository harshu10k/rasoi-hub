import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => { request.cookies.set(name, value); response = NextResponse.next({ request }); response.cookies.set(name, value, options); }) },
  });
  const { data: auth } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const creatorRoute = pathname === "/creator" || pathname.startsWith("/creator/") && !pathname.startsWith("/creator/login") && !pathname.startsWith("/creator/signup");
  const protectedRoute = pathname === "/" || pathname.startsWith("/recipe/") || creatorRoute || pathname === "/profile" || pathname === "/my-recipes" || pathname === "/saved";
  if (!protectedRoute) return response;
  if (!auth.user) {
    const loginPath = creatorRoute ? "/creator/login" : "/login";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginPath;
    redirectUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(redirectUrl);
  }
  if (creatorRoute) {
    const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", auth.user.id).maybeSingle();
    if (profile?.account_type !== "creator") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/creator/signup";
      redirectUrl.search = "?error=creator-account-required";
      return NextResponse.redirect(redirectUrl);
    }
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };