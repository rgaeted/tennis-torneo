const UUID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function parsePartidoIdFromQr(raw: string): string | null {
  const trimmed = raw.trim();
  const deep = trimmed.match(/mistorneos:\/\/partido\/([0-9a-f-]{36})/i);
  if (deep) return deep[1].toLowerCase();

  const live = trimmed.match(/\/live\/([0-9a-f-]{36})/i);
  if (live) return live[1].toLowerCase();

  if (UUID.test(trimmed) && trimmed.length === 36) return trimmed.toLowerCase();

  return null;
}
