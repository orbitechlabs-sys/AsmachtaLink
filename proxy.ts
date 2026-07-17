import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Routes reachable without an authenticated session. */
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/reset-password",
  "/update-password",
  "/auth",
];

export async function proxy(request: NextRequest) {
  // Always refresh the session so tokens stay valid across requests.
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Unauthenticated users are redirected to /login for any protected route.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Return the response carrying refreshed-session cookies.
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files, so the
     * session cookie is refreshed everywhere else (including /api).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
