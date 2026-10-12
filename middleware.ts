import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const isProtectedRoute = (pathname: string) => pathname === "/" || pathname.startsWith("/recipe/") || pathname === "/upload" || pathname === "/profile" || pathname === "/my-recipes" || pathname === "/saved";

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  // Fail closed: without Supabase configured nobody can be authenticated.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return isProtectedRoute(pathname) ? redirectToLogin(request) : response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (cookiesToSet) => { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!isProtectedRoute(pathname)) return response;
  if (!auth.user) return redirectToLogin(request);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
