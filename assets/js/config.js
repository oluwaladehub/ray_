export function getSupabaseConfig() {
  const cfg = window.__RR_PUBLIC_CONFIG__;
  if (!cfg || typeof cfg !== "object") return null;

  const url = typeof cfg.supabaseUrl === "string" ? cfg.supabaseUrl.trim() : "";
  const anonKey = typeof cfg.supabaseAnonKey === "string" ? cfg.supabaseAnonKey.trim() : "";

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

