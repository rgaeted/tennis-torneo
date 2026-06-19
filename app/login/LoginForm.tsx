"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "registro" | "forgot";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("tab") === "registro" ? "registro" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/mi-perfil`,
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setInfo("Te enviamos un enlace para restablecer tu contraseña.");
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.refresh();
      router.push("/");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre, apellido } },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data.session) {
        router.refresh();
        router.push("/");
      } else {
        setLoading(false);
        setInfo("Revisa tu email para confirmar tu cuenta.");
      }
    }
  }

  async function loginConGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function loginConApple() {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  const inputBase =
    "w-full px-4 py-3 rounded-2xl text-white text-sm placeholder:text-[#555] focus:outline-none focus:ring-2 focus:ring-[#C8FF00]/40 transition-all";

  const headings: Record<Mode, { title: string; subtitle: string }> = {
    login:   { title: "Bienvenido de vuelta",  subtitle: "Ingresa para ver tus torneos, partidos y ranking." },
    registro:{ title: "Crea tu cuenta",         subtitle: "Únete a MisTorneos.cl y empieza a jugar." },
    forgot:  { title: "Recuperar contraseña",   subtitle: "Te enviaremos un enlace a tu email." },
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0F0F0F" }}
    >
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">{headings[mode].title}</h1>
          <p style={{ color: "#666" }} className="text-sm">{headings[mode].subtitle}</p>
        </div>

        {/* Tab switcher */}
        {mode !== "forgot" && (
          <div
            className="flex mb-6 p-1 rounded-2xl"
            style={{ backgroundColor: "#161616" }}
          >
            {(["login", "registro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={
                  mode === m
                    ? { backgroundColor: "#C8FF00", color: "#0F0F0F" }
                    : { color: "#666" }
                }
              >
                {m === "login" ? "Ingresar" : "Registrarse"}
              </button>
            ))}
          </div>
        )}

        {/* Social buttons (solo en login/registro) */}
        {mode !== "forgot" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={loginConGoogle}
                style={{ backgroundColor: "#161616", border: "1px solid #242424", color: "#fff" }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold hover:border-[#444] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                onClick={loginConApple}
                style={{ backgroundColor: "#161616", border: "1px solid #242424", color: "#fff" }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold hover:border-[#444] transition-colors"
              >
                <svg width="16" height="18" viewBox="0 0 814 1000" fill="white">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 31 0 113.4 2.6 168.3 68.8zm-174.3-51.2c7.4-37.5 26.2-77.7 57.2-109.2 30.3-31.6 74.4-52.2 109.5-52.2 2.6 0 5.2.2 7.8.5-7.8 36.5-25.1 76.7-55.5 109-29 31.6-73.1 55.4-119 51.9z"/>
                </svg>
                Apple
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ backgroundColor: "#242424" }} />
              <span style={{ color: "#444" }} className="text-[11px] font-bold uppercase tracking-widest">o con email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "#242424" }} />
            </div>
          </>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "registro" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ color: "#888" }} className="block text-xs font-medium mb-1.5">Nombre</label>
                <input
                  type="text"
                  placeholder="Juan"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                  className={inputBase}
                />
              </div>
              <div>
                <label style={{ color: "#888" }} className="block text-xs font-medium mb-1.5">Apellido</label>
                <input
                  type="text"
                  placeholder="Pérez"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                  style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                  className={inputBase}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ color: "#888" }} className="block text-xs font-medium mb-1.5">Email</label>
            <input
              type="email"
              placeholder="tu@correo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
              className={inputBase}
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ color: "#888" }} className="text-xs font-medium">Contraseña</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                    style={{ color: "#C8FF00" }}
                    className="text-xs font-medium hover:opacity-75 transition-opacity"
                  >
                    ¿Olvidaste?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
                className={inputBase}
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs px-1">{error}</p>
          )}
          {info && (
            <p style={{ color: "#C8FF00" }} className="text-xs px-1">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: "#C8FF00", color: "#0F0F0F" }}
            className="w-full py-3.5 rounded-2xl text-sm font-black hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
          >
            {loading
              ? "..."
              : mode === "login"
              ? "Ingresar a mi cuenta"
              : mode === "registro"
              ? "Crear mi cuenta"
              : "Enviar enlace"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ color: "#555" }} className="text-sm text-center mt-6">
          {mode === "login" ? (
            <>¿No tienes cuenta?{" "}
              <button onClick={() => { setMode("registro"); setError(null); }} style={{ color: "#C8FF00" }} className="font-bold hover:opacity-75">
                Crea una gratis
              </button>
            </>
          ) : mode === "registro" ? (
            <>¿Ya tienes cuenta?{" "}
              <button onClick={() => { setMode("login"); setError(null); }} style={{ color: "#C8FF00" }} className="font-bold hover:opacity-75">
                Ingresa aquí
              </button>
            </>
          ) : (
            <button onClick={() => { setMode("login"); setError(null); setInfo(null); }} style={{ color: "#C8FF00" }} className="font-bold hover:opacity-75">
              ← Volver al login
            </button>
          )}
        </p>

      </div>
    </div>
  );
}
