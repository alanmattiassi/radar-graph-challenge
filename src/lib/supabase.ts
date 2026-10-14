import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'radar_game_supabase_config';

export function getSupabaseCredentials(): { url: string; anonKey: string } | null {
  // 1. Variabili d'ambiente (default da Vercel/.env.local)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey };
  }

  // 2. Controllo configurazione salvata in localStorage (per setup rapido via UI)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          return { url: parsed.url, anonKey: parsed.anonKey };
        }
      }
    } catch {
      // Ignora errori di parsing
    }
  }

  return null;
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, anonKey }));
  } catch (e) {
    console.error('Errore nel salvataggio delle credenziali Supabase:', e);
  }
}

export function clearCustomSupabaseCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds) return null;

  if (!cachedClient) {
    cachedClient = createClient(creds.url, creds.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return cachedClient;
}
