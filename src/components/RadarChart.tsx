'use client';

import React, { useMemo, useState } from 'react';
import {
  getRadarGeometry,
  getLevelPolygonPoints,
  getDataPolygonPoints,
  pointsToSvgPath,
  DIMENSION_PALETTES,
} from '@/lib/polygonMath';
import { CorrectnessScore } from '@/types/game';

interface RadarChartProps {
  numDimensions: number;
  dimensions: string[];
  votes?: Record<number, number>; // dimensionIndex -> conteggio voti
  totalVoters?: number;
  correctness?: Record<number, CorrectnessScore>; // dimensionIndex -> 0 | 0.5 | 1
  showVotes?: boolean;
  showCorrectness?: boolean;
  onDimensionClick?: (index: number) => void;
  interactive?: boolean;
  size?: number;
}

export default function RadarChart({
  numDimensions,
  dimensions,
  votes = {},
  totalVoters = 0,
  correctness = {},
  showVotes = true,
  showCorrectness = false,
  onDimensionClick,
  interactive = false,
  size = 580,
}: RadarChartProps) {
  const [activeLayer, setActiveLayer] = useState<'both' | 'votes' | 'correctness'>('both');
  const [hoveredDim, setHoveredDim] = useState<number | null>(null);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.36; // Spazio per le etichette esterne

  // Geometria dei vertici
  const vertices = useMemo(() => {
    return getRadarGeometry(numDimensions, dimensions, centerX, centerY, radius, 1.22);
  }, [numDimensions, dimensions, centerX, centerY, radius]);

  // Griglie concentriche regolari (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolygons = useMemo(() => {
    return gridLevels.map((lvl) => ({
      level: lvl,
      points: getLevelPolygonPoints(vertices, lvl, centerX, centerY, radius),
      path: pointsToSvgPath(getLevelPolygonPoints(vertices, lvl, centerX, centerY, radius)),
    }));
  }, [vertices, centerX, centerY, radius]);

  // Calcolo dei valori normalizzati per i VOTI
  const voteValues = useMemo(() => {
    if (totalVoters === 0) return new Array(numDimensions).fill(0);
    return dimensions.map((_, i) => {
      const count = votes[i] || 0;
      return count / totalVoters;
    });
  }, [dimensions, votes, totalVoters, numDimensions]);

  const votesPolygonPoints = useMemo(() => {
    return getDataPolygonPoints(vertices, voteValues, centerX, centerY, radius);
  }, [vertices, voteValues, centerX, centerY, radius]);

  const votesPath = useMemo(() => {
    return pointsToSvgPath(votesPolygonPoints);
  }, [votesPolygonPoints]);

  // Calcolo dei valori per la CORRETTEZZA (0, 0.5, 1)
  const correctnessValues = useMemo(() => {
    return dimensions.map((_, i) => {
      const score = correctness[i] ?? 0;
      return score; // 1, 0.5 o 0
    });
  }, [dimensions, correctness]);

  const correctnessPolygonPoints = useMemo(() => {
    return getDataPolygonPoints(vertices, correctnessValues, centerX, centerY, radius);
  }, [vertices, correctnessValues, centerX, centerY, radius]);

  const correctnessPath = useMemo(() => {
    return pointsToSvgPath(correctnessPolygonPoints);
  }, [correctnessPolygonPoints]);

  const shouldRenderVotes = showVotes && (activeLayer === 'both' || activeLayer === 'votes');
  const shouldRenderCorrectness = showCorrectness && (activeLayer === 'both' || activeLayer === 'correctness');

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Controlli Vista Layer (se entrambi attivi) */}
      {showVotes && showCorrectness && (
        <div className="flex items-center gap-2 mb-3 bg-zinc-900/90 border border-zinc-700/60 p-1.5 rounded-xl text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveLayer('both')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeLayer === 'both'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sovrapposizione
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('votes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeLayer === 'votes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-indigo-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            Voti Partecipanti
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('correctness')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeLayer === 'correctness'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Risposta Corretta
          </button>
        </div>
      )}

      {/* SVG Container Grafico Radar Poligonale */}
      <div className="relative w-full aspect-square max-w-[580px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full select-none overflow-visible drop-shadow-2xl"
        >
          <defs>
            {/* Gradiente per Voti dei Partecipanti (Viola/Indaco) */}
            <linearGradient id="votesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.45" />
            </linearGradient>

            {/* Gradiente per Risposte Corrette (Smeraldo/Verde) */}
            <linearGradient id="correctnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.55" />
            </linearGradient>

            {/* Effetto Glow / Ombra Neon */}
            <filter id="glowVotes" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#6366F1" floodOpacity="0.5" />
            </filter>
            <filter id="glowCorrect" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#10B981" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Sfondo cerchio di base leggermente sfumato */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="#18181b"
            fillOpacity="0.6"
            className="transition-all"
          />

          {/* Griglie Poligonali Concentriche */}
          {gridPolygons.map(({ level, path }) => (
            <path
              key={`grid-${level}`}
              d={path}
              fill="none"
              stroke={level === 1.0 ? '#52525b' : '#3f3f46'}
              strokeWidth={level === 1.0 ? 2 : 1}
              strokeDasharray={level === 1.0 ? undefined : '3 3'}
              strokeOpacity={level === 1.0 ? 0.9 : 0.5}
            />
          ))}

          {/* Etichette percentuali sulla direttrice verticale */}
          {gridLevels.map((lvl) => (
            <text
              key={`lbl-${lvl}`}
              x={centerX + 6}
              y={centerY - radius * lvl}
              fill="#71717a"
              fontSize={10}
              fontWeight="600"
              dominantBaseline="middle"
            >
              {Math.round(lvl * 100)}%
            </text>
          ))}

          {/* Assi Radiali dal centro ai vertici del poligono */}
          {vertices.map((v) => (
            <line
              key={`spoke-${v.dimensionIndex}`}
              x1={centerX}
              y1={centerY}
              x2={v.outerPoint.x}
              y2={v.outerPoint.y}
              stroke="#52525b"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
          ))}

          {/* 1. LAYER VOTI PARTECIPANTI (Poligono di Riempimento Votazioni) */}
          {shouldRenderVotes && totalVoters > 0 && (
            <g className="transition-all duration-700 ease-out">
              <path
                d={votesPath}
                fill="url(#votesGradient)"
                stroke="#6366F1"
                strokeWidth={3}
                strokeLinejoin="round"
                filter="url(#glowVotes)"
                className="transition-all duration-500"
              />
              {/* Punti sui vertici dei voti */}
              {votesPolygonPoints.map((pt, i) => {
                const count = votes[i] || 0;
                const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
                return (
                  <g key={`vote-pt-${i}`} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredDim === i ? 7 : 5}
                      fill="#818CF8"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      className="transition-all duration-300"
                    />
                    {/* Badge con conteggio voti sopra il punto se count > 0 */}
                    {count > 0 && (
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        fill="#E0E7FF"
                        fontSize={11}
                        fontWeight="700"
                        className="bg-black/80 pointer-events-none drop-shadow"
                      >
                        {count} ({pct}%)
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 2. LAYER RISPOSTE CORRETTE (Poligono di Riempimento Correttezza: 0, 0.5, 1) */}
          {shouldRenderCorrectness && (
            <g className="transition-all duration-700 ease-out">
              <path
                d={correctnessPath}
                fill="url(#correctnessGradient)"
                stroke="#10B981"
                strokeWidth={3.5}
                strokeLinejoin="round"
                filter="url(#glowCorrect)"
                className="transition-all duration-500"
              />
              {/* Punti sui vertici della correttezza */}
              {correctnessPolygonPoints.map((pt, i) => {
                const score = correctness[i] ?? 0;
                if (score === 0) return null;
                return (
                  <g key={`corr-pt-${i}`} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={6}
                      fill="#34D399"
                      stroke="#064E3B"
                      strokeWidth={2}
                      className="transition-all duration-300 animate-pulse"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 13}
                      textAnchor="middle"
                      fill="#A7F3D0"
                      fontSize={11}
                      fontWeight="800"
                      className="drop-shadow pointer-events-none"
                    >
                      {score === 1 ? '1.0 pt' : '0.5 pt'}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Vertici e Nomi delle Dimensioni agli estremi degli assi */}
          {vertices.map((v) => {
            const palette = DIMENSION_PALETTES[v.dimensionIndex % DIMENSION_PALETTES.length];
            const isHovered = hoveredDim === v.dimensionIndex;
            const voteCount = votes[v.dimensionIndex] || 0;
            const scoreVal = correctness[v.dimensionIndex] ?? 0;

            return (
              <g
                key={`vertex-group-${v.dimensionIndex}`}
                onMouseEnter={() => setHoveredDim(v.dimensionIndex)}
                onMouseLeave={() => setHoveredDim(null)}
                onClick={() => onDimensionClick && onDimensionClick(v.dimensionIndex)}
                className={interactive ? 'cursor-pointer group' : ''}
              >
                {/* Punto esterno all'estremo dell'asse */}
                <circle
                  cx={v.outerPoint.x}
                  cy={v.outerPoint.y}
                  r={isHovered ? 6 : 4}
                  fill={palette.main}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  className="transition-all"
                />

                {/* Etichetta del Nome della Dimensione */}
                <text
                  x={v.labelPoint.x}
                  y={v.labelPoint.y}
                  textAnchor={v.textAnchor}
                  dominantBaseline={v.dominantBaseline}
                  fill={isHovered ? '#FFFFFF' : '#E4E4E7'}
                  fontSize={13}
                  fontWeight={isHovered ? '800' : '700'}
                  className="transition-all drop-shadow-md select-none"
                >
                  {v.label}
                </text>

                {/* Dettaglio stato sotto etichetta se abilitato */}
                {(showVotes || showCorrectness) && (
                  <text
                    x={v.labelPoint.x}
                    y={v.labelPoint.y + (v.dominantBaseline === 'hanging' ? 16 : -14)}
                    textAnchor={v.textAnchor}
                    fill={scoreVal > 0 ? '#34D399' : '#A1A1AA'}
                    fontSize={11}
                    fontWeight="600"
                  >
                    {showVotes && totalVoters > 0 ? `${voteCount} voti` : ''}
                    {showVotes && showCorrectness && scoreVal > 0 ? ' • ' : ''}
                    {showCorrectness && scoreVal > 0 ? (scoreVal === 1 ? '✓ Corretta (1)' : '½ Parziale (0.5)') : ''}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legenda Riassuntiva */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs sm:text-sm text-zinc-300">
        {showVotes && (
          <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/40 px-3 py-1.5 rounded-lg">
            <span className="w-3.5 h-3.5 rounded bg-indigo-500 shadow-sm" />
            <span className="font-semibold text-indigo-200">
              Riempimento Votazioni ({totalVoters} {totalVoters === 1 ? 'voto' : 'voti'})
            </span>
          </div>
        )}
        {showCorrectness && (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/40 px-3 py-1.5 rounded-lg">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm" />
            <span className="font-semibold text-emerald-200">
              Riempimento Risposta Corretta (Target)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
