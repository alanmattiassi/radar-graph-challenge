'use client';

import React, { useState, useEffect } from 'react';
import {
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
} from '@/lib/supabase';
import { Database, Check, AlertCircle, X, ExternalLink } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupabaseModal({ isOpen, onClose }: SupabaseModalProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    if (creds) {
      setUrl(creds.url);
      setKey(creds.anonKey);
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (url.trim() && key.trim()) {
      saveCustomSupabaseCredentials(url.trim(), key.trim());
      setIsConnected(true);
      setStatus('saved');
      setTimeout(() => {
        setStatus('idle');
        onClose();
        window.location.reload();
      }, 1000);
    }
  };

  const handleReset = () => {
    clearCustomSupabaseCredentials();
    setUrl('');
    setKey('');
    setIsConnected(false);
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connessione Supabase & Cloud</h3>
            <p className="text-xs text-zinc-400">
              Sincronizzazione in tempo reale e persistenza su cloud
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Supabase Configurato:</strong> La stanza sincronizza in tempo reale su rete pubblica.
            </span>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Modalità Locale / Fallback attiva:</strong> Funziona immediatamente via API interne. Per il multi-dispositivo su reti remote e Vercel, puoi collegare Supabase.
            </span>
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Supabase Anon / Public Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-400 flex items-center justify-between">
            <span>Schema SQL pronto nel file <code>supabase_schema.sql</code></span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {isConnected && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/40 border border-red-900/50 rounded-xl transition"
            >
              Rimuovi Credenziali
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl"
          >
            Chiudi
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-lg"
          >
            {status === 'saved' ? 'Salvato!' : 'Salva Configurazione'}
          </button>
        </div>
      </div>
    </div>
  );
}
