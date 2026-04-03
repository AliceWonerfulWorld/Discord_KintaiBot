export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { url, anonKey };
}

export function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return false;
  }

  if (url.includes("your-project-ref") || anonKey === "your-anon-key") {
    return false;
  }

  return true;
}

export function getSupabaseSetupStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasUrl = Boolean(url);
  const hasAnonKey = Boolean(anonKey);
  const isUrlPlaceholder = Boolean(url?.includes("your-project-ref"));
  const isAnonPlaceholder = anonKey === "your-anon-key";

  const urlReady = hasUrl && !isUrlPlaceholder;
  const anonKeyReady = hasAnonKey && !isAnonPlaceholder;

  const checks = [urlReady, anonKeyReady];
  const completedCount = checks.filter(Boolean).length;

  return {
    hasUrl,
    hasAnonKey,
    isUrlPlaceholder,
    isAnonPlaceholder,
    urlReady,
    anonKeyReady,
    envReady: urlReady && anonKeyReady,
    completedCount,
    totalCount: checks.length
  };
}
