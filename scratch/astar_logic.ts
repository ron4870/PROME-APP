import * as turf from '@turf/turf';

// Simplified Priority Queue for A*
class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number) {
    let contain = false;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].priority > priority) {
        this.items.splice(i, 0, { element, priority });
        contain = true;
        break;
      }
    }
    if (!contain) this.items.push({ element, priority });
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// Douglas Peucker Simplification
function getSqDist(p1: [number, number], p2: [number, number]) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

function getSqSegDist(p: [number, number], p1: [number, number], p2: [number, number]) {
  let x = p1[0], y = p1[1];
  let dx = p2[0] - x, dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points: [number, number][], first: number, last: number, sqTolerance: number, simplified: [number, number][]) {
  let maxSqDist = sqTolerance;
  let index = -1;

  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

export function simplifyDouglasPeucker(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 1]);
  return simplified;
}

export async function runAStar(
  startLat: number, startLng: number, 
  endLat: number, endLng: number,
  getElevation: (lat: number, lng: number) => Promise<number>,
  maxGradePercent: number = 6
): Promise<[number, number][]> {
  // Define grid 
  const GRID_SIZE = 50; 
  const minLat = Math.min(startLat, endLat) - 0.01;
  const maxLat = Math.max(startLat, endLat) + 0.01;
  const minLng = Math.min(startLng, endLng) - 0.01;
  const maxLng = Math.max(startLng, endLng) + 0.01;

  const latStep = (maxLat - minLat) / GRID_SIZE;
  const lngStep = (maxLng - minLng) / GRID_SIZE;

  // Build Grid Elevations
  const gridE: number[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const lat = minLat + y * latStep;
      const lng = minLng + x * lngStep;
      // In real code we fetch this in batch 
      row.push(await getElevation(lat, lng)); 
    }
    gridE.push(row);
  }

  const startX = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((startLng - minLng) / lngStep)));
  const startY = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((startLat - minLat) / latStep)));
  
  const endX = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((endLng - minLng) / lngStep)));
  const endY = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((endLat - minLat) / latStep)));

  // A* logic...
  return [];
}
