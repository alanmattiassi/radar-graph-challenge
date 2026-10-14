'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, Smartphone } from 'lucide-react';

interface JoinQRCardProps {
  roomCode: string;
}

export default function JoinQRCard({ roomCode }: JoinQRCardProps) {
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setJoinUrl(`${origin}/join?room=${roomCode}`);
    }
  }, [roomCode]);

  const handleCopy = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-3 text-indigo-400">
        <Smartphone className="w-5 h-5" />
        <h3 className="font-bold text-base text-white">Scansiona per Giocare</h3>
      </div>

      <p className="text-xs text-zinc-400 mb-4 max-w-xs">
        Inquadra il QR Code con lo smartphone per accedere alla stanza e votare.
      </p>

      {/* QR Code con cornice ad alto contrasto per massima leggibilità da fotocamera */}
      <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
        {joinUrl ? (
          <QRCodeSVG
            value={joinUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        ) : (
          <div className="w-[180px] h-[180px] bg-zinc-200 animate-pulse rounded-xl" />
        )}
      </div>

      {/* Codice Stanza */}
      <div className="mt-4 flex flex-col items-center">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
          Codice Stanza
        </span>
        <span className="text-2xl font-mono font-black text-indigo-400 tracking-widest mt-0.5">
          {roomCode}
        </span>
      </div>

      {/* Pulsante Copia Link */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 transition-all cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">Link copiato negli appunti!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copia Link Partecipanti</span>
          </>
        )}
      </button>
    </div>
  );
}
