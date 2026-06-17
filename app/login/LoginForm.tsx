"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "registro";

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
  const [loading, setLoading] = useState(false);
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

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
        // Confirmación de email deshabilitada: sesión inmediata
        router.refresh();
        router.push("/");
      } else {
        // Confirmación de email requerida: mostrar aviso
        setLoading(false);
        setConfirmacionEnviada(true);
      }
    }
  }

  const inputClass = "w-full px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg focus:outline-none focus:border-court text-white placeholder:text-slate-500";

  if (confirmacionEnviada) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-6">📬</div>
          <h2 className="text-xl font-bold mb-2">Revisa tu email</h2>
          <p className="text-slate-400 text-sm">
            Te enviamos un enlace de confirmación a <span className="text-white">{email}</span>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <button
            onClick={() => { setConfirmacionEnviada(false); setMode("login"); }}
            className="mt-6 text-sm text-court hover:underline"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold"><span className="text-white">Mis</span><span className="text-court">Torneos.cl</span></h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de tenis chileno</p>
        </div>
        <div className="flex mb-6 border border-navy-700 rounded-lg overflow-hidden">
          {(["login", "registro"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === m ? "bg-court text-white" : "bg-navy-900 text-slate-400"
              }`}
            >
              {m === "login" ? "Ingresar" : "Registrarse"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "registro" && (
            <>
              <input type="text" placeholder="Nombre" value={nombre}
                onChange={(e) => setNombre(e.target.value)} required className={inputClass} />
              <input type="text" placeholder="Apellido" value={apellido}
                onChange={(e) => setApellido(e.target.value)} required className={inputClass} />
            </>
          )}
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          <input type="password" placeholder="Contraseña" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputClass} />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-court text-white font-bold rounded-lg hover:bg-court-dark disabled:opacity-50 transition-colors">
            {loading ? "..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
