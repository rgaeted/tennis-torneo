import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

// ─── Tabla de puntos Opción B ────────────────────────────────────────────────
const PUNTOS = {
  primera: { campeon: 500, finalista: 300, semis: 150, cuartos: 75,  primera_ronda: 25 },
  segunda: { campeon: 350, finalista: 200, semis: 100, cuartos: 50,  primera_ronda: 15 },
  damas:   { campeon: 300, finalista: 180, semis: 90,  cuartos: 45,  primera_ronda: 12 },
  tercera: { campeon: 200, finalista: 120, semis: 60,  cuartos: 30,  primera_ronda: 8  },
  dobles:  { campeon: 150, finalista: 90,  semis: 45,  cuartos: 20,  primera_ronda: 6  },
  cuarta:  { campeon: 100, finalista: 60,  semis: 30,  cuartos: 15,  primera_ronda: 5  },
} as const;

type Categoria = keyof typeof PUNTOS;
type Logro = keyof typeof PUNTOS[Categoria];

const RONDA_ORDEN: Record<string, number> = {
  primera_ronda: 1,
  segunda_ronda: 1,
  cuartos: 2,
  semis: 3,
  final: 4,
};

const CATEGORIAS_ORDEN: Categoria[] = ["primera", "segunda", "damas", "tercera", "dobles", "cuarta"];

function logro(ronda: string, esGanador: boolean): Logro {
  if (ronda === "final") return esGanador ? "campeon" : "finalista";
  if (ronda === "semis") return "semis";
  if (ronda === "cuartos") return "cuartos";
  return "primera_ronda";
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
type EntradaRanking = {
  jugadorId: string;
  nombre: string;
  apellido: string;
  total: number;
  porCategoria: Partial<Record<Categoria, number>>;
  torneos: number;
};

// ─── Página ──────────────────────────────────────────────────────────────────
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat = "general" } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: jugadorActual } = await supabase
    .from("jugador")
    .select("organizacion_id")
    .eq("id", user.id)
    .single();

  const orgId = jugadorActual?.organizacion_id;
  if (!orgId) redirect("/organizador");

  // 1. Torneos de la org
  const { data: torneos } = await supabase
    .from("torneo")
    .select("id, nombre, anio, edicion")
    .eq("organizacion_id", orgId);

  const torneoIds = (torneos ?? []).map((t) => t.id);

  if (torneoIds.length === 0) {
    return <EmptyState />;
  }

  // 2. Cuadros de esos torneos
  const { data: cuadros } = await supabase
    .from("cuadro")
    .select("id, categoria, torneo_id")
    .in("torneo_id", torneoIds);

  const cuadroIds = (cuadros ?? []).map((c) => c.id);

  if (cuadroIds.length === 0) {
    return <EmptyState />;
  }

  // 3. Partidos con resultado
  const { data: partidos } = await supabase
    .from("partido")
    .select("id, ronda, cuadro_id, jugador1_id, jugador2_id, ganador_id")
    .in("cuadro_id", cuadroIds)
    .not("ganador_id", "is", null);

  if (!partidos?.length) {
    return <EmptyState />;
  }

  // 4. Nombres de jugadores involucrados
  const jugadorIds = [...new Set(
    partidos.flatMap((p) => [p.jugador1_id, p.jugador2_id].filter(Boolean) as string[])
  )];

  const { data: jugadores } = await supabase
    .from("jugador")
    .select("id, nombre, apellido")
    .in("id", jugadorIds);

  const nombreMap = new Map((jugadores ?? []).map((j) => [j.id, j]));

  // ─── Cómputo del ranking ────────────────────────────────────────────────
  const puntosMap = new Map<string, { porCategoria: Partial<Record<Categoria, number>>; total: number; torneos: Set<string> }>();

  function addPuntos(jugadorId: string, categoria: Categoria, pts: number, torneoId: string) {
    if (!puntosMap.has(jugadorId)) {
      puntosMap.set(jugadorId, { porCategoria: {}, total: 0, torneos: new Set() });
    }
    const entry = puntosMap.get(jugadorId)!;
    entry.porCategoria[categoria] = (entry.porCategoria[categoria] ?? 0) + pts;
    entry.total += pts;
    entry.torneos.add(torneoId);
  }

  const cuadroMap = new Map((cuadros ?? []).map((c) => [c.id, c]));

  // Agrupar partidos por cuadro
  const partidosByCuadro = new Map<string, typeof partidos>();
  for (const p of partidos) {
    if (!p.cuadro_id) continue;
    if (!partidosByCuadro.has(p.cuadro_id)) partidosByCuadro.set(p.cuadro_id, []);
    partidosByCuadro.get(p.cuadro_id)!.push(p);
  }

  for (const [cuadroId, ps] of partidosByCuadro) {
    const cuadro = cuadroMap.get(cuadroId);
    if (!cuadro) continue;
    const categoria = cuadro.categoria as Categoria;
    if (!PUNTOS[categoria]) continue;
    const tabla = PUNTOS[categoria];

    // Para cada jugador, encontrar su ronda máxima
    const playerMaxRound = new Map<string, { ronda: string; esGanador: boolean }>();

    for (const p of ps) {
      const orden = RONDA_ORDEN[p.ronda] ?? 0;
      for (const jid of [p.jugador1_id, p.jugador2_id]) {
        if (!jid) continue;
        const current = playerMaxRound.get(jid);
        const currentOrden = current ? (RONDA_ORDEN[current.ronda] ?? 0) : 0;
        if (orden > currentOrden) {
          playerMaxRound.set(jid, { ronda: p.ronda, esGanador: p.ganador_id === jid });
        }
      }
    }

    const torneoId = cuadro.torneo_id;
    for (const [jid, { ronda, esGanador }] of playerMaxRound) {
      const achievement = logro(ronda, esGanador);
      addPuntos(jid, categoria, tabla[achievement], torneoId);
    }
  }

  // Construir lista de ranking
  const ranking: EntradaRanking[] = [...puntosMap.entries()].map(([jid, data]) => {
    const j = nombreMap.get(jid);
    return {
      jugadorId: jid,
      nombre: j?.nombre ?? "?",
      apellido: j?.apellido ?? "",
      total: data.total,
      porCategoria: data.porCategoria,
      torneos: data.torneos.size,
    };
  });

  // ─── Filtro por categoría ───────────────────────────────────────────────
  const categoriaActiva = CATEGORIAS_ORDEN.includes(cat as Categoria) ? (cat as Categoria) : null;

  const rankingFiltrado = categoriaActiva
    ? ranking
        .filter((r) => (r.porCategoria[categoriaActiva] ?? 0) > 0)
        .sort((a, b) => (b.porCategoria[categoriaActiva] ?? 0) - (a.porCategoria[categoriaActiva] ?? 0))
    : [...ranking].sort((a, b) => b.total - a.total);

  // ─── UI ────────────────────────────────────────────────────────────────
  const tabs: { key: string; label: string }[] = [
    { key: "general", label: "General" },
    ...CATEGORIAS_ORDEN.map((c) => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Ranking</h1>
        <p style={{ color: "#555" }} className="text-xs mt-1">
          Puntos acumulados en todos los torneos de la organización
        </p>
      </div>

      {/* Tabs de categoría */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(({ key, label }) => {
          const isActive = cat === key || (key === "general" && cat !== "general" && !CATEGORIAS_ORDEN.includes(cat as Categoria) === false && cat === "general");
          const active = cat === key;
          return (
            <Link
              key={key}
              href={`/organizador/ranking?cat=${key}`}
              className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: active ? "#C8FF00" : "#161616",
                color: active ? "#0F0F0F" : "#555",
                border: `1px solid ${active ? "#C8FF00" : "#242424"}`,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Tabla de puntos de referencia */}
      {categoriaActiva && (
        <div
          style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
          className="rounded-xl p-4 mb-6"
        >
          <p style={{ color: "#555" }} className="text-[10px] uppercase tracking-widest font-bold mb-3">
            Puntos — {categoriaActiva}
          </p>
          <div className="flex gap-6 flex-wrap">
            {(Object.entries(PUNTOS[categoriaActiva]) as [Logro, number][]).map(([l, pts]) => (
              <div key={l} className="text-center">
                <p style={{ color: "#C8FF00" }} className="text-sm font-bold">{pts}</p>
                <p style={{ color: "#555" }} className="text-[10px] capitalize">{l.replace("_", " ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking */}
      {rankingFiltrado.length === 0 ? (
        <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-xl px-6 py-10 text-center">
          <p style={{ color: "#555" }} className="text-sm">Sin resultados en esta categoría aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rankingFiltrado.map((entry, idx) => {
            const pts = categoriaActiva
              ? (entry.porCategoria[categoriaActiva] ?? 0)
              : entry.total;
            const isPodium = idx < 3;

            return (
              <div
                key={entry.jugadorId}
                style={{
                  backgroundColor: "#161616",
                  border: `1px solid ${isPodium ? "#C8FF0025" : "#242424"}`,
                }}
                className="flex items-center gap-4 rounded-xl px-5 py-3.5"
              >
                {/* Posición */}
                <span
                  className="text-sm font-bold w-6 text-center flex-shrink-0"
                  style={{ color: idx === 0 ? "#C8FF00" : idx === 1 ? "#888" : idx === 2 ? "#A0622A" : "#444" }}
                >
                  {idx + 1}
                </span>

                {/* Nombre */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    {entry.nombre} {entry.apellido}
                  </p>
                  {!categoriaActiva && (
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {CATEGORIAS_ORDEN.filter((c) => entry.porCategoria[c]).map((c) => (
                        <span key={c} style={{ color: "#555" }} className="text-[10px]">
                          {c.charAt(0).toUpperCase() + c.slice(1)}: {entry.porCategoria[c]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Torneos */}
                <span style={{ color: "#555" }} className="text-xs flex-shrink-0">
                  {entry.torneos} torneo{entry.torneos !== 1 ? "s" : ""}
                </span>

                {/* Puntos */}
                <span
                  className="text-sm font-bold w-16 text-right flex-shrink-0"
                  style={{ color: "#C8FF00" }}
                >
                  {pts} pts
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda de puntos (solo en general) */}
      {!categoriaActiva && (
        <div
          style={{ backgroundColor: "#161616", border: "1px solid #242424" }}
          className="rounded-xl p-5 mt-8"
        >
          <p style={{ color: "#555" }} className="text-[10px] uppercase tracking-widest font-bold mb-4">
            Tabla de puntos
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th style={{ color: "#555" }} className="text-left pb-2 font-medium">Logro</th>
                  {CATEGORIAS_ORDEN.map((c) => (
                    <th key={c} style={{ color: "#555" }} className="text-right pb-2 font-medium capitalize px-2">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242424]">
                {(["campeon", "finalista", "semis", "cuartos", "primera_ronda"] as Logro[]).map((l) => (
                  <tr key={l}>
                    <td style={{ color: "#888" }} className="py-2 capitalize">{l.replace("_", " ")}</td>
                    {CATEGORIAS_ORDEN.map((c) => (
                      <td key={c} style={{ color: "#C8FF00" }} className="text-right py-2 px-2 font-medium">
                        {PUNTOS[c][l]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">Ranking</h1>
      <div style={{ backgroundColor: "#161616", border: "1px solid #242424" }} className="rounded-xl px-6 py-10 text-center">
        <p style={{ color: "#555" }} className="text-sm">
          No hay partidos jugados aún. El ranking se calculará automáticamente a medida que se registren resultados.
        </p>
      </div>
    </div>
  );
}
