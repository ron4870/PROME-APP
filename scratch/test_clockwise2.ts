import * as turf from '@turf/turf';

function toLL(x: number, y: number): [number, number] {
  return [y, x]; // Mock, typically you inverse project here
}

function getSpiralPoint(l: number, R: number, Ls: number) {
  const theta = (l * l) / (2 * R * Ls);
  const x = l * (1 - (theta * theta) / 10);
  const y = l * (theta / 3 - Math.pow(theta, 3) / 42);
  return { x, y };
}

const localPIs = [
  { x: 0, y: 0 },
  { x: 0, y: 1000, radius: 100, spiralLength: 40 }, // go north
  { x: 1000, y: 1000, radius: 100, spiralLength: 40 }, // turn east
];

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
  
  // Shift (p) and throw (k)
  const p = (Ls * Ls) / (24 * R);
  const k = Ls / 2;
  const T = (R + p) * Math.tan(deltaAbs / 2) + k;
  
  const tsX = pCur.x - Math.cos(theta1) * T;
  const tsY = pCur.y - Math.sin(theta1) * T;
  
  const stX = pCur.x + Math.cos(theta2) * T;
  const stY = pCur.y + Math.sin(theta2) * T;

  const scLocal = getSpiralPoint(Ls, R, Ls);
  const scX = tsX + scLocal.x * Math.cos(theta1) - scLocal.y * Math.sin(theta1) * Math.sign(delta);
  const scY = tsY + scLocal.x * Math.sin(theta1) + scLocal.y * Math.cos(theta1) * Math.sign(delta);

  const csLocal = getSpiralPoint(Ls, R, Ls);
  const csX = stX - csLocal.x * Math.cos(theta2) - csLocal.y * Math.sin(theta2) * Math.sign(delta);
  const csY = stY - csLocal.x * Math.sin(theta2) + csLocal.y * Math.cos(theta2) * Math.sign(delta);

  // Circular Curve
  const Lc = R * (deltaAbs - Ls/R);
  if (Lc > 0) {
    const curvePts: [number, number][] = [];
    const thetaS = (Ls / (2 * R)) * Math.sign(delta);
    const angleAtSC = theta1 + thetaS;
    
    // FIX applied here
    const cx = scX - R * Math.sin(angleAtSC) * Math.sign(delta);
    const cy = scY + R * Math.cos(angleAtSC) * Math.sign(delta);
    
    const startAngle = Math.atan2(scY - cy, scX - cx);
    const endAngle = Math.atan2(csY - cy, csX - cx);
    
    let sweep = endAngle - startAngle;
    if (Math.sign(delta) > 0 && sweep < 0) sweep += 2*Math.PI;
    if (Math.sign(delta) < 0 && sweep > 0) sweep -= 2*Math.PI;

    for (let j = 0; j <= 10; j++) {
      const angle = startAngle + sweep * (j / 10);
      curvePts.push([cx + R * Math.cos(angle), cy + R * Math.sin(angle)]);
    }
    console.log("Curve Points:", curvePts);
  }
}
