type SupabaseConfigValidationInput = {
  url: string;
  key: string;
  projectId?: string;
  keyEnvName: string;
  projectIdEnvName: string;
};

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  } catch {
    return null;
  }
}

function getSupabaseProjectRefFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostnameParts = parsed.hostname.split(".");
    return hostnameParts[0] || null;
  } catch {
    return null;
  }
}

function getSupabaseProjectRefFromKey(key: string): string | null {
  const token = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")
    ? key.slice(key.indexOf(".") + 1)
    : key;

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const decodedPayload = decodeBase64Url(parts[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(decodedPayload) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

export function validateSupabaseConfig({
  url,
  key,
  projectId,
  keyEnvName,
  projectIdEnvName,
}: SupabaseConfigValidationInput): void {
  const urlProjectRef = getSupabaseProjectRefFromUrl(url);
  if (!urlProjectRef) {
    throw new Error(`[Supabase] Invalid SUPABASE_URL: ${url}`);
  }

  if (projectId && projectId !== urlProjectRef) {
    throw new Error(
      `[Supabase] Project mismatch: ${projectIdEnvName}="${projectId}" does not match SUPABASE_URL project ref "${urlProjectRef}".`,
    );
  }

  const keyProjectRef = getSupabaseProjectRefFromKey(key);
  if (keyProjectRef && keyProjectRef !== urlProjectRef) {
    throw new Error(
      `[Supabase] Key mismatch: ${keyEnvName} belongs to project "${keyProjectRef}", but SUPABASE_URL points to "${urlProjectRef}". Update your .env so URL, project ID, and key come from the same Supabase project.`,
    );
  }
}
