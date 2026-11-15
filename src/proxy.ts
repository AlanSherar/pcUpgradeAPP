// Proxy de Next.js 16 (antes "middleware"). Refresca la sesión de Supabase y protege las pantallas.
// - Sin usuario: cualquier pantalla redirige a /login?next=<ruta> (salvo /login y /setup).
// - Con usuario: /login y /setup redirigen a /.
// - /api/* queda afuera del matcher: esos endpoints se protegen con CRON_SECRET.
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/supabase/env";

const AUTH_PAGES = ["/login", "/setup"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Había cookie de sesión de Supabase pero ya no es válida: la sesión venció. */
function hadSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

/** Redirige conservando las cookies y headers anti-cache que haya escrito Supabase. */
function redirectWith(url: URL, from: NextResponse): NextResponse {
  const res = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(key);
    if (value) res.headers.set(key, value);
  }
  return res;
}

function loginUrl(request: NextRequest, expired: boolean): URL {
  const url = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  url.searchParams.set("next", `${pathname}${search}`);
  if (expired) url.searchParams.set("expired", "1");
  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /auth/signout maneja su propia sesión; no se redirige un POST.
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  const env = getPublicEnv();
  if (!env) {
    // Sin configuración no hay sesión posible: /login y /setup muestran el aviso al dueño.
    if (isAuthPage(pathname)) return NextResponse.next();
    return NextResponse.redirect(loginUrl(request, false));
  }

  const expired = hadSessionCookie(request); // antes de que setAll toque las cookies del request
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getUser() valida el token contra Supabase Auth (getSession() no lo valida).
  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user && !isAuthPage(pathname)) {
    return redirectWith(loginUrl(request, expired), response);
  }
  if (user && isAuthPage(pathname)) {
    return redirectWith(new URL("/", request.url), response);
  }
  return response;
}

export const config = {
  matcher: [
    // Todo menos /api, estáticos de Next, favicon y archivos con extensión de recurso.
    "/((?!api(?:/|$)|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|json|webmanifest|woff2?)$).*)",
  ],
};
