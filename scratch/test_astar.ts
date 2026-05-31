import { generateOptimalCorridor } from '../src/utils/routeOptimizerHelpers';

async function test() {
  console.log("Starting test...");
  try {
    const start: [number, number] = [0.3476, 32.5825]; // Kampala
    const end: [number, number] = [0.3676, 32.6025];
    
    // We mock the extractOnlineSurfaceProfile inside the function if it hits the network,
    // but let's test it with MANUAL and a dummy file to bypass network, or just see if the math loop crashes.
    
    const result = await generateOptimalCorridor(start, end, 6, 100, 'OTHER', null);
    console.log("Result length:", result.length);
    console.log(result);
  } catch (err) {
    console.error("Crash:", err);
  }
}

test();
