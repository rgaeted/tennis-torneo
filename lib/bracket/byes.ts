import { siguienteRonda } from "./generator";
import type { Database } from "@/lib/supabase/types";

type Ronda = Database["public"]["Enums"]["ronda_tipo"];

const RONDAS_ORDER: Ronda[] = [
  "primera_ronda",
  "segunda_ronda",
  "cuartos",
  "semis",
  "final",
];

function anteriorRonda(ronda: Ronda): Ronda | null {
  const idx = RONDAS_ORDER.indexOf(ronda);
  return idx > 0 ? RONDAS_ORDER[idx - 1] : null;
}

/**
 * Processes all BYE situations across every round of a bracket.
 *
 * A player facing a null opponent auto-advances only when that null slot is a
 * "confirmed BYE" — meaning every primera_ronda match that feeds into that slot
 * has no real players (pure bye padding). This prevents false auto-advancement
 * when the slot is simply waiting for an upstream real match result.
 *
 * Processes rounds in order so cascading BYEs resolve within a single pass.
 */
export async function procesarByes(cuadroId: string, admin: any) {
  // Find the actual first round of this bracket (may be "cuartos" for an 8-player draw,
  // "primera_ronda" for 16/32-player draws).
  let primeraRondaPartidos: any[] = [];
  let primeraRondaNombre: Ronda | null = null;

  for (const ronda of RONDAS_ORDER) {
    const { data } = await admin
      .from("partido")
      .select("posicion, jugador1_id, jugador2_id")
      .eq("cuadro_id", cuadroId)
      .eq("ronda", ronda);
    if (data && (data as any[]).length > 0) {
      primeraRondaPartidos = data as any[];
      primeraRondaNombre = ronda;
      break;
    }
  }

  if (!primeraRondaNombre) return;

  const primeraRondaIdx = RONDAS_ORDER.indexOf(primeraRondaNombre);

  // true if this first-round position has at least one real player
  const realPrimerRonda = new Map<number, boolean>(
    primeraRondaPartidos.map((p) => [p.posicion, !!(p.jugador1_id || p.jugador2_id)])
  );

  // Will the match at (ronda, pos) ever produce a real winner?
  function tendraGanador(ronda: Ronda, pos: number): boolean {
    if (ronda === primeraRondaNombre) return realPrimerRonda.get(pos) ?? false;
    const prev = anteriorRonda(ronda);
    // Rounds before the first round of this bracket are confirmed BYEs
    if (!prev || RONDAS_ORDER.indexOf(prev) < primeraRondaIdx) return false;
    return tendraGanador(prev, pos * 2) || tendraGanador(prev, pos * 2 + 1);
  }

  // Process all rounds in order so cascading BYEs resolve in one pass
  let huboAvances = true;
  while (huboAvances) {
    huboAvances = false;

    for (const ronda of RONDAS_ORDER) {
      const sigRonda = siguienteRonda(ronda as Ronda);
      if (!sigRonda) continue;

      const { data: partidos } = await admin
        .from("partido")
        .select("id, posicion, jugador1_id, jugador2_id, ganador_id")
        .eq("cuadro_id", cuadroId)
        .eq("ronda", ronda);

      for (const p of (partidos as any[]) ?? []) {
        if (p.ganador_id) continue;
        if (!p.jugador1_id && !p.jugador2_id) continue; // bye vs bye — nobody advances
        if (p.jugador1_id && p.jugador2_id) continue;   // real match — wait for result

        // One player, one null slot. Verify the null slot is a confirmed BYE
        // (its entire upstream tree has no real players).
        const nullIsJ1 = !p.jugador1_id;
        const prev = anteriorRonda(ronda as Ronda);

        if (prev !== null) {
          // For rounds after primera_ronda, the null slot is fed by a specific previous match.
          // jugador1 comes from (prev, pos*2), jugador2 from (prev, pos*2+1).
          const nullFeedPos = nullIsJ1 ? p.posicion * 2 : p.posicion * 2 + 1;
          if (tendraGanador(prev, nullFeedPos)) continue; // upstream real match exists — wait
        }
        // For primera_ronda: null means bye padding → always auto-advance.

        const ganadorId = p.jugador1_id ?? p.jugador2_id;
        const posicionSiguiente = Math.floor(p.posicion / 2);
        const esPrimerJugador = p.posicion % 2 === 0;

        const { data: sigPartido } = await admin
          .from("partido")
          .select("id")
          .eq("cuadro_id", cuadroId)
          .eq("ronda", sigRonda)
          .eq("posicion", posicionSiguiente)
          .maybeSingle();

        if (sigPartido) {
          await admin
            .from("partido")
            .update(esPrimerJugador ? { jugador1_id: ganadorId } : { jugador2_id: ganadorId })
            .eq("id", (sigPartido as any).id);
        }

        await admin.from("partido").update({ ganador_id: ganadorId }).eq("id", p.id);
        huboAvances = true;
      }
    }
  }
}

/**
 * Reverts a player's BYE auto-advancement through subsequent rounds.
 * Used when a real player is added to a slot that was previously a BYE,
 * so the auto-advanced player is un-placed from downstream rounds.
 */
export async function revertirAvanceBye(
  cuadroId: string,
  ronda: Ronda,
  posicion: number,
  jugadorId: string,
  admin: any
): Promise<void> {
  const sigRonda = siguienteRonda(ronda);
  if (!sigRonda) return;

  const posicionSiguiente = Math.floor(posicion / 2);
  const esPrimerJugador = posicion % 2 === 0;

  const { data: sigPartido } = await admin
    .from("partido")
    .select("id, jugador1_id, jugador2_id, ganador_id, resultado")
    .eq("cuadro_id", cuadroId)
    .eq("ronda", sigRonda)
    .eq("posicion", posicionSiguiente)
    .maybeSingle();

  if (!sigPartido) return;

  // Don't revert if a real match was already played here
  if ((sigPartido as any).resultado) return;

  const sp = sigPartido as any;
  const playerInSlot = esPrimerJugador ? sp.jugador1_id : sp.jugador2_id;
  if (playerInSlot !== jugadorId) return;

  const wasGanador = sp.ganador_id === jugadorId;

  await admin
    .from("partido")
    .update({
      ...(esPrimerJugador ? { jugador1_id: null } : { jugador2_id: null }),
      ...(wasGanador ? { ganador_id: null } : {}),
    })
    .eq("id", sp.id);

  // If this player was also a BYE winner at this level, keep reverting
  if (wasGanador) {
    await revertirAvanceBye(cuadroId, sigRonda as Ronda, posicionSiguiente, jugadorId, admin);
  }
}

/**
 * Places the winner in the next round after a match result is entered.
 * If the next round's opponent slot is null AND the sibling feeding match
 * has no players (confirmed BYE), auto-advances recursively.
 */
export async function avanzarGanadorConByes(
  cuadroId: string,
  ronda: Ronda,
  posicion: number,
  ganadorId: string,
  admin: any
): Promise<void> {
  const sigRonda = siguienteRonda(ronda);
  if (!sigRonda) return;

  const posicionSiguiente = Math.floor(posicion / 2);
  const esPrimerJugador = posicion % 2 === 0;

  const { data: sigPartido } = await admin
    .from("partido")
    .select("id, jugador1_id, jugador2_id, ganador_id")
    .eq("cuadro_id", cuadroId)
    .eq("ronda", sigRonda)
    .eq("posicion", posicionSiguiente)
    .maybeSingle();

  if (!sigPartido || (sigPartido as any).ganador_id) return;

  // Place winner in the next round
  await admin
    .from("partido")
    .update(esPrimerJugador ? { jugador1_id: ganadorId } : { jugador2_id: ganadorId })
    .eq("id", (sigPartido as any).id);

  // If the opponent slot is already filled, a real match will happen — done.
  const sp = sigPartido as any;
  const opponentId = esPrimerJugador ? sp.jugador2_id : sp.jugador1_id;
  if (opponentId !== null) return;

  // Opponent slot is null. Check the sibling match in the current round:
  // its winner would fill the opponent slot. If the sibling has no players at all,
  // it is a confirmed BYE and we must auto-advance.
  const siblingPosition = esPrimerJugador
    ? posicionSiguiente * 2 + 1  // sibling feeds jugador2
    : posicionSiguiente * 2;     // sibling feeds jugador1

  const { data: siblingMatch } = await admin
    .from("partido")
    .select("jugador1_id, jugador2_id")
    .eq("cuadro_id", cuadroId)
    .eq("ronda", ronda)
    .eq("posicion", siblingPosition)
    .maybeSingle();

  const sm = siblingMatch as any;
  const confirmedBye = !sm || (!sm.jugador1_id && !sm.jugador2_id);

  if (confirmedBye) {
    await admin.from("partido").update({ ganador_id: ganadorId }).eq("id", sp.id);
    await avanzarGanadorConByes(cuadroId, sigRonda as Ronda, posicionSiguiente, ganadorId, admin);
  }
}
