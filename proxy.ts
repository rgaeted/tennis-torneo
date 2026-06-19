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

  // getSession() lee desde la cookie — sin llamada de red a Supabase Auth
  const { data: { session } } = await supabase.auth.getSession();
  const path = request.nextUrl.pathname;
  const userId = session?.user?.id;

  // Rutas que solo requieren sesión activa
  if ((path.startsWith("/mi-perfil") || path.startsWith("/mis-partidos")) && !userId) {
    return redirectWithCookies(supabaseResponse, new URL("/login", request.url));
  }

  // Rutas que requieren rol específico — una sola query para admin y organizador
  if (path.startsWith("/admin") || path.startsWith("/organizador")) {
    if (!userId) {
      return redirectWithCookies(supabaseResponse, new URL("/login", request.url));
    }

    const { data: jugador } = await supabase
      .from("jugador")
      .select("rol")
      .eq("id", userId)
      .single();

    const rol = jugador?.rol;

    if (path.startsWith("/admin") && rol !== "admin") {
      return redirectWithCookies(supabaseResponse, new URL("/", request.url));
    }
    if (path.startsWith("/organizador") && rol !== "organizador" && rol !== "admin") {
      return redirectWithCookies(supabaseResponse, new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/organizador/:path*", "/mi-perfil/:path*", "/mis-partidos/:path*"],
};
