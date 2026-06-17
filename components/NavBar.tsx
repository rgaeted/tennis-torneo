import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

function TennisIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#0F0F0F" strokeWidth="1.5" />
      <path d="M2.5 10 C4 6.5 6.5 5 10 5" stroke="#0F0F0F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17.5 10 C16 13.5 13.5 15 10 15" stroke="#0F0F0F" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default async function NavBar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let jugador: { nombre: string; apellido: string; rol: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("jugador")
      .select("nombre, apellido, rol")
      .eq("id", user.id)
      .single();
    jugador = data;
  }

  return (
    <header
      style={{ borderBottom: "1px solid #1E1E1E", backgroundColor: "rgba(15,15,15,0.92)" }}
      className="backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div
            style={{ backgroundColor: "#C8FF00", borderRadius: "10px" }}
            className="w-9 h-9 flex items-center justify-center"
          >
            <TennisIcon />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">
            MisTorneos<span style={{ color: "#C8FF00" }}>.cl</span>
          </span>
        </Link>

        {/* Nav links (client — detecta ruta activa) */}
        <NavLinks rol={jugador?.rol} isLoggedIn={!!user} />

        {/* Derecha */}
        <div className="ml-auto flex items-center gap-3">
          {user && jugador ? (
            <>
              <Link
                href="/mi-perfil"
                style={{ color: "#888" }}
                className="text-sm hover:text-white transition-colors hidden sm:block"
              >
                {jugador.nombre} {jugador.apellido}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{ color: "#888" }}
                className="text-sm hover:text-white transition-colors"
              >
                Ingresar
              </Link>
              <Link
                href="/login?tab=registro"
                style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
                className="text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
