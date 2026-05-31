import { optimizeHorizontalAlignment } from '../src/utils/routeOptimizerHelpers';

const waypoints = [
  { id: '1', lat: 0, lng: 0, radius: 100, spiralLength: 40 },
  { id: '2', lat: 10, lng: 0, radius: 100, spiralLength: 40 }, // going north
  { id: '3', lat: 10, lng: 10, radius: 100, spiralLength: 40 }, // turning right (clockwise) to East
];

const segments = optimizeHorizontalAlignment(waypoints, '36N');

console.log("CW Segments:");
segments.forEach(seg => {
  console.log(seg.type, "Points count:", seg.points.length);
  if (seg.type === 'Curve') {
    console.log(seg.points);
  }
});
