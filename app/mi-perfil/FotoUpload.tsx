"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function FotoUpload({ userId, fotoUrl }: { userId: string; fotoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(fotoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5 MB");
      return;
    }

    setError(null);
    setLoading(true);

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const supabase = createClient();

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    // Bust cache with timestamp
    const urlConTimestamp = `${publicUrl}?t=${Date.now()}`;

    // Save URL to jugador record
    const { error: updateError } = await supabase
      .from("jugador")
      .update({ foto_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setPreview(urlConTimestamp);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="relative group"
        title="Cambiar foto"
      >
        <div className="w-24 h-24 rounded-full overflow-hidden bg-navy-800 border-2 border-navy-700 group-hover:border-court transition-colors flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <p className="text-xs text-slate-600">
        {loading ? "Subiendo..." : "Click para cambiar foto"}
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
