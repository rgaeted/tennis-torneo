interface Jugador { nombre: string; apellido: string; }

interface Props {
  jugador1: Jugador | null;
  jugador2: Jugador | null;
  ganadorId: string | null;
  jugador1Id: string | null;
  jugador2Id: string | null;
}

export function BracketMatch({ jugador1, jugador2, ganadorId, jugador1Id, jugador2Id }: Props) {
  const nombre = (j: Jugador | null) => j ? `${j.nombre} ${j.apellido}` : "—";

  return (
    <div className="w-44 border border-gray-800 rounded-lg overflow-hidden bg-gray-900 text-sm">
      {[
        { jugador: jugador1, id: jugador1Id },
        { jugador: jugador2, id: jugador2Id },
      ].map(({ jugador, id }, i) => (
        <div
          key={i}
          className={`px-3 py-2 ${i === 0 ? "border-b border-gray-800" : ""} ${
            ganadorId && ganadorId === id
              ? "text-green-400 font-semibold"
              : ganadorId
              ? "text-gray-600"
              : "text-gray-300"
          }`}
        >
          {nombre(jugador)}
        </div>
      ))}
    </div>
  );
}
