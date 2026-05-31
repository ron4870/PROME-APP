import * as turf from '@turf/turf';
import { fromBlob } from 'geotiff';
import proj4 from 'proj4';

const getUTMProjString = (zoneStr: string) => {
  const match = zoneStr.match(/(\d+)([NnSs])/);
  if (!match) return '+proj=longlat +datum=WGS84 +no_defs';
  const zone = match[1];
  const hemi = match[2].toUpperCase() === 'S' ? '+south' : '+north';
  return `+proj=utm +zone=${zone} ${hemi} +datum=WGS84 +units=m +no_defs`;
};

// Basic UTM zone projection string generator (WGS 84)
export const getUtmProjString = (zone: string) => {
  const zoneNumber = zone.replace(/[^\d]/g, '');
  const isSouth = zone.toUpperCase().includes('S') ? '+south ' : '';
  return `+proj=utm +zone=${zoneNumber} ${isSouth}+datum=WGS84 +units=m +no_defs`;
};

// AASHTO Simplified Radius calculation (R = V^2 / 127(e+f))
// e_max = 8%, f = ~0.12 for 100km/h
export const calculateMinRadius = (speedKmh: number) => {
  const e = 0.08;
  const f = 0.12; 
  const minR = (speedKmh * speedKmh) / (127 * (e + f));
  return Math.max(minR, 50); // Minimum 50m radius
};

export interface PI {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  spiralLength: number;
}

export interface AlignmentSegment {
  type: 'Tangent' | 'Curve' | 'Spiral';
  points: [number, number][]; // [lat, lng]
  length?: number;
  radius?: number;
  radiusStart?: number;
  radiusEnd?: number;
  dir?: number; // 1 (Right) or -1 (Left)
  spiType?: 'in' | 'out';
}

// Fit horizontal curves to waypoints
const getSpiralPoint = (l: number, R: number, Ls: number) => {
  if (Ls === 0 || R === 0) return { x: 0, y: 0 };
  const x = l - Math.pow(l, 5) / (40 * R * R * Ls * Ls) + Math.pow(l, 9) / (3456 * Math.pow(R, 4) * Math.pow(Ls, 4));
  const y = Math.pow(l, 3) / (6 * R * Ls) - Math.pow(l, 7) / (336 * Math.pow(R, 3) * Math.pow(Ls, 3));
  return { x, y };
};

// -------------------------------------------------------------
// Auto-Routing: A* Grid Search & Geometric Simplification
// -------------------------------------------------------------

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
  dequeue(): T | undefined { return this.items.shift()?.element; }
  isEmpty(): boolean { return this.items.length === 0; }
}

function getSqSegDist(p: [number, number], p1: [number, number], p2: [number, number]) {
  let x = p1[0], y = p1[1];
  let dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = p2[0]; y = p2[1]; } 
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points: [number, number][], first: number, last: number, sqTolerance: number, simplified: [number, number][]) {
  let maxSqDist = sqTolerance, index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
  }
  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

export const generateOptimalCorridor = async (
  startCoord: [number, number], // [lat, lng]
  endCoord: [number, number],
  maxGradePercent: number,
  designSpeed: number,
  surfaceProvider: string,
  surfaceFile: File | null
): Promise<PI[]> => {
  const GRID_SIZE = 60; // 60x60 grid resolution
  
  // Calculate bounding box with 20% buffer
  const minLat = Math.min(startCoord[0], endCoord[0]);
  const maxLat = Math.max(startCoord[0], endCoord[0]);
  const minLng = Math.min(startCoord[1], endCoord[1]);
  const maxLng = Math.max(startCoord[1], endCoord[1]);
  
  const dLat = Math.max(maxLat - minLat, 0.01) * 1.2;
  const dLng = Math.max(maxLng - minLng, 0.01) * 1.2;
  
  const bMinLat = minLat - dLat * 0.1;
  const bMaxLat = maxLat + dLat * 0.1;
  const bMinLng = minLng - dLng * 0.1;
  const bMaxLng = maxLng + dLng * 0.1;

  const latStep = (bMaxLat - bMinLat) / (GRID_SIZE - 1);
  const lngStep = (bMaxLng - bMinLng) / (GRID_SIZE - 1);

  // Generate flat array of coordinates for batch processing
  const flatPoints: [number, number][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      flatPoints.push([bMinLat + y * latStep, bMinLng + x * lngStep]);
    }
  }

  // Fetch Elevations
  let elevations: number[] = [];
  if (surfaceProvider === 'AWS') {
    elevations = await extractOnlineSurfaceProfile(flatPoints, 14);
  } else if (surfaceProvider === 'MANUAL' && surfaceFile) {
    elevations = await extractSurfaceProfile(surfaceFile, flatPoints);
  } else {
    elevations = flatPoints.map(() => 0); // Flat terrain fallback
  }

  // A* Pathfinding setup
  const startX = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((startCoord[1] - bMinLng) / lngStep)));
  const startY = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((startCoord[0] - bMinLat) / latStep)));
  const endX = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((endCoord[1] - bMinLng) / lngStep)));
  const endY = Math.max(0, Math.min(GRID_SIZE-1, Math.floor((endCoord[0] - bMinLat) / latStep)));

  const getNodeKey = (x: number, y: number) => `${x},${y}`;
  const getEl = (x: number, y: number) => elevations[y * GRID_SIZE + x];
  
  // Precalculate grid cell distances to avoid expensive Turf computations in the inner loop
  const p1 = [bMinLng, bMinLat];
  const p2x = [bMinLng + lngStep, bMinLat];
  const p2y = [bMinLng, bMinLat + latStep];
  const distX = turf.distance(p1, p2x, {units: 'meters'});
  const distY = turf.distance(p1, p2y, {units: 'meters'});
  const distDiag = Math.sqrt(distX * distX + distY * distY);

  const getHeuristic = (x: number, y: number) => {
    return Math.sqrt(Math.pow((x - endX) * distX, 2) + Math.pow((y - endY) * distY, 2));
  };

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  const closedSet = new Set<string>();
  const openSet = new PriorityQueue<string>();

  const startKey = getNodeKey(startX, startY);
  const endKey = getNodeKey(endX, endY);

  gScore.set(startKey, 0);
  fScore.set(startKey, getHeuristic(startX, startY));
  openSet.enqueue(startKey, fScore.get(startKey)!);

  let pathFound = false;
  
  while (!openSet.isEmpty()) {
    const currentKey = openSet.dequeue()!;
    if (currentKey === endKey) {
      pathFound = true;
      break;
    }
    
    if (closedSet.has(currentKey)) continue;
    closedSet.add(currentKey);

    const [cx, cy] = currentKey.split(',').map(Number);
    const currEl = getEl(cx, cy);

    // 8-way movement
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        
        const neighborKey = getNodeKey(nx, ny);
        if (closedSet.has(neighborKey)) continue;

        const stepDist = (dx !== 0 && dy !== 0) ? distDiag : (dx !== 0 ? distX : distY);
        const nextEl = getEl(nx, ny);
        
        // Calculate Grade Penalty
        const grade = Math.abs((nextEl - currEl) / stepDist) * 100;
        let penalty = 0;
        
        if (grade > maxGradePercent) {
          penalty = 10000; // Extremely high penalty for exceeding grade
        } else {
          penalty = grade * 20; // Heuristic penalty for earthwork
        }

        const tentativeGScore = gScore.get(currentKey)! + stepDist + penalty;

        if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
          cameFrom.set(neighborKey, currentKey);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + getHeuristic(nx, ny));
          openSet.enqueue(neighborKey, fScore.get(neighborKey)!);
        }
      }
    }
  }

  if (!pathFound) return []; // Should rarely happen unless walled off

  // Reconstruct path
  let curr = endKey;
  const gridPath: [number, number][] = [];
  while (cameFrom.has(curr)) {
    const [cx, cy] = curr.split(',').map(Number);
    gridPath.unshift([flatPoints[cy*GRID_SIZE+cx][0], flatPoints[cy*GRID_SIZE+cx][1]]);
    curr = cameFrom.get(curr)!;
  }
  gridPath.unshift([startCoord[0], startCoord[1]]);
  gridPath[gridPath.length-1] = [endCoord[0], endCoord[1]]; // Snap exact ends

  // Douglas-Peucker Simplification to get PIs
  // Convert Lat/Lng to local metric coords for accurate simplification
  const origin = turf.point([gridPath[0][1], gridPath[0][0]]);
  const metricPath: [number, number][] = gridPath.map(pt => {
    const p = turf.point([pt[1], pt[0]]);
    const dist = turf.distance(origin, p, {units: 'meters'});
    const brng = turf.bearing(origin, p);
    const x = dist * Math.sin(brng * Math.PI / 180);
    const y = dist * Math.cos(brng * Math.PI / 180);
    return [x, y];
  });

  // Tolerance sets how tight the PIs hug the actual jagged grid path
  // E.g., 200m tolerance creates fewer, broader PIs.
  const sqTolerance = 150 * 150; 
  const simplifiedMetric = [metricPath[0]];
  simplifyDPStep(metricPath, 0, metricPath.length - 1, sqTolerance, simplifiedMetric);
  simplifiedMetric.push(metricPath[metricPath.length - 1]);

  // Convert simplified metric back to Lat/Lng
  const simplifiedLatLng: [number, number][] = simplifiedMetric.map(mp => {
    const dist = Math.sqrt(mp[0]*mp[0] + mp[1]*mp[1]);
    const brng = Math.atan2(mp[0], mp[1]) * 180 / Math.PI;
    const p = turf.destination(origin, dist, brng, {units: 'meters'});
    return [p.geometry.coordinates[1], p.geometry.coordinates[0]];
  });

  // Generate PI objects
  const defaultRadius = designSpeed >= 100 ? 400 : 200;
  const defaultSpiral = designSpeed >= 100 ? 60 : 40;

  return simplifiedLatLng.map((coord, idx) => ({
    id: `auto-pi-${Date.now()}-${idx}`,
    lat: coord[0],
    lng: coord[1],
    radius: defaultRadius,
    spiralLength: defaultSpiral
  }));
};

export const optimizeHorizontalAlignment = (
  pis: PI[], 
  _utmZone: string // kept for backward compatibility if needed, but not strictly used now due to local metric projection
): AlignmentSegment[] => {
  if (pis.length < 2) return [];

  const segments: AlignmentSegment[] = [];
  
  // Convert PIs to local metric plane relative to first point for fast geometry
  const origin = turf.point([pis[0].lng, pis[0].lat]);
  const toLocal = (lat: number, lng: number) => {
    const pt = turf.point([lng, lat]);
    const dist = turf.distance(origin, pt, { units: 'meters' });
    const bearing = turf.bearing(origin, pt);
    // Convert to polar coords
    const bearingRad = (90 - bearing) * Math.PI / 180;
    return { x: dist * Math.cos(bearingRad), y: dist * Math.sin(bearingRad) };
  };
  
  const toLL = (x: number, y: number): [number, number] => {
    const dist = Math.sqrt(x*x + y*y);
    const bearingRad = Math.atan2(y, x);
    const bearing = 90 - (bearingRad * 180 / Math.PI);
    const dest = turf.destination(origin, dist, bearing, { units: 'meters' });
    return [dest.geometry.coordinates[1], dest.geometry.coordinates[0]];
  };

  const localPIs = pis.map(pi => ({ ...toLocal(pi.lat, pi.lng), radius: pi.radius, spiralLength: pi.spiralLength }));

  let currentPoint = { x: localPIs[0].x, y: localPIs[0].y };

  for (let i = 1; i < localPIs.length - 1; i++) {
    const pPrev = localPIs[i-1];
    const pCur = localPIs[i];
    const pNext = localPIs[i+1];

    const theta1 = Math.atan2(pCur.y - pPrev.y, pCur.x - pPrev.x);
    const theta2 = Math.atan2(pNext.y - pCur.y, pNext.x - pCur.x);
    
    let delta = theta2 - theta1;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const deltaAbs = Math.abs(delta);
    
    let R = pCur.radius || 100;
    let Ls = pCur.spiralLength || 0;
    
    // Validate bounds
    const thetaS = Ls / (2 * R);
    if (2 * thetaS >= deltaAbs) {
      Ls = (deltaAbs * R) * 0.9;
    }
    
    // Shift (p) and throw (k)
    const p = (Ls * Ls) / (24 * R) - Math.pow(Ls, 4) / (2688 * Math.pow(R, 3));
    const k = Ls / 2 - Math.pow(Ls, 3) / (240 * R * R);
    
    let T = (R + p) * Math.tan(deltaAbs / 2) + k;
    
    // Clamping if curve exceeds available tangent distance
    const distPrev = Math.sqrt(Math.pow(pCur.x - pPrev.x, 2) + Math.pow(pCur.y - pPrev.y, 2));
    const distNext = Math.sqrt(Math.pow(pNext.x - pCur.x, 2) + Math.pow(pNext.y - pCur.y, 2));
    const maxT = Math.min(distPrev / 2, distNext / 2);
    
    if (T > maxT) {
      const scale = maxT / T;
      R *= scale;
      Ls *= scale;
    }
    
    // Recalculate after scale
    const p2 = (Ls * Ls) / (24 * R);
    const k2 = Ls / 2;
    const T2 = (R + p2) * Math.tan(deltaAbs / 2) + k2;
    
    const tsX = pCur.x - Math.cos(theta1) * T2;
    const tsY = pCur.y - Math.sin(theta1) * T2;
    
    const stX = pCur.x + Math.cos(theta2) * T2;
    const stY = pCur.y + Math.sin(theta2) * T2;

    // Add Tangent
    segments.push({
      type: 'Tangent',
      points: [toLL(currentPoint.x, currentPoint.y), toLL(tsX, tsY)]
    });
    
    // Spiral and Curve calculations
    const scLocal = getSpiralPoint(Ls, R, Ls);
    const scX = tsX + scLocal.x * Math.cos(theta1) - scLocal.y * Math.sin(theta1) * Math.sign(delta);
    const scY = tsY + scLocal.x * Math.sin(theta1) + scLocal.y * Math.cos(theta1) * Math.sign(delta);

    const csLocal = getSpiralPoint(Ls, R, Ls);
    const csX = stX - csLocal.x * Math.cos(theta2) - csLocal.y * Math.sin(theta2) * Math.sign(delta);
    const csY = stY - csLocal.x * Math.sin(theta2) + csLocal.y * Math.cos(theta2) * Math.sign(delta);

    // Add Inbound Spiral
    if (Ls > 0) {
      const spiralPts: [number, number][] = [];
      for (let l = 0; l <= Ls; l += Math.max(Ls/10, 2)) {
        const pt = getSpiralPoint(l, R, Ls);
        const ptX = tsX + pt.x * Math.cos(theta1) - pt.y * Math.sin(theta1) * Math.sign(delta);
        const ptY = tsY + pt.x * Math.sin(theta1) + pt.y * Math.cos(theta1) * Math.sign(delta);
        spiralPts.push(toLL(ptX, ptY));
      }
      spiralPts.push(toLL(scX, scY));
      segments.push({ 
        type: 'Spiral', 
        points: spiralPts,
        length: Ls,
        radiusStart: 0, // LandXML often uses 0 or Infinity for tangent
        radiusEnd: R,
        dir: Math.sign(delta),
        spiType: 'in'
      });
    }
    
    // Circular Curve
    const Lc = R * (deltaAbs - Ls/R);
    if (Lc > 0) {
      const curvePts: [number, number][] = [];
      const thetaS = (Ls / (2 * R)) * Math.sign(delta);
      const angleAtSC = theta1 + thetaS;
      
      const cx = scX - R * Math.sin(angleAtSC) * Math.sign(delta);
      const cy = scY + R * Math.cos(angleAtSC) * Math.sign(delta);
      
      const startAngle = Math.atan2(scY - cy, scX - cx);
      const endAngle = Math.atan2(csY - cy, csX - cx);
      
      let sweep = endAngle - startAngle;
      if (Math.sign(delta) > 0 && sweep < 0) sweep += 2*Math.PI;
      if (Math.sign(delta) < 0 && sweep > 0) sweep -= 2*Math.PI;

      for (let j = 0; j <= 10; j++) {
        const angle = startAngle + sweep * (j / 10);
        curvePts.push(toLL(cx + R * Math.cos(angle), cy + R * Math.sin(angle)));
      }
      segments.push({ 
        type: 'Curve', 
        points: curvePts,
        length: Lc,
        radius: R,
        dir: Math.sign(delta)
      });
    }

    // Add Outbound Spiral
    if (Ls > 0) {
      const fSpiralPts: [number, number][] = [];
      fSpiralPts.push(toLL(csX, csY));
      for (let l = Math.max(Ls/10, 2); l < Ls; l += Math.max(Ls/10, 2)) {
        const rem = Ls - l;
        const pt = getSpiralPoint(rem, R, Ls);
        const ptX = stX - pt.x * Math.cos(theta2) - pt.y * Math.sin(theta2) * Math.sign(delta);
        const ptY = stY - pt.x * Math.sin(theta2) + pt.y * Math.cos(theta2) * Math.sign(delta);
        fSpiralPts.push(toLL(ptX, ptY));
      }
      fSpiralPts.push(toLL(stX, stY));
      segments.push({ 
        type: 'Spiral', 
        points: fSpiralPts,
        length: Ls,
        radiusStart: R,
        radiusEnd: 0,
        dir: Math.sign(delta),
        spiType: 'out'
      });
    }

    currentPoint = { x: stX, y: stY };
  }
  
  // Add Final Tangent
  const lastPI = localPIs[localPIs.length - 1];
  segments.push({
    type: 'Tangent',
    points: [toLL(currentPoint.x, currentPoint.y), toLL(lastPI.x, lastPI.y)]
  });
  
  return segments;
};

// Extract profile from a loaded GeoTIFF surface (Manual)
export const extractSurfaceProfile = async (
  surfaceFile: File, 
  points: [number, number][] // [lat, lng]
): Promise<number[]> => {
  const arrayBuffer = await surfaceFile.arrayBuffer();
  const tiff = await fromBlob(new Blob([arrayBuffer]));
  const image = await tiff.getImage();
  const bbox = image.getBoundingBox();
  const width = image.getWidth();
  const height = image.getHeight();
  const data = await image.readRasters({ interleave: true });

  return points.map(pt => {
    const lat = pt[0];
    const lng = pt[1];
    
    // Check if point is inside GeoTIFF bbox
    if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) {
      return 0; 
    }

    const px = Math.floor((lng - bbox[0]) / (bbox[2] - bbox[0]) * width);
    const py = Math.floor((bbox[3] - lat) / (bbox[3] - bbox[1]) * height);
    
    const idx = (py * width + px);
    return data[idx] as number; 
  });
};

// Mapzen Terrarium Utils for Online Surface Profile Extraction
const lon2tile = (lon: number, zoom: number) => Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
const lat2tile = (lat: number, zoom: number) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
const tile2lon = (x: number, z: number) => (x / Math.pow(2, z) * 360 - 180);
const tile2lat = (y: number, z: number) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
};

const cachedImages: { [url: string]: HTMLImageElement } = {};

const fetchImage = (url: string): Promise<HTMLImageElement> => {
  if (cachedImages[url]) return Promise.resolve(cachedImages[url]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      cachedImages[url] = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export type TileCache = {
  [key: string]: {
    x: number;
    y: number;
    data: Uint8ClampedArray;
  };
};

// Download required tiles into a memory cache for rapid sampling
export const cacheElevationTiles = async (
  points: [number, number][],
  zoom: number = 14
): Promise<TileCache> => {
  if (points.length === 0) return {};

  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  points.forEach(pt => {
    minLat = Math.min(minLat, pt[0]);
    maxLat = Math.max(maxLat, pt[0]);
    minLon = Math.min(minLon, pt[1]);
    maxLon = Math.max(maxLon, pt[1]);
  });

  // Add a buffer to the bounding box to ensure curves don't exceed it
  const latBuffer = 0.02; // Roughly 2km
  const lonBuffer = 0.02;

  const minTx = lon2tile(minLon - lonBuffer, zoom);
  const maxTx = lon2tile(maxLon + lonBuffer, zoom);
  const minTy = lat2tile(maxLat + latBuffer, zoom); // Note: higher lat is lower tile Y
  const maxTy = lat2tile(minLat - latBuffer, zoom);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context.");

  const cache: TileCache = {};
  const promises: Promise<void>[] = [];

  for (let x = minTx; x <= maxTx; x++) {
    for (let y = minTy; y <= maxTy; y++) {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`;
      const key = `${zoom}/${x}/${y}`;
      
      const fetchTask = fetchImage(url).then(img => {
        ctx.clearRect(0, 0, 256, 256);
        ctx.drawImage(img, 0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256).data;
        // Need to copy the array because the canvas is reused
        cache[key] = { x, y, data: new Uint8ClampedArray(imgData) };
      }).catch(err => {
        console.warn(`Failed to cache tile ${url}`, err);
      });
      promises.push(fetchTask);
    }
  }

  await Promise.all(promises);
  return cache;
};

// Extremely fast, synchronous local elevation sampling
export const fastSampleElevation = (
  lat: number,
  lng: number,
  cache: TileCache,
  zoom: number = 14
): number => {
  const tx = lon2tile(lng, zoom);
  const ty = lat2tile(lat, zoom);
  const key = `${zoom}/${tx}/${ty}`;

  const tile = cache[key];
  if (!tile) return 0; // Fallback if out of bounds

  const lonMin = tile2lon(tx, zoom);
  const lonMax = tile2lon(tx + 1, zoom);
  const latMax = tile2lat(ty, zoom); 
  const latMin = tile2lat(ty + 1, zoom); 

  let px = Math.floor(((lng - lonMin) / (lonMax - lonMin)) * 256);
  let py = Math.floor(((latMax - lat) / (latMax - latMin)) * 256);

  px = Math.max(0, Math.min(255, px));
  py = Math.max(0, Math.min(255, py));

  const idx = (py * 256 + px) * 4;
  const R = tile.data[idx];
  const G = tile.data[idx + 1];
  const B = tile.data[idx + 2];

  return (R * 256 + G + B / 256) - 32768;
};

// Auto-adjust Curve Radius and Spiral Length using Grid Search to minimize earthworks
export const optimizeCurveParameters = async (
  waypoints: any[],
  utmZone: string,
  maxGrade: number,
  cutSlope: number,
  fillSlope: number,
  designSpeed: number
): Promise<any[]> => {
  if (waypoints.length < 3) return waypoints;

  // 1. Cache tiles
  const pts: [number, number][] = waypoints.map(w => [w.lat, w.lng]);
  const cache = await cacheElevationTiles(pts, 14);

  // 2. Clone waypoints for optimization
  const optimizedWaypoints = [...waypoints];

  // Permutation ranges
  const radii = [200, 300, 400, 500, 600, 800];
  const spirals = [40, 50, 60, 80, 100];

  // 3. Optimize each PI independently (heuristic)
  for (let i = 1; i < optimizedWaypoints.length - 1; i++) {
    let bestScore = Infinity;
    let bestR = optimizedWaypoints[i].radius;
    let bestLs = optimizedWaypoints[i].spiralLength;

    for (const R of radii) {
      for (const Ls of spirals) {
        // Construct temporary waypoints with this variation
        const tempWaypoints = [...optimizedWaypoints];
        tempWaypoints[i] = { ...tempWaypoints[i], radius: R, spiralLength: Ls };

        try {
          // Generate horizontal alignment
          const segments = optimizeHorizontalAlignment(tempWaypoints, utmZone);
          
          // Flatten points
          const flattenedPoints: [number, number][] = [];
          segments.forEach(seg => flattenedPoints.push(...seg.points));

          // Fast Sample Elevations
          const rawElevations = flattenedPoints.map(pt => fastSampleElevation(pt[0], pt[1], cache, 14));

          // Calculate Vertical Profile & Earthworks
          const profile = optimizeVerticalProfile(flattenedPoints, rawElevations, maxGrade, cutSlope, fillSlope, designSpeed);
          
          // Calculate score (total cut/fill volume approximation)
          let totalEarthworks = 0;
          for (let j = 0; j < profile.cuts.length; j++) {
            totalEarthworks += profile.cuts[j] + profile.fills[j];
          }

          if (totalEarthworks < bestScore) {
            bestScore = totalEarthworks;
            bestR = R;
            bestLs = Ls;
          }
        } catch (e) {
          // Geometry bounds exceeded, skip this permutation
        }
      }
    }

    // Assign best found parameters
    optimizedWaypoints[i].radius = bestR;
    optimizedWaypoints[i].spiralLength = bestLs;
  }

  return optimizedWaypoints;
};


// Extract profile from AWS Terrarium Global Tiles
export const extractOnlineSurfaceProfile = async (
  points: [number, number][],
  zoom: number = 14
): Promise<number[]> => {
  if (points.length === 0) return [];
  
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not create canvas context for tile decoding.");

  // Group points by tile to minimize canvas drawing calls
  const elevations: number[] = new Array(points.length).fill(0);
  
  interface PointTask {
    index: number;
    lat: number;
    lng: number;
  }
  
  const tileTasks: { [tileKey: string]: { x: number, y: number, tasks: PointTask[] } } = {};
  
  points.forEach((pt, idx) => {
    const tx = lon2tile(pt[1], zoom);
    const ty = lat2tile(pt[0], zoom);
    const key = `${zoom}/${tx}/${ty}`;
    
    if (!tileTasks[key]) {
      tileTasks[key] = { x: tx, y: ty, tasks: [] };
    }
    tileTasks[key].tasks.push({ index: idx, lat: pt[0], lng: pt[1] });
  });

  for (const key in tileTasks) {
    const { x, y, tasks } = tileTasks[key];
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`;
    
    try {
      const img = await fetchImage(url);
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(img, 0, 0, 256, 256);
      const imgData = ctx.getImageData(0, 0, 256, 256).data;
      
      const lonMin = tile2lon(x, zoom);
      const lonMax = tile2lon(x + 1, zoom);
      const latMax = tile2lat(y, zoom); // y increases downwards, so latMax is the top edge
      const latMin = tile2lat(y + 1, zoom); // latMin is the bottom edge

      tasks.forEach(t => {
        // Calculate relative pixel position (0 to 255)
        let px = Math.floor(((t.lng - lonMin) / (lonMax - lonMin)) * 256);
        let py = Math.floor(((latMax - t.lat) / (latMax - latMin)) * 256);
        
        px = Math.max(0, Math.min(255, px));
        py = Math.max(0, Math.min(255, py));
        
        const idx = (py * 256 + px) * 4;
        const R = imgData[idx];
        const G = imgData[idx + 1];
        const B = imgData[idx + 2];
        
        const elevation = (R * 256 + G + B / 256) - 32768;
        elevations[t.index] = elevation;
      });
    } catch (err) {
      console.warn(`Failed to fetch/decode tile ${url}`, err);
    }
  }

  return elevations;
};

// Optimize Vertical Profile (Minimize Cut/Fill, adhere to max grade)
export const optimizeVerticalProfile = (
  horizontalPath: [number, number][],
  surfaceElevations: number[],
  maxGradePercent: number,
  cutSlopePercent: number,
  fillSlopePercent: number,
  designSpeedKmh: number = 100
): { elevations: number[], cuts: number[], fills: number[] } => {
  
  if (surfaceElevations.length < 2) return { elevations: surfaceElevations, cuts: [], fills: [] };

  // 1. Calculate cumulative distances (stations) along the path
  const stations = [0];
  for (let i = 1; i < horizontalPath.length; i++) {
    const p1 = turf.point([horizontalPath[i-1][1], horizontalPath[i-1][0]]);
    const p2 = turf.point([horizontalPath[i][1], horizontalPath[i][0]]);
    const dist = turf.distance(p1, p2, { units: 'meters' });
    stations.push(stations[i-1] + dist);
  }
  
  const totalLength = stations[stations.length - 1];

  // 2. Generate a simplified set of VPIs (Vertical Points of Intersection)
  // Create a VPI every 500m to represent a realistic design intent over rough terrain
  const vpiSpacing = 500;
  const vpis: { station: number, elevation: number }[] = [];
  
  for (let s = 0; s <= totalLength; s += vpiSpacing) {
    // Find closest station index
    let idx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < stations.length; i++) {
      const diff = Math.abs(stations[i] - s);
      if (diff < minDiff) {
        minDiff = diff;
        idx = i;
      }
    }
    vpis.push({ station: stations[idx], elevation: surfaceElevations[idx] });
  }
  
  // Ensure last point is included
  if (vpis[vpis.length-1].station < totalLength - 10) {
    vpis.push({ station: totalLength, elevation: surfaceElevations[surfaceElevations.length - 1] });
  }

  // 3. Calculate tangent grades between VPIs
  const maxGradeDec = maxGradePercent / 100;
  
  for (let i = 1; i < vpis.length; i++) {
    const ds = vpis[i].station - vpis[i-1].station;
    if (ds === 0) continue;
    let grade = (vpis[i].elevation - vpis[i-1].elevation) / ds;
    
    if (Math.abs(grade) > maxGradeDec) {
      grade = Math.sign(grade) * maxGradeDec;
      vpis[i].elevation = vpis[i-1].elevation + grade * ds;
    }
  }

  // 4. Fit parabolic curves at each internal VPI
  // AASHTO K-values (empirical approximation for stopping sight distance)
  const K_crest = Math.pow(designSpeedKmh, 2) / 100; 
  const K_sag = Math.pow(designSpeedKmh, 2) / 120;
  
  const curves: { startS: number, endS: number, startE: number, g1: number, g2: number, L: number }[] = [];
  
  for (let i = 1; i < vpis.length - 1; i++) {
    const vpi = vpis[i];
    const ds1 = vpi.station - vpis[i-1].station;
    const ds2 = vpis[i+1].station - vpi.station;
    
    const g1 = (vpi.elevation - vpis[i-1].elevation) / ds1;
    const g2 = (vpis[i+1].elevation - vpi.elevation) / ds2;
    const A = Math.abs(g2 - g1) * 100; // algebraic difference in %
    
    if (A > 0.5) { // Only curve if grade difference > 0.5%
      const isCrest = (g2 < g1);
      const K = isCrest ? K_crest : K_sag;
      let L = K * A;
      
      // Clamp length to fit between adjacent VPIs
      const maxL = Math.min(ds1, ds2) * 2 * 0.9;
      if (L > maxL) L = maxL;
      
      if (L > 10) { 
        curves.push({
          startS: vpi.station - L/2,
          endS: vpi.station + L/2,
          startE: vpi.elevation - g1 * (L/2),
          g1,
          g2,
          L
        });
      }
    }
  }

  // 5. Calculate finalized elevations along the whole alignment
  let optimizedElevations = new Array(surfaceElevations.length).fill(0);
  
  const getElevationAtStation = (s: number): number => {
    // Check if inside a curve
    for (const c of curves) {
      if (s >= c.startS && s <= c.endS) {
        // Parabola eq: Y = Y_pvc + g1*x + (g2-g1)*x^2 / (2L)
        const x = s - c.startS;
        return c.startE + c.g1 * x + ((c.g2 - c.g1) * x * x) / (2 * c.L);
      }
    }
    
    // Otherwise, on a tangent
    for (let i = 0; i < vpis.length - 1; i++) {
      if (s >= vpis[i].station && s <= vpis[i+1].station) {
        const ds = vpis[i+1].station - vpis[i].station;
        if (ds === 0) return vpis[i].elevation;
        const g = (vpis[i+1].elevation - vpis[i].elevation) / ds;
        return vpis[i].elevation + g * (s - vpis[i].station);
      }
    }
    
    return surfaceElevations[0];
  };

  for (let i = 0; i < stations.length; i++) {
    optimizedElevations[i] = getElevationAtStation(stations[i]);
  }

  // 6. Cut/Fill Calculation
  let cuts = new Array(surfaceElevations.length).fill(0);
  let fills = new Array(surfaceElevations.length).fill(0);
  
  const cutWeight = 1 / (cutSlopePercent || 100);
  const fillWeight = 1 / (fillSlopePercent || 100);

  for(let i = 0; i < surfaceElevations.length; i++) {
    const diff = optimizedElevations[i] - surfaceElevations[i];
    if (diff > 0) {
      fills[i] = diff * fillWeight;
    } else {
      cuts[i] = Math.abs(diff) * cutWeight;
    }
  }
  
  return { elevations: optimizedElevations, cuts, fills };
};

// Generate LandXML
export const generateLandXML = (
  alignmentName: string,
  segments: AlignmentSegment[], 
  elevations: number[],
  utmZone: string
) => {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  
  const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
  const utmProj = getUTMProjString(utmZone);
  
  // Helper to get Easting/Northing
  const project = (lat: number, lng: number): [number, number] => {
    const coords = proj4(wgs84, utmProj, [lng, lat]);
    return [coords[0], coords[1]]; // [Easting(X), Northing(Y)]
  };

  let coordGeomXml = '';
  let pviXml = '';
  
  let currentStation = 0;
  let pointIndex = 0;

  segments.forEach((seg) => {
    const pts = seg.points;
    if (pts.length < 2) {
      pointIndex += Math.max(1, pts.length - 1);
      return;
    }

    const startLL = pts[0];
    const endLL = pts[pts.length - 1];
    
    const startUTM = project(startLL[0], startLL[1]);
    const endUTM = project(endLL[0], endLL[1]);
    
    const startStr = `${startUTM[1].toFixed(3)} ${startUTM[0].toFixed(3)}`; // Y X
    const endStr = `${endUTM[1].toFixed(3)} ${endUTM[0].toFixed(3)}`; // Y X

    const dx = endUTM[0] - startUTM[0];
    const dy = endUTM[1] - startUTM[1];
    let chordLen = Math.sqrt(dx*dx + dy*dy);

    if (seg.type === 'Tangent') {
      coordGeomXml += `
        <Line>
          <Start>${startStr}</Start>
          <End>${endStr}</End>
        </Line>`;
      currentStation += chordLen;
    } 
    else if (seg.type === 'Curve') {
      const rot = seg.dir === 1 ? 'cw' : 'ccw';
      const R = seg.radius || 100;
      
      const mx = (startUTM[0] + endUTM[0]) / 2;
      const my = (startUTM[1] + endUTM[1]) / 2;
      
      const halfD = chordLen / 2;
      let h = 0;
      if (R > halfD) {
        h = Math.sqrt(R*R - halfD*halfD);
      }
      
      const nx = dx / chordLen;
      const ny = dy / chordLen;
      
      let cx = 0, cy = 0;
      if (seg.dir === 1) { // right/cw
        cx = mx + ny * h;
        cy = my - nx * h;
      } else { // left/ccw
        cx = mx - ny * h;
        cy = my + nx * h;
      }
      const centerStr = `${cy.toFixed(3)} ${cx.toFixed(3)}`;
      
      coordGeomXml += `
        <Curve rot="${rot}" radius="${R.toFixed(3)}" length="${(seg.length || chordLen).toFixed(3)}">
          <Start>${startStr}</Start>
          <Center>${centerStr}</Center>
          <End>${endStr}</End>
        </Curve>`;
      currentStation += (seg.length || chordLen);
    } 
    else if (seg.type === 'Spiral') {
      const rot = seg.dir === 1 ? 'cw' : 'ccw';
      const rStart = seg.radiusStart === 0 ? 'INF' : (seg.radiusStart || 'INF');
      const rEnd = seg.radiusEnd === 0 ? 'INF' : (seg.radiusEnd || 'INF');
      
      coordGeomXml += `
        <Spiral rot="${rot}" length="${(seg.length || chordLen).toFixed(3)}" radiusStart="${rStart}" radiusEnd="${rEnd}" spiType="clothoid">
          <Start>${startStr}</Start>
          <End>${endStr}</End>
        </Spiral>`;
      currentStation += (seg.length || chordLen);
    }
    
    // Add PVIs every 10 meters and at ends
    for (let i = 0; i < pts.length; i++) {
      if (pointIndex + i >= elevations.length) break;
      if (pointIndex + i === 0 || i === pts.length - 1 || i % 10 === 0) {
        const ptLL = pts[i];
        const ptUTM = project(ptLL[0], ptLL[1]);
        const dist = Math.sqrt(Math.pow(ptUTM[0] - startUTM[0], 2) + Math.pow(ptUTM[1] - startUTM[1], 2));
        
        let sta = currentStation - (seg.type === 'Tangent' ? chordLen : (seg.length || chordLen)) + dist;
        if (i===0) sta = currentStation - (seg.type === 'Tangent' ? chordLen : (seg.length || chordLen));
        if (i===pts.length-1) sta = currentStation;
        
        pviXml += `
          <PVI>${sta.toFixed(3)} ${(elevations[pointIndex + i] || 0).toFixed(3)}</PVI>`;
      }
    }
    
    pointIndex += Math.max(1, pts.length - 1);
  });
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" date="${date}" time="${time}" version="1.2">
  <Project name="PROME Route Optimization Project" />
  <Alignments>
    <Alignment name="${alignmentName}" length="${currentStation.toFixed(3)}" staStart="0.000">
      <CoordGeom>${coordGeomXml}
      </CoordGeom>
      <Profile>
        <ProfAlign name="${alignmentName}-Profile">${pviXml}
        </ProfAlign>
      </Profile>
    </Alignment>
  </Alignments>
</LandXML>`;
};

export interface CorridorFootprint {
  roadSurface: [number, number][]; // Polygon points for paved road
  cutPolygons: [number, number][][]; // Array of cut area polygons
  fillPolygons: [number, number][][]; // Array of fill area polygons
}

export const generateCorridorExtents = async (
  segments: AlignmentSegment[],
  elevations: number[], // optimized profile elevations
  leftLanes: number,
  rightLanes: number,
  laneWidth: number,
  cutSlopePercent: number,
  fillSlopePercent: number,
  surfaceProvider: string
): Promise<CorridorFootprint> => {
  const roadSurface: [number, number][] = [];
  const cutPolygons: [number, number][][] = [];
  const fillPolygons: [number, number][][] = [];

  // Flatten points for easier traversal
  const allPoints: [number, number][] = [];
  segments.forEach(seg => {
    // Avoid duplicating the endpoints where segments meet
    const pts = allPoints.length > 0 ? seg.points.slice(1) : seg.points;
    allPoints.push(...pts);
  });

  if (allPoints.length === 0 || elevations.length === 0) {
    return { roadSurface, cutPolygons, fillPolygons };
  }

  let cache: TileCache = {};
  if (surfaceProvider === 'AWS') {
    cache = await cacheElevationTiles(allPoints, 14);
  }

  const leftRoadWidth = leftLanes * laneWidth;
  const rightRoadWidth = rightLanes * laneWidth;
  
  const cutSlope = cutSlopePercent / 100;
  const fillSlope = fillSlopePercent / 100;
  
  const r_earth = 6378137;

  // Helper to add meters to lat/lng
  const addMetersToLatLng = (lat: number, lng: number, dxMeters: number, dyMeters: number): [number, number] => {
    const newLat = lat + (dyMeters / r_earth) * (180 / Math.PI);
    const newLng = lng + (dxMeters / (r_earth * Math.cos(Math.PI * lat / 180))) * (180 / Math.PI);
    return [newLat, newLng];
  };

  const leftRoadEdges: [number, number][] = [];
  const rightRoadEdges: [number, number][] = [];

  // State trackers for polygons
  let leftCurrentType: 'cut' | 'fill' | null = null;
  let leftDaylightSegment: [number, number][] = [];
  let leftRoadEdgeSegment: [number, number][] = [];

  let rightCurrentType: 'cut' | 'fill' | null = null;
  let rightDaylightSegment: [number, number][] = [];
  let rightRoadEdgeSegment: [number, number][] = [];

  const closePolygon = (side: 'left' | 'right', type: 'cut' | 'fill') => {
    const daylight = side === 'left' ? leftDaylightSegment : rightDaylightSegment;
    const roadEdge = side === 'left' ? leftRoadEdgeSegment : rightRoadEdgeSegment;
    
    if (daylight.length > 0) {
      const poly = [...daylight, ...[...roadEdge].reverse()];
      if (type === 'cut') cutPolygons.push(poly);
      else fillPolygons.push(poly);
    }
    
    if (side === 'left') {
      leftDaylightSegment = [];
      leftRoadEdgeSegment = [];
    } else {
      rightDaylightSegment = [];
      rightRoadEdgeSegment = [];
    }
  };

  for (let i = 0; i < allPoints.length; i++) {
    const pt = allPoints[i];
    const designZ = elevations[i] || 0;

    // Calculate heading (tangent angle)
    let heading = 0;
    
    // Look ahead for a distinct point to prevent Math.atan2(0, 0)
    let nextIdx = i + 1;
    while (nextIdx < allPoints.length && allPoints[nextIdx][0] === pt[0] && allPoints[nextIdx][1] === pt[1]) {
      nextIdx++;
    }

    if (nextIdx < allPoints.length) {
      const next = allPoints[nextIdx];
      heading = Math.atan2(next[0] - pt[0], next[1] - pt[1]); 
    } else {
      let prevIdx = i - 1;
      while (prevIdx >= 0 && allPoints[prevIdx][0] === pt[0] && allPoints[prevIdx][1] === pt[1]) {
        prevIdx--;
      }
      if (prevIdx >= 0) {
        const prev = allPoints[prevIdx];
        heading = Math.atan2(pt[0] - prev[0], pt[1] - prev[1]);
      }
    }

    // Normal angles
    const angleLeft = heading + Math.PI / 2;
    const angleRight = heading - Math.PI / 2;

    const dyLeft = Math.sin(angleLeft);
    const dxLeft = Math.cos(angleLeft);
    
    const dyRight = Math.sin(angleRight);
    const dxRight = Math.cos(angleRight);

    // Process a side
    const processSide = (
      side: 'left' | 'right', 
      dxDir: number, 
      dyDir: number, 
      roadWidth: number,
      currentType: 'cut' | 'fill' | null
    ) => {
      let currentDist = roadWidth;
      let [roadEdgeLat, roadEdgeLng] = addMetersToLatLng(pt[0], pt[1], dxDir * currentDist, dyDir * currentDist);
      
      let groundZ = designZ;
      if (surfaceProvider === 'AWS') {
        groundZ = fastSampleElevation(roadEdgeLat, roadEdgeLng, cache, 14);
      }
      
      const isCut = designZ < groundZ;
      const type: 'cut' | 'fill' = isCut ? 'cut' : 'fill';
      const slope = isCut ? cutSlope : fillSlope;

      if (currentType !== null && currentType !== type) {
        closePolygon(side, currentType);
      }
      
      let curLat = roadEdgeLat;
      let curLng = roadEdgeLng;

      const stepMeters = 1.0; 
      const maxDist = 200; 
      
      while (currentDist < maxDist) {
        currentDist += stepMeters;
        const [nextLat, nextLng] = addMetersToLatLng(pt[0], pt[1], dxDir * currentDist, dyDir * currentDist);
        curLat = nextLat;
        curLng = nextLng;
        
        if (surfaceProvider === 'AWS') {
          groundZ = fastSampleElevation(curLat, curLng, cache, 14);
        } else {
          groundZ = designZ; 
        }
        
        const slopeZ = designZ + (isCut ? (currentDist - roadWidth) * slope : -(currentDist - roadWidth) * slope);
        
        if (isCut && slopeZ >= groundZ) break;
        if (!isCut && slopeZ <= groundZ) break;
      }
      
      return { type, roadEdge: [roadEdgeLat, roadEdgeLng] as [number, number], daylight: [curLat, curLng] as [number, number] };
    };

    const leftResult = processSide('left', dxLeft, dyLeft, leftRoadWidth, leftCurrentType);
    leftCurrentType = leftResult.type;
    leftDaylightSegment.push(leftResult.daylight);
    leftRoadEdgeSegment.push(leftResult.roadEdge);
    leftRoadEdges.push(leftResult.roadEdge);

    const rightResult = processSide('right', dxRight, dyRight, rightRoadWidth, rightCurrentType);
    rightCurrentType = rightResult.type;
    rightDaylightSegment.push(rightResult.daylight);
    rightRoadEdgeSegment.push(rightResult.roadEdge);
    rightRoadEdges.push(rightResult.roadEdge);
    
    // Also, if it's the last point, close everything
    if (i === allPoints.length - 1) {
      if (leftCurrentType) closePolygon('left', leftCurrentType);
      if (rightCurrentType) closePolygon('right', rightCurrentType);
    }
  }

  // Construct final road surface polygon
  roadSurface.push(...leftRoadEdges);
  roadSurface.push(...[...rightRoadEdges].reverse());

  return { roadSurface, cutPolygons, fillPolygons };
};
