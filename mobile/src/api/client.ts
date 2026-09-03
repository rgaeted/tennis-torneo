const API = process.env.EXPO_PUBLIC_API_URL ?? "";

export async function apiFetch(
  path: string,
  accessToken: string | null,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API}${path}`, { ...init, headers });
}
