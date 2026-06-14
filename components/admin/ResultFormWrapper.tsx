"use client";
import { useRouter } from "next/navigation";
import { ResultForm } from "./ResultForm";

interface Props {
  partidoId: string;
  jugador1: { id: string; nombre: string; apellido: string };
  jugador2: { id: string; nombre: string; apellido: string };
}

export function ResultFormWrapper({ partidoId, jugador1, jugador2 }: Props) {
  const router = useRouter();
  return (
    <ResultForm
      partidoId={partidoId}
      jugador1={jugador1}
      jugador2={jugador2}
      onSuccess={() => router.refresh()}
    />
  );
}
