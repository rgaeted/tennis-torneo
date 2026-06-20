"use client";
import { useRef } from "react";
import { BracketRound, type Partido } from "./BracketRound";

export type { Partido };

const ORDEN_RONDAS = ["primera_ronda", "segunda_ronda", "cuartos", "semis", "final"];
const SLOT_H = 128;

interface Props {
  partidos: Partido[];
  onResult?: (partido: Partido) => void;
  onSchedule?: (partido: Partido) => void;
  onAddPlayer?: (partido: Partido, slot: "jugador1_id" | "jugador2_id") => void;
  onRemovePlayer?: (partido: Partido, slot: "jugador1_id" | "jugador2_id") => void;
  onSwapSelect?: (partido: Partido, slot: "jugador1_id" | "jugador2_id") => void;
  swapSelected?: { partidoId: string; slot: "jugador1_id" | "jugador2_id" } | null;
}

function BracketConnector({ prevCount, totalHeight }: { prevCount: number; totalHeight: number }) {
  const slotH = totalHeight / prevCount;
  const pairCount = Math.floor(prevCount / 2);

  return (
    <div style={{ width: "28px", height: `${totalHeight}px`, flexShrink: 0, position: "relative", marginTop: "30px" }}>
      {Array.from({ length: pairCount }, (_, i) => {
        const pairH = slotH * 2;
        const top = i * pairH;
        const mid = pairH / 2;
        const arm = slotH / 2;

        return (
          <svg
            key={i}
            style={{ position: "absolute", top, left: 0 }}
            width={28}
            height={pairH}
          >
            <path
              d={`M 0 ${arm} H 14 V ${mid}`}
              fill="none" stroke="#2A2A2A" strokeWidth="1.5" strokeLinecap="round"
            />
            <path
              d={`M 0 ${pairH - arm} H 14 V ${mid} H 28`}
              fill="none" stroke="#2A2A2A" strokeWidth="1.5" strokeLinecap="round"
            />
          </svg>
        );
      })}
    </div>
  );
}

export function BracketView({ partidos, onResult, onSchedule, onAddPlayer, onRemovePlayer, onSwapSelect, swapSelected }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = "grabbing";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  };
  const onMouseUp = () => {
    dragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };

  const porRonda = ORDEN_RONDAS.reduce<Record<string, Partido[]>>((acc, ronda) => {
    acc[ronda] = partidos.filter((p) => p.ronda === ronda);
    return acc;
  }, {});

  const rondasConPartidos = ORDEN_RONDAS.filter((r) => porRonda[r]?.length > 0);
  const maxMatches = Math.max(...rondasConPartidos.map(r => porRonda[r].length), 1);
  const totalHeight = maxMatches * SLOT_H;

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto bracket-scroll select-none"
      style={{ cursor: "grab" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="flex items-start min-w-max py-4 px-2 gap-0">
        {rondasConPartidos.map((ronda, idx) => (
          <div key={ronda} className="flex items-start">
            {idx > 0 && (
              <BracketConnector
                prevCount={porRonda[rondasConPartidos[idx - 1]].length}
                totalHeight={totalHeight}
              />
            )}
            <BracketRound
              ronda={ronda}
              partidos={porRonda[ronda]}
              totalHeight={totalHeight}
              onResult={onResult}
              onSchedule={onSchedule}
              onAddPlayer={onAddPlayer}
              onRemovePlayer={onRemovePlayer}
              onSwapSelect={onSwapSelect}
              swapSelected={swapSelected}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
