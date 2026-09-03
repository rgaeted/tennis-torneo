import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";
import type { Database } from "./types";

export async function getRequestUser(request: Request): Promise<{ id: string } | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (!token) return null;
    const anon = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id } : null;
}
