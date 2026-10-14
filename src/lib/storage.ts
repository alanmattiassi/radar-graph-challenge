import { PlayerSession, RoomState } from '@/types/game';

const PLAYER_SESSION_KEY = 'radar_game_player_session';
const HOST_SESSION_KEY = 'radar_game_host_session';

/**
 * Genera un codice alfanumerico univoco e leggibile per il partecipante (es. P-9F7K)
 */
export function generatePlayerCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `P-${code}`;
}

/**
 * Genera un codice stanza breve e facile da digitare (es. RADAR-42 o R-7B8X)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `R-${code}`;
}

/**
 * Salva la sessione del giocatore su localStorage del dispositivo
 */
export function savePlayerSession(session: PlayerSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Impossibile salvare la sessione del giocatore su localStorage:', e);
  }
}

/**
 * Recupera la sessione salvata del giocatore (se presente)
 */
export function getSavedPlayerSession(): PlayerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAYER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerSession;
  } catch (e) {
    console.error('Errore nel recupero della sessione del giocatore:', e);
    return null;
  }
}

/**
 * Cancella la sessione del giocatore dal dispositivo
 */
export function clearPlayerSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PLAYER_SESSION_KEY);
  } catch (e) {
    console.error('Errore nella cancellazione della sessione del giocatore:', e);
  }
}

/**
 * Salva lo stato della stanza dell'Host in locale
 */
export function saveHostSession(roomState: RoomState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HOST_SESSION_KEY, JSON.stringify(roomState));
  } catch (e) {
    console.error('Errore nel salvataggio della sessione Host:', e);
  }
}

/**
 * Recupera lo stato della stanza dell'Host da localStorage
 */
export function getSavedHostSession(): RoomState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HOST_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RoomState;
  } catch (e) {
    console.error('Errore nel recupero della sessione Host:', e);
    return null;
  }
}
