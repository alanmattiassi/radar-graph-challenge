'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import RadarChart from '@/components/RadarChart';
import { Play, Smartphone, Sparkles, HelpCircle, ArrowRight, ShieldCheck, Layers } from 'lucide-react';

export default function HomePage() {
  const [demoDimensions, setDemoDimensions] = useState<number>(5);
  const demoNames = [
    'Obiettivo Lusorio',
    'Mezzi Lusori',
    'Atteggiamento Lusorio',
    'Regole Costitutive',
    'Feedback & Flusso',
    'Dimensione 6',
  ].slice(0, demoDimensions);

  const sampleVotes: Record<number, number> = {
    0: 8,
    1: 4,
    2: 12,
    3: 3,
    4: 7,
  };

  const sampleCorrectness: Record<number, 0 | 0.5 | 1> = {
    0: 1, // Corretta
    1: 0.5, // Parziale
    2: 0,
    3: 0,
    4: 0.5,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-white shadow-lg text-base">
            RG
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              Radar Graph Challenge
            </h1>
            <p className="text-xs text-zinc-400">Gioco interattivo sul riempimento dei grafi ad area</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/join"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
          >
            Partecipa con Codice
          </Link>
          <Link
            href="/host"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ospita Partita</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Colonna Sinistra: Descrizione e Pulsanti di Accesso */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-device • Online su Vercel & Supabase • Offline Resilience</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Visualizza i voti e le risposte corrette sul{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Grafo a Radar Poligonale
              </span>
            </h2>

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Configura il numero di dimensioni desiderate: se ne imposti tre il grafico sarà{' '}
              <strong className="text-zinc-200">triangolare</strong>, con quattro{' '}
              <strong className="text-zinc-200">quadrato</strong>, con cinque{' '}
              <strong className="text-zinc-200">pentagonale</strong> e così via.
              I partecipanti si collegano tramite QR Code con il loro smartphone, votano in tempo reale e scoprono se hanno individuato la dimensione corretta.
            </p>

            {/* Azioni Principali */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/host"
                className="py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold shadow-xl transition flex items-center justify-center gap-2 text-sm sm:text-base group"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Crea e Avvia Partita (Host)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>

              <Link
                href="/join"
                className="py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-bold shadow-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <span>Entra da Smartphone</span>
              </Link>
            </div>

            {/* Caratteristiche in pillole */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-zinc-800/80 text-xs text-zinc-400">
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block">Riempimento Sovrapposto</strong>
                  Voti (viola) e risposte corrette (verde) visibili contemporaneamente.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block">Correttezza Flessibile</strong>
                  Assegna 1.0 pt alla risposta corretta o 0.5 pt a risposte parziali.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200 block">Resilienza Rete</strong>
                  Dati salvati in locale su ogni smartphone per riconnessioni immediate.
                </div>
              </div>
            </div>
          </div>

          {/* Colonna Destra: Demo Interattiva del Radar Graph Poligonale */}
          <div className="lg:col-span-6 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Dimostrazione Live Poligono
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-semibold border border-indigo-500/20">
                  {demoDimensions === 3 && 'Triangolo'}
                  {demoDimensions === 4 && 'Quadrato'}
                  {demoDimensions === 5 && 'Pentagono'}
                  {demoDimensions === 6 && 'Esagono'}
                </span>
              </div>

              {/* Bottoni Cambio Rapido Dimensioni per Demo */}
              <div className="flex items-center gap-1">
                {[3, 4, 5, 6].map((n) => (
                  <button
                    key={`btn-n-${n}`}
                    type="button"
                    onClick={() => setDemoDimensions(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      demoDimensions === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <RadarChart
              numDimensions={demoDimensions}
              dimensions={demoNames}
              votes={sampleVotes}
              totalVoters={25}
              correctness={sampleCorrectness}
              showVotes={true}
              showCorrectness={true}
              size={480}
            />

            <p className="text-xs text-zinc-400 text-center mt-4">
              Poligono con <span className="text-indigo-400 font-semibold">Riempimento Votazioni</span> (viola) sovrapposto a <span className="text-emerald-400 font-semibold">Risposte Corrette</span> (verde).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        Radar Graph Challenge • Progettato per Vercel, Supabase & Mobile Web Apps
      </footer>
    </div>
  );
}
