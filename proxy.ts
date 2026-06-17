import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithCookies(supabaseResponse: NextResponse, redirectUrl: URL): NextResponse {
  const redirectResponse = NextResponse.redirect(redirectUrl);
  supabaseResponse.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Rutas que requieren sesión
  if ((path.startsWith("/mi-perfil") || path.startsWith("/mis-partidos")) && !user) {
    return redirectWithCookies(supabaseResponse, new URL("/login", request.url));
  }

  // Rutas de organizador
  if (path.startsWith("/organizador")) {
    if (!user) {
      return redirectWithCookies(supabaseResponse, new URL("/login", request.url));
    }
    const { data: jugador } = await supabase
      .from("jugador")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (jugador?.rol !== "organizador" && jugador?.rol !== "admin") {
      return redirectWithCookies(supabaseResponse, new URL("/", request.url));
    }
  }

  // Rutas de admin
  if (path.startsWith("/admin")) {
    if (!user) {
      return redirectWithCookies(supabaseResponse, new URL("/login", request.url));
    }
    const { data: jugador } = await supabase
      .from("jugador")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (jugador?.rol !== "admin") {
      return redirectWithCookies(supabaseResponse, new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/organizador/:path*", "/mi-perfil/:path*", "/mis-partidos/:path*"],
};
