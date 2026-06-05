/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GLTFQueueItem, GeoSettings } from '../types';
import { convertCoordinates } from '../utils/geoUtils';
import { Play, Eye, Maximize, Compass, Sun, Grid as GridIcon, Map, ZoomIn, ZoomOut, Info } from 'lucide-react';

interface ThreeCanvasProps {
  activeFile: GLTFQueueItem | null;
  sceneData: THREE.Group | null;
  loading: boolean;
  geoSettings: GeoSettings;
}

interface MapProvider {
  id: string;
  name: string;
  getTileUrl: (x: number, y: number, z: number) => string;
  attribution: string;
}

const MAP_PROVIDERS: MapProvider[] = [
  {
    id: 'google',
    name: 'Google Earth (Satellite)',
    getTileUrl: (x, y, z) => `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}`,
    attribution: '© Google Earth'
  },
  {
    id: 'bing',
    name: 'Bing Maps (Satellite)',
    getTileUrl: (x, y, z) => {
      let quadkey = '';
      for (let i = z; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((x & mask) !== 0) digit++;
        if ((y & mask) !== 0) digit += 2;
        quadkey += digit.toString();
      }
      return `https://ecn.t0.tiles.virtualearth.net/tiles/a${quadkey}.jpeg?g=587&mkt=en-US`;
    },
    attribution: '© Microsoft Bing'
  },
  {
    id: 'esri',
    name: 'Esri Satellite',
    getTileUrl: (x, y, z) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    attribution: '© Esri, Maxar'
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    getTileUrl: (x, y, z) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attribution: '© OpenStreetMap contributors'
  },
  {
    id: 'carto',
    name: 'Carlo Light (CartoDB)',
    getTileUrl: (x, y, z) => `https://basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}.png`,
    attribution: '© CARTO, OpenStreetMap'
  }
];

export default function ThreeCanvas({ activeFile, sceneData, loading, geoSettings }: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentModelRef = useRef<THREE.Group | null>(null);

  // Helper visibility toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showBox, setShowBox] = useState(true);
  const [viewMode] = useState<'perspective' | 'ortho_top'>('perspective');

  // Background map states
  const [showMap, setShowMap] = useState(false);
  const [providerId, setProviderId] = useState('esri'); // Default to Esri Satellite for realistic GIS imagery
  const [zoom, setZoom] = useState(16);

  // Convert current origin to WGS84
  const wgsCoords = useMemo(() => {
    try {
      const res = convertCoordinates(
        geoSettings.originX,
        geoSettings.originY,
        geoSettings.coordinateSystem,
        'WGS84',
        geoSettings
      );
      if (
        !isNaN(res.x) &&
        !isNaN(res.y) &&
        res.x >= -180 &&
        res.x <= 180 &&
        res.y >= -90 &&
        res.y <= 90
      ) {
        return { lon: res.x, lat: res.y };
      }
    } catch (e) {
      console.error("Error converting coordinates for map background", e);
    }
    return { lon: 32.5825, lat: 0.3476 }; // Default Kampala fallback
  }, [geoSettings]);

  const TILE_SIZE = 256;

  // Calculate grid tile positions and offsets
  const mapGridData = useMemo(() => {
    const lon = wgsCoords.lon;
    const lat = wgsCoords.lat;

    const fracX = ((lon + 180) / 360) * Math.pow(2, zoom);
    
    // safe mercator latitude calculation
    let latRad = (lat * Math.PI) / 180;
    if (latRad > 1.48) latRad = 1.48; // Limit safe max latitude
    if (latRad < -1.48) latRad = -1.48;
    
    const fracY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);

    const tileX = Math.floor(fracX);
    const tileY = Math.floor(fracY);

    const offsetX = (fracX - tileX) * TILE_SIZE;
    const offsetY = (fracY - tileY) * TILE_SIZE;

    const centerPixelX = TILE_SIZE + offsetX;
    const centerPixelY = TILE_SIZE + offsetY;

    const tiles = [];
    const currentProvider = MAP_PROVIDERS.find((p) => p.id === providerId) || MAP_PROVIDERS[0];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = tileX + col - 1;
        const y = tileY + row - 1;
        
        // Slippy map wrapping & limits
        const maxTiles = Math.pow(2, zoom);
        const wrappedX = (x + maxTiles) % maxTiles;
        const boundedY = Math.max(0, Math.min(maxTiles - 1, y));
        
        const url = currentProvider.getTileUrl(wrappedX, boundedY, zoom);
        tiles.push({
          x: wrappedX,
          y: boundedY,
          row,
          col,
          url,
        });
      }
    }

    return {
      tiles,
      centerPixelX,
      centerPixelY,
    };
  }, [wgsCoords, zoom, providerId]);

  // Helpers internal refs for updates
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);

  // Map plane mesh, texture and canvas refs
  const mapMeshRef = useRef<THREE.Mesh | null>(null);
  const mapTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize Scene, Camera, Renderer, Controls
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Create Scene with clean corporate architectural background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Light slate canvas
    sceneRef.current = scene;

    // 2. Create Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 8);
    cameraRef.current = camera;

    // 3. Create WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    
    // Core color management configurations
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // Bright, clear representation matching GIS tools like Global Mapper
    
    // Clear previous children
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(10, 20, 15);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight2.position.set(-10, -5, -10);
    scene.add(dirLight2);

    // 5. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controlsRef.current = controls;

    // 6. Grid & Axes Setup
    const gridHelper = new THREE.GridHelper(20, 20, 0xf97316, 0xe2e8f0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (rendererRef.current) rendererRef.current.dispose();

      // Clean up background 3D map assets
      if (mapMeshRef.current) {
        if (mapMeshRef.current.geometry) mapMeshRef.current.geometry.dispose();
        if (Array.isArray(mapMeshRef.current.material)) {
          mapMeshRef.current.material.forEach((m) => m.dispose());
        } else if (mapMeshRef.current.material) {
          mapMeshRef.current.material.dispose();
        }
        mapMeshRef.current = null;
      }
      if (mapTextureRef.current) {
        mapTextureRef.current.dispose();
        mapTextureRef.current = null;
      }
      mapCanvasRef.current = null;
    };
  }, []);

  // Update helpers visibility
  useEffect(() => {
    if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (axesHelperRef.current) axesHelperRef.current.visible = showAxes;
  }, [showAxes]);

  useEffect(() => {
    if (boxHelperRef.current) boxHelperRef.current.visible = showBox && currentModelRef.current !== null;
  }, [showBox]);

  // Physical 3D map ground plane addition and slippy tile management
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Handle scene background based on map display
    if (showMap) {
      scene.background = new THREE.Color(0x0b1329); // Space slate dark background
    } else {
      scene.background = new THREE.Color(0xf8fafc); // Corporate light slate background
    }

    // If map is toggled off, remove the map plane mesh safely
    if (!showMap) {
      if (mapMeshRef.current) {
        scene.remove(mapMeshRef.current);
        mapMeshRef.current.geometry.dispose();
        if (Array.isArray(mapMeshRef.current.material)) {
          mapMeshRef.current.material.forEach((m) => m.dispose());
        } else {
          mapMeshRef.current.material.dispose();
        }
        mapMeshRef.current = null;
      }
      return;
    }

    // 1. Compute ground Y elevation (exactly 0.05m below the grid where the files are loaded)
    let groundY = -0.05;
    if (sceneData) {
      const box = new THREE.Box3().setFromObject(sceneData);
      const size = new THREE.Vector3();
      box.getSize(size);
      groundY = -size.y / 2 - 0.05; // Position exactly 0.05m below the grid
    }

    // 2. Compute meters-per-pixel resolution at the origin latitude
    const C = 40075016.686;
    const latRad = (wgsCoords.lat * Math.PI) / 180;
    const resolution = (C * Math.cos(latRad)) / (256 * Math.pow(2, zoom));
    
    // const tileMeters = TILE_SIZE * resolution;
    const totalWidthMeters = TILE_SIZE * 3 * resolution;
    const totalHeightMeters = TILE_SIZE * 3 * resolution;

    // 3. Compute relative offsets of origin
    const lon = wgsCoords.lon;
    const lat = wgsCoords.lat;

    let customOffsetX = 0;
    let customOffsetZ = 0;

    if ((geoSettings.alignmentAnchor === 'ORIGIN' || geoSettings.alignmentAnchor === 'CUSTOM') && activeFile?.modelCenter) {
      let gltfOffsetX = activeFile.modelCenter.x;
      let gltfOffsetZ = activeFile.modelCenter.z;
      
      if (geoSettings.alignmentAnchor === 'CUSTOM') {
        gltfOffsetX = activeFile.modelCenter.x - (geoSettings.internalOriginX || 0);
        gltfOffsetZ = activeFile.modelCenter.z - (geoSettings.internalOriginZ || 0);
      }
      
      customOffsetX = gltfOffsetX * (geoSettings.scaleFactor || 1.0);
      customOffsetZ = gltfOffsetZ * (geoSettings.scaleFactor || 1.0);
    }

    const fracX = ((lon + 180) / 360) * Math.pow(2, zoom);
    
    let latRadSafe = latRad;
    if (latRadSafe > 1.48) latRadSafe = 1.48;
    if (latRadSafe < -1.48) latRadSafe = -1.48;
    const fracY = ((1 - Math.log(Math.tan(latRadSafe) + 1 / Math.cos(latRadSafe)) / Math.PI) / 2) * Math.pow(2, zoom);

    const tileX = Math.floor(fracX);
    const tileY = Math.floor(fracY);

    // Calculate exactly where target coordinate maps in our 3x3 pixel grid (768 x 768)
    const centerPixelX = (fracX - tileX + 1) * TILE_SIZE;
    const centerPixelY = (fracY - tileY + 1) * TILE_SIZE;

    // Translate pixel offsets into real physical meter offsets from center of our plane mesh
    const meshX = totalWidthMeters / 2 - centerPixelX * resolution;
    const meshZ = totalHeightMeters / 2 - centerPixelY * resolution;

    // 4. Set up Canvas & WebGL Texture
    if (!mapCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE * 3;
      canvas.height = TILE_SIZE * 3;
      mapCanvasRef.current = canvas;
    }

    const canvas = mapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Paint an elegant hi-tech geographic radar scan grid as fallback while loading slippy map tiles
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, TILE_SIZE * 3, TILE_SIZE * 3);

      // Radar Concentric Circles
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)'; // Amber/Orange
      ctx.lineWidth = 1.5;
      for (let r = 80; r <= 320; r += 80) {
        ctx.beginPath();
        ctx.arc(centerPixelX, centerPixelY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main Crosshair
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerPixelX - 50, centerPixelY);
      ctx.lineTo(centerPixelX + 50, centerPixelY);
      ctx.moveTo(centerPixelX, centerPixelY - 50);
      ctx.lineTo(centerPixelX, centerPixelY + 50);
      ctx.stroke();

      // Dynamic "Loading Tiles..." notification written as terminal scanning text
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('GIS PREVIEW MAP GRID ACTIVE', 20, 35);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`LAT: ${lat.toFixed(5)}° / LON: ${lon.toFixed(5)}°`, 20, 55);
      ctx.fillText(`ZOOM: ${zoom} / RES: ${resolution.toFixed(3)}m/px`, 20, 70);
    }

    if (!mapTextureRef.current) {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      mapTextureRef.current = texture;
    }
    const texture = mapTextureRef.current;
    texture.needsUpdate = true;

    // 5. Update or Create 3D Ground Mesh
    if (mapMeshRef.current) {
      const mesh = mapMeshRef.current;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(totalWidthMeters, totalHeightMeters);
      mesh.position.set(meshX - customOffsetX, groundY, meshZ - customOffsetZ);
    } else {
      const geom = new THREE.PlaneGeometry(totalWidthMeters, totalHeightMeters);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.90
      });
      const mesh = new THREE.Mesh(geom, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(meshX - customOffsetX, groundY, meshZ - customOffsetZ);
      scene.add(mesh);
      mapMeshRef.current = mesh;
    }

    // 6. Draw and blend slippy tiles asynchronously
    let activeUrls = new Set<string>();
    mapGridData.tiles.forEach((tile) => {
      activeUrls.add(tile.url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Only paint if the viewport state has not changed since trigger
        if (showMap && activeUrls.has(tile.url)) {
          if (ctx) {
            // Draw tile
            ctx.drawImage(img, tile.col * TILE_SIZE, tile.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Re-render coordinate anchors on-top to maintain snapping HUD readability
            const anchorPixelX = centerPixelX - (customOffsetX / resolution);
            const anchorPixelY = centerPixelY + (customOffsetZ / resolution);

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)'; // High-visibility red anchor
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(anchorPixelX - 20, anchorPixelY);
            ctx.lineTo(anchorPixelX + 20, anchorPixelY);
            ctx.moveTo(anchorPixelX, anchorPixelY - 20);
            ctx.lineTo(anchorPixelX, anchorPixelY + 20);
            ctx.stroke();

            // Inner circle highlight at target location
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)'; // Brilliant Emerald Green
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(anchorPixelX, anchorPixelY, 8, 0, Math.PI * 2);
            ctx.stroke();

            // Frame bounds borders
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(tile.col * TILE_SIZE, tile.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Notify texture to re-upload to GPU
            texture.needsUpdate = true;
          }
        }
      };
      img.src = tile.url;
    });

  }, [showMap, sceneData, providerId, zoom, wgsCoords, mapGridData, geoSettings.alignmentAnchor, geoSettings.scaleFactor]);

  // Handle Scene / Model Loading & Re-centering
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous model
    if (currentModelRef.current) {
      scene.remove(currentModelRef.current);
      if (boxHelperRef.current) {
        scene.remove(boxHelperRef.current);
        boxHelperRef.current = null;
      }
      currentModelRef.current = null;
    }

    if (!sceneData) return;

    currentModelRef.current = sceneData;
    scene.add(sceneData);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(sceneData);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    sceneData.position.sub(center);
    
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = sphere.radius;

    // Update Box Helper
    const boxHelper = new THREE.BoxHelper(sceneData, 0xf97316); // Orange bounding box
    boxHelper.visible = showBox;
    scene.add(boxHelper);
    boxHelperRef.current = boxHelper;

    // Update Grid size based on model size
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      const maxSize = Math.max(size.x, size.z) * 2 || 10;
      const gridHelper = new THREE.GridHelper(maxSize, 20, 0x0b2240, 0xe2e8f0);
      gridHelper.position.y = -size.y / 2;
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
      gridHelperRef.current.visible = showGrid;
    }

    resetCamera(radius * 2);

  }, [sceneData]);

  const resetCamera = (targetDistance?: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const dist = targetDistance || 10;
    
    if (viewMode === 'ortho_top') {
      camera.position.set(0, dist, 0);
      controls.target.set(0, 0, 0);
    } else {
      camera.position.set(dist * 0.7, dist * 0.7, dist);
      controls.target.set(0, 0, 0);
    }
    
    controls.update();
  };

  const setTopView = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !currentModelRef.current) return;

    const box = new THREE.Box3().setFromObject(currentModelRef.current);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const dist = sphere.radius * 2;

    camera.position.set(0, dist, 0.0001);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const setPerspectiveView = () => {
    if (!currentModelRef.current) {
      resetCamera(8);
      return;
    }
    const box = new THREE.Box3().setFromObject(currentModelRef.current);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    resetCamera(sphere.radius * 2);
  };

  return (
    <div className="relative w-full h-full bg-slate-50 rounded overflow-hidden border border-gray-200 flex flex-col justify-between group shadow-sm" id="webgl-viewport-card">
      {/* Top Controller Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto bg-[#0B2240]/90 backdrop-blur-md px-3 py-1.5 rounded text-xs text-white font-medium select-none shadow-md border border-blue-900/45">
          <Eye className="w-3.5 h-3.5 text-orange-400" />
          <span>Interactive 3D Preview Engine</span>
          {activeFile && (
            <span className="text-gray-300 font-mono border-l border-blue-800/60 pl-2 ml-1">
              {activeFile.name.length > 25 ? activeFile.name.slice(0, 22) + '...' : activeFile.name}
            </span>
          )}
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {/* Layer controls */}
          <div className="flex bg-[#0B2240]/90 backdrop-blur-md p-1 rounded border border-blue-900/45 shadow-md">
            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Grid (G)"
              className={`p-1.5 rounded transition cursor-pointer ${showGrid ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              <GridIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAxes(!showAxes)}
              title="Toggle Axis Helper (A)"
              className={`p-1.5 rounded transition cursor-pointer ${showAxes ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBox(!showBox)}
              title="Toggle Selection Box (B)"
              className={`p-1.5 rounded transition cursor-pointer ${showBox ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              <Maximize className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMap(!showMap)}
              title="Toggle Background Map (M)"
              className={`p-1.5 rounded transition cursor-pointer ${showMap ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Cameras */}
          <div className="flex bg-[#0B2240]/90 backdrop-blur-md p-1 rounded border border-blue-900/45 shadow-md gap-1">
            <button
              onClick={setPerspectiveView}
              className="px-2.5 py-1 text-xs rounded transition text-gray-300 hover:text-white cursor-pointer font-bold"
            >
              Perspective
            </button>
            <button
              onClick={setTopView}
              className="px-2.5 py-1 text-xs rounded transition text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
            >
              <Sun className="w-3 h-3 text-orange-400" /> Top Ortho
            </button>
          </div>
        </div>
      </div>

      {/* Map Provider Selector Overlay */}
      {showMap && (
        <div className="absolute top-15 right-3 z-10 flex flex-col gap-2 bg-[#0B2240]/95 backdrop-blur-md p-3 rounded-lg border border-emerald-950/45 shadow-lg w-64 select-none animate-fadeIn transition-all pointer-events-auto">
          <div className="flex items-center justify-between border-b border-blue-800/40 pb-1.5 mb-1.5">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5" /> Background Map Setup
            </span>
            <span className="text-[10px] font-mono text-gray-300">
              {wgsCoords.lat.toFixed(5)}°, {wgsCoords.lon.toFixed(5)}°
            </span>
          </div>

          {/* Provider Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Image Provider</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="bg-blue-950/70 border border-blue-800/50 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {MAP_PROVIDERS.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Selector */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Zoom Level</label>
              <span className="text-xs font-mono font-bold text-orange-400">{zoom}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(10, zoom - 1))}
                disabled={zoom <= 10}
                className="bg-blue-900/60 text-white rounded p-1 hover:bg-blue-800/60 disabled:opacity-40 transition cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="10"
                max="21"
                step="1"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-blue-950 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setZoom(Math.min(21, zoom + 1))}
                disabled={zoom >= 21}
                className="bg-blue-900/60 text-white rounded p-1 hover:bg-blue-800/60 disabled:opacity-40 transition cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Source Attribution Info */}
          <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 font-medium">
            <Info className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
            <span className="truncate">Source: {MAP_PROVIDERS.find(p => p.id === providerId)?.attribution}</span>
          </div>
        </div>
      )}

      {/* Primary Canvas Container - kept completely empty of React children */}
      <div 
         ref={containerRef} 
         className="w-full h-full min-h-[400px] absolute inset-0 z-1" 
         style={{ cursor: 'grab' }}
      />

      {/* Loading overlay - rendered as a sibling absolute overlay to protect React's virtual DOM */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0B2240]/80 backdrop-blur-xs gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-900/40 border-t-orange-500 animate-spin"></div>
            <Play className="w-5 h-5 absolute text-orange-400" />
          </div>
          <p className="text-sm font-semibold text-white">Loading 3D mesh buffers...</p>
        </div>
      )}

      {/* No active file placeholder - rendered as a sibling absolute overlay to protect React's virtual DOM */}
      {!activeFile && !loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-8 text-center">
          <div className="w-16 h-16 rounded bg-white flex items-center justify-center border border-gray-200 mb-4 shadow-xs">
            <Compass className="w-6 h-6 text-orange-500" />
          </div>
          <h3 className="text-[#0B2240] font-bold text-xs uppercase tracking-wider mb-1">Interactive 3D Workspace</h3>
          <p className="max-w-xs text-xs">
            Upload GLTF or GLB files, then select one from the batch queue list to load 3D structures.
          </p>
        </div>
      )}

      {/* Model dimensions bar at the bottom */}
      {activeFile && activeFile.dimensions && (
        <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-between gap-4">
          <div className="pointer-events-auto bg-[#0B2240]/95 backdrop-blur-md px-3 py-2 rounded border border-blue-900/35 flex flex-nowrap items-center text-xs text-white gap-4 shadow-md divide-x divide-blue-800/40 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300 uppercase font-sans text-[10px] font-bold tracking-wide">Width (X)</span>
              <span className="text-orange-400 font-bold">{activeFile.dimensions.width.toFixed(2)}m</span>
            </div>
            <div className="flex items-center gap-1.5 pl-4">
              <span className="text-gray-300 uppercase font-sans text-[10px] font-bold tracking-wide">Length (Z)</span>
              <span className="text-orange-400 font-bold">{activeFile.dimensions.depth.toFixed(2)}m</span>
            </div>
            <div className="flex items-center gap-1.5 pl-4">
              <span className="text-gray-300 uppercase font-sans text-[10px] font-bold tracking-wide">Height (Y)</span>
              <span className="text-amber-400 font-bold">{activeFile.dimensions.height.toFixed(2)}m</span>
            </div>
          </div>

          <div className="pointer-events-auto bg-[#0B2240]/95 backdrop-blur-md px-3 py-2 rounded border border-blue-900/35 flex items-center text-gray-300 font-mono text-[10px] shadow-sm">
            {activeFile.trianglesCount ? (
              <span>▲ {activeFile.trianglesCount.toLocaleString()} Triangles</span>
            ) : (
              <span>Mesh loaded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
