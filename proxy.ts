import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const isProtectedRoute = (pathname: string) => pathname === "/" || pathname.startsWith("/recipe/") || pathname === "/upload" || pathname === "/profile" || pathname === "/my-recipes" || pathname === "/saved" || pathname === "/reset-password";
// Pages that only make sense when signed out; a signed-in visitor is sent on to the app instead.
const isGuestOnlyRoute = (pathname: string) => pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(redirectUrl);
}

function redirectIntoApp(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  return NextResponse.redirect(new URL(target, request.url));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  // Fail closed: without Supabase configured nobody can be authenticated.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return isProtectedRoute(pathname) ? redirectToLogin(request) : response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (cookiesToSet) => { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user && isGuestOnlyRoute(pathname)) return redirectIntoApp(request);
  if (!isProtectedRoute(pathname)) return response;
  if (!auth.user) return redirectToLogin(request);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
