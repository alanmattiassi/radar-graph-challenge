export interface Point {
  x: number;
  y: number;
}

export interface PolygonVertex {
  dimensionIndex: number;
  label: string;
  angle: number; // in radians
  center: Point;
  outerPoint: Point;
  labelPoint: Point;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'auto' | 'central' | 'hanging';
}

/**
 * Calcola la geometria per un grafo radar a N dimensioni.
 * Garantisce poligoni regolari: N=3 (triangolo), N=4 (quadrato), N=5 (pentagono), etc.
 */
export function getRadarGeometry(
  numDimensions: number,
  dimensionNames: string[],
  centerX: number,
  centerY: number,
  radius: number,
  labelOffset: number = 1.22
): PolygonVertex[] {
  const vertices: PolygonVertex[] = [];
  const count = Math.max(3, numDimensions);

  for (let i = 0; i < count; i++) {
    // Si inizia dall'alto (ore 12 = -PI/2) e si procede in senso orario
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const outerX = centerX + radius * cos;
    const outerY = centerY + radius * sin;

    const labelX = centerX + radius * labelOffset * cos;
    const labelY = centerY + radius * labelOffset * sin;

    // Allineamento intelligente del testo in base all'angolo per evitare tagli
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    if (cos > 0.15) {
      textAnchor = 'start';
    } else if (cos < -0.15) {
      textAnchor = 'end';
    }

    let dominantBaseline: 'auto' | 'central' | 'hanging' = 'central';
    if (sin < -0.4) {
      dominantBaseline = 'auto'; // in alto
    } else if (sin > 0.4) {
      dominantBaseline = 'hanging'; // in basso
    }

    vertices.push({
      dimensionIndex: i,
      label: dimensionNames[i] || `Dim ${i + 1}`,
      angle,
      center: { x: centerX, y: centerY },
      outerPoint: { x: outerX, y: outerY },
      labelPoint: { x: labelX, y: labelY },
      textAnchor,
      dominantBaseline,
    });
  }

  return vertices;
}

/**
 * Calcola le coordinate dei punti per un dato livello (da 0 a 1) per formare un poligono concentrico.
 */
export function getLevelPolygonPoints(
  vertices: PolygonVertex[],
  level: number, // 0.0 to 1.0
  centerX: number,
  centerY: number,
  radius: number
): Point[] {
  return vertices.map((v) => {
    const r = radius * Math.max(0, Math.min(1, level));
    return {
      x: centerX + r * Math.cos(v.angle),
      y: centerY + r * Math.sin(v.angle),
    };
  });
}

/**
 * Calcola le coordinate del poligono di dati (valori tra 0 e 1 per ciascuna dimensione)
 */
export function getDataPolygonPoints(
  vertices: PolygonVertex[],
  values: number[], // array di valori tra 0 e 1, della stessa lunghezza di vertices
  centerX: number,
  centerY: number,
  radius: number
): Point[] {
  return vertices.map((v, i) => {
    const val = Math.max(0, Math.min(1, values[i] ?? 0));
    const r = radius * val;
    return {
      x: centerX + r * Math.cos(v.angle),
      y: centerY + r * Math.sin(v.angle),
    };
  });
}

/**
 * Converte una lista di punti in una stringa SVG path valida: "M x,y L x,y ... Z"
 */
export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const path = `M ${first.x.toFixed(2)},${first.y.toFixed(2)} ` +
    rest.map((p) => `L ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') +
    ' Z';
  return path;
}

/**
 * Palette cromatica per le dimensioni (colori coordinati e ben distinguibili)
 */
export const DIMENSION_PALETTES = [
  { main: '#3B82F6', light: '#93C5FD', bg: 'bg-blue-500', text: 'text-blue-500' },     // Blu
  { main: '#10B981', light: '#6EE7B7', bg: 'bg-emerald-500', text: 'text-emerald-500' }, // Smeraldo
  { main: '#F59E0B', light: '#FCD34D', bg: 'bg-amber-500', text: 'text-amber-500' },   // Ambra
  { main: '#EC4899', light: '#F472B6', bg: 'bg-pink-500', text: 'text-pink-500' },     // Rosa
  { main: '#8B5CF6', light: '#C4B5FD', bg: 'bg-purple-500', text: 'text-purple-500' }, // Viola
  { main: '#06B6D4', light: '#67E8F9', bg: 'bg-cyan-500', text: 'text-cyan-500' },     // Ciano
  { main: '#F97316', light: '#FDBA74', bg: 'bg-orange-500', text: 'text-orange-500' }, // Arancione
  { main: '#14B8A6', light: '#5EEAD4', bg: 'bg-teal-500', text: 'text-teal-500' },     // Ottanio
  { main: '#E11D48', light: '#FDA4AF', bg: 'bg-rose-500', text: 'text-rose-500' },     // Rosso Rubino
  { main: '#84CC16', light: '#BEF264', bg: 'bg-lime-500', text: 'text-lime-500' },     // Lime
];
