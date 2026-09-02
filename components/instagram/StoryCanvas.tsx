"use client";

import { forwardRef } from "react";
import { labelCategoria, type Categoria } from "@/lib/categorias";
import { logosVisibles } from "@/lib/instagram/sponsors";
import type { PlantillaStory, StoryPayload } from "@/lib/instagram/types";

const RONDA_LABELS: Record<string, string> = {
  primera_ronda: "1ª Ronda",
  segunda_ronda: "2ª Ronda",
  cuartos: "Cuartos",
  semis: "Semifinal",
  final: "Final",
};

function SponsorStrip({
  items,
  sizeClass,
  label,
}: {
  items: { nombre: string; logo_url?: string | null }[];
  sizeClass: string;
  label: string;
}) {
  if (!items.length) return null;
  return (
    <div className="px-8 py-3 border-t border-white/10">
      <p className="text-[14px] uppercase tracking-widest opacity-60 mb-2">{label}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {items.map((p) => (
          <img
            key={p.nombre}
            src={p.logo_url!}
            alt={p.nombre}
            crossOrigin="anonymous"
            className={`object-contain ${sizeClass}`}
          />
        ))}
      </div>
    </div>
  );
}

function StoryBody({ payload, plantilla }: { payload: StoryPayload; plantilla: PlantillaStory }) {
  const accent =
    plantilla === "neon" ? "#C8FF00" : plantilla === "clasico" ? "#8B1E1E" : "#FFFFFF";

  switch (payload.tipo) {
    case "resultado":
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-12 text-center gap-6">
          <p className="text-[28px] uppercase tracking-widest opacity-70">
            {labelCategoria(payload.categoria as Categoria)} · {RONDA_LABELS[payload.ronda] ?? payload.ronda}
          </p>
          <p className="text-[52px] font-bold leading-tight">
            {payload.j1.nombre} {payload.j1.apellido}
          </p>
          <p className="text-[72px] font-black tabular-nums" style={{ color: accent }}>
            {payload.score}
          </p>
          <p className="text-[52px] font-bold leading-tight">
            {payload.j2.nombre} {payload.j2.apellido}
          </p>
        </div>
      );
    case "foto_partido":
      if (plantilla === "bold") {
        return (
          <div className="flex-1 relative flex flex-col justify-end min-h-0">
            <img
              src={payload.fotoUrl}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="relative z-10 px-12 pb-16 pt-40 bg-gradient-to-t from-black via-black/70 to-transparent text-center">
              <p className="text-[26px] uppercase tracking-widest opacity-80 mb-4">
                {labelCategoria(payload.categoria as Categoria)} · {RONDA_LABELS[payload.ronda] ?? payload.ronda}
              </p>
              <p className="text-[44px] font-bold leading-tight">
                {payload.j1.nombre} {payload.j1.apellido}
              </p>
              <p className="text-[32px] opacity-70 my-2">vs</p>
              <p className="text-[44px] font-bold leading-tight">
                {payload.j2.nombre} {payload.j2.apellido}
              </p>
              {payload.score ? (
                <p className="text-[56px] font-black tabular-nums mt-4">{payload.score}</p>
              ) : null}
            </div>
          </div>
        );
      }
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className={`mx-8 mt-2 overflow-hidden ${plantilla === "neon" ? "border-2 rounded-lg" : plantilla === "clasico" ? "rounded-lg shadow-lg" : ""}`}
            style={plantilla === "neon" ? { borderColor: accent } : undefined}
          >
            <img
              src={payload.fotoUrl}
              alt=""
              crossOrigin="anonymous"
              className="w-full h-[720px] object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-12 text-center gap-3">
            <p className="text-[26px] uppercase tracking-widest opacity-70">
              {labelCategoria(payload.categoria as Categoria)} · {RONDA_LABELS[payload.ronda] ?? payload.ronda}
            </p>
            <p className="text-[38px] font-bold leading-tight">
              {payload.j1.nombre} {payload.j1.apellido}
            </p>
            <p className="text-[24px] opacity-60">vs</p>
            <p className="text-[38px] font-bold leading-tight">
              {payload.j2.nombre} {payload.j2.apellido}
            </p>
            {payload.score ? (
              <p className="text-[52px] font-black tabular-nums mt-2" style={{ color: accent }}>
                {payload.score}
              </p>
            ) : null}
          </div>
        </div>
      );
    case "campeon":
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-12 text-center gap-6">
          <p className="text-[32px] uppercase tracking-widest" style={{ color: accent }}>
            Campeón
          </p>
          {payload.campeon.foto_url && (
            <img
              src={payload.campeon.foto_url}
              alt=""
              crossOrigin="anonymous"
              className="w-48 h-48 rounded-full object-cover border-4"
              style={{ borderColor: accent }}
            />
          )}
          <p className="text-[56px] font-bold">
            {payload.campeon.nombre} {payload.campeon.apellido}
          </p>
          <p className="text-[28px] opacity-70">{labelCategoria(payload.categoria as Categoria)}</p>
        </div>
      );
    case "cuadro":
      return (
        <div className="flex-1 flex flex-col px-12 py-8 gap-4 overflow-hidden">
          <p className="text-[32px] font-bold" style={{ color: accent }}>
            {labelCategoria(payload.categoria as Categoria)} · {RONDA_LABELS[payload.ronda] ?? payload.ronda}
          </p>
          <div className="space-y-3">
            {payload.lineas.slice(0, 8).map((linea) => (
              <p key={linea} className="text-[22px] opacity-90 font-mono">
                {linea}
              </p>
            ))}
          </div>
        </div>
      );
    case "patrocinador":
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-12 text-center gap-8">
          {payload.destacado.logo_url && (
            <img
              src={payload.destacado.logo_url}
              alt={payload.destacado.nombre}
              crossOrigin="anonymous"
              className="max-h-64 max-w-[80%] object-contain"
            />
          )}
          <p className="text-[40px] font-bold">{payload.destacado.nombre}</p>
          <p className="text-[28px] opacity-70">Patrocina {payload.torneoNombre}</p>
        </div>
      );
    case "jugador":
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-12 text-center gap-6">
          {payload.jugador.foto_url && plantilla === "bold" && (
            <img
              src={payload.jugador.foto_url}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          {payload.jugador.foto_url && plantilla !== "bold" && (
            <img
              src={payload.jugador.foto_url}
              alt=""
              crossOrigin="anonymous"
              className="w-40 h-40 rounded-full object-cover"
            />
          )}
          <p className="text-[52px] font-bold relative z-10">
            {payload.jugador.nombre} {payload.jugador.apellido}
          </p>
          <p className="text-[28px] opacity-80 relative z-10">{payload.logro}</p>
          <p className="text-[24px] opacity-60 relative z-10">
            {labelCategoria(payload.categoria as Categoria)}
          </p>
        </div>
      );
  }
}

export const StoryCanvas = forwardRef<
  HTMLDivElement,
  { payload: StoryPayload; plantilla: PlantillaStory }
>(function StoryCanvas({ payload, plantilla }, ref) {
  const { oros, platas } = logosVisibles(payload.patrocinadores);

  const styles =
    plantilla === "neon"
      ? { bg: "#0F0F0F", text: "#F0F0F0", sub: "#888888" }
      : plantilla === "clasico"
        ? { bg: "#F4F1EA", text: "#1A1A1A", sub: "#555555" }
        : { bg: "#000000", text: "#FFFFFF", sub: "#AAAAAA" };

  const titleFont = plantilla === "clasico" ? "Georgia, serif" : "Arial, sans-serif";

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: styles.bg,
        color: styles.text,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
      className="relative flex flex-col overflow-hidden"
    >
      <div className="px-10 pt-10 pb-4 flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[36px] font-bold leading-tight"
            style={{ fontFamily: titleFont }}
          >
            {payload.torneoNombre}
            {payload.torneoEdicion != null && (
              <span className="text-[24px] font-normal opacity-60 ml-2">
                Ed. {payload.torneoEdicion}
              </span>
            )}
          </p>
          {payload.clubNombre && (
            <p className="text-[20px] mt-1" style={{ color: styles.sub }}>
              {payload.clubNombre}
            </p>
          )}
        </div>
        {payload.clubImagenUrl && (
          <img
            src={payload.clubImagenUrl}
            alt=""
            crossOrigin="anonymous"
            className="h-16 w-24 object-cover rounded-lg"
          />
        )}
      </div>

      <SponsorStrip items={oros} sizeClass="h-16 max-w-[180px]" label="Patrocinadores Oro" />

      <StoryBody payload={payload} plantilla={plantilla} />

      <SponsorStrip items={platas} sizeClass="h-9 max-w-[120px]" label="Patrocinadores Plata" />

      <p
        className="absolute bottom-6 right-8 text-[18px] opacity-40"
        style={{ color: styles.text }}
      >
        MisTorneos.cl
      </p>
    </div>
  );
});
