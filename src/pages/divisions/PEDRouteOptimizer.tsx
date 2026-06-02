import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Settings, Map as MapIcon, Download, Trash2, X } from 'lucide-react';
import { createTileLayerComponent } from '@react-leaflet/core';
import { optimizeHorizontalAlignment, extractSurfaceProfile, optimizeVerticalProfile, generateLandXML, extractOnlineSurfaceProfile, generateOptimalCorridor, optimizeCurveParameters, generateCorridorExtents } from '../../utils/routeOptimizerHelpers';
import type { PI, AlignmentSegment, CorridorFootprint } from '../../utils/routeOptimizerHelpers';
import { Polygon } from 'react-leaflet';

// Fix Leaflet default icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Generate UTM Zones
const UTM_ZONES = Array.from({ length: 60 }, (_, i) => `${i + 1}N`).concat(
  Array.from({ length: 60 }, (_, i) => `${i + 1}S`)
);

// Providers
const MAP_PROVIDERS = {
  OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ESRI: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  TOPO: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  GOOGLE: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
};

// Custom Bing Layer class for QuadKeys
const BingLayerClass = L.TileLayer.extend({
  getTileUrl: function (coords: any) {
    let quadkey = '';
    const zoom = this._getZoomForUrl();
    for (let i = zoom; i > 0; i--) {
      let digit = 0;
      const mask = 1 << (i - 1);
      if ((coords.x & mask) !== 0) digit += 1;
      if ((coords.y & mask) !== 0) digit += 2;
      quadkey += digit.toString();
    }
    return `https://ecn.t${Math.floor(Math.random() * 4)}.tiles.virtualearth.net/tiles/a${quadkey}.jpeg?g=1`;
  }
});

const BingTileLayer = createTileLayerComponent(
  function createBingLayer(props: any, context: any) {
    return {
      instance: new (BingLayerClass as any)('', { ...props, attribution: '© Microsoft Bing' }),
      context,
    };
  },
  function updateBingLayer() {
    // update logic not strictly necessary for basic tile display
  }
);

// Custom Terrain RGB Layer class for visualizing AWS Terrarium
const TerrainRGBLayerClass = L.GridLayer.extend({
  createTile: function (coords: any, done: any) {
    const tile = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    
    const ctx = tile.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      if (!ctx) { done(null, tile); return; }
      ctx.drawImage(img, 0, 0, size.x, size.y);
      const imgData = ctx.getImageData(0, 0, size.x, size.y);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const R = data[i];
        const G = data[i + 1];
        const B = data[i + 2];
        const elevation = (R * 256 + G + B / 256) - 32768;
        
        if (elevation <= 0) {
          data[i] = 10; data[i+1] = 50; data[i+2] = 150; 
        } else if (elevation < 1000) {
          data[i] = 130 - (elevation/1000)*50; data[i+1] = 180 - (elevation/1000)*50; data[i+2] = 90; // Greenish
        } else if (elevation < 3000) {
          data[i] = 180 + ((elevation-1000)/2000)*50; data[i+1] = 130 + ((elevation-1000)/2000)*50; data[i+2] = 90; // Brownish
        } else {
          data[i] = 250; data[i+1] = 250; data[i+2] = 250; // White
        }
        data[i+3] = 150; // Opacity 
      }
      ctx.putImageData(imgData, 0, 0);
      done(null, tile);
    };
    img.onerror = function(err) {
      done(err, tile);
    };
    img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${coords.z}/${coords.x}/${coords.y}.png`;
    return tile;
  }
});

const TerrainRGBLayer = createTileLayerComponent(
  function createTerrainLayer(props: any, context: any) {
    return {
      instance: new (TerrainRGBLayerClass as any)(props),
      context,
    };
  },
  function updateTerrainLayer() {}
);

export default function PEDRouteOptimizer() {
  const [utmZone, setUtmZone] = useState('36N');
  const [mapProvider, setMapProvider] = useState('ESRI');
  const [roadType, setRoadType] = useState('Arterial');
  const [designSpeed, setDesignSpeed] = useState(100);
  const [leftLanes, setLeftLanes] = useState(1);
  const [rightLanes, setRightLanes] = useState(1);
  const [laneWidth, setLaneWidth] = useState(3.5);
  const [maxGrade, setMaxGrade] = useState(6);
  const [cutSlope, setCutSlope] = useState(50); // 1:2 default
  const [fillSlope, setFillSlope] = useState(33.3); // 1:3 default
  
  const [waypoints, setWaypoints] = useState<PI[]>([]);
  const [optimizedSegments, setOptimizedSegments] = useState<AlignmentSegment[]>([]);
  const [optimizedProfile, setOptimizedProfile] = useState<any>(null);
  const [corridorFootprint, setCorridorFootprint] = useState<CorridorFootprint | null>(null);
  
  const [surfaceProvider, setSurfaceProvider] = useState('AWS');
  const [showSurface, setShowSurface] = useState(false);
  const [surfaceFile, setSurfaceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPI, setEditingPI] = useState<string | null>(null);

  // Auto Mode States
  const [autoMode, setAutoMode] = useState(false);
  const [autoStartPoint, setAutoStartPoint] = useState<[number, number] | null>(null);
  const [autoEndPoint, setAutoEndPoint] = useState<[number, number] | null>(null);

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (autoMode) {
      if (!autoStartPoint) {
        setAutoStartPoint([e.latlng.lat, e.latlng.lng]);
      } else if (!autoEndPoint) {
        setAutoEndPoint([e.latlng.lat, e.latlng.lng]);
      } else {
        setAutoStartPoint([e.latlng.lat, e.latlng.lng]);
        setAutoEndPoint(null);
      }
      return;
    }

    const newPI: PI = {
      id: `pi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      radius: designSpeed >= 100 ? 400 : 200,
      spiralLength: designSpeed >= 100 ? 60 : 40,
    };
    setWaypoints(prev => [...prev, newPI]);
  };

  const MapEvents = () => {
    useMapEvents({
      click: handleMapClick,
    });
    return null;
  };

  // Auto-update horizontal alignment when waypoints change
  useEffect(() => {
    if (waypoints.length >= 2) {
      try {
        const segments = optimizeHorizontalAlignment(waypoints, utmZone);
        setOptimizedSegments(segments);
      } catch (e) {
        console.error("Auto-optimize error", e);
      }
    } else {
      setOptimizedSegments([]);
      setOptimizedProfile(null);
    }
  }, [waypoints, utmZone]);

  // Debounced Auto-update of Vertical Profile
  useEffect(() => {
    if (optimizedSegments.length < 2) return;

    // We use a 1 second debounce to prevent rapid fire AWS Terrarium extraction while dragging markers
    const timeoutId = setTimeout(async () => {
      try {
        const flattenedPoints: [number, number][] = [];
        optimizedSegments.forEach(seg => {
          const pts = flattenedPoints.length > 0 ? seg.points.slice(1) : seg.points;
          flattenedPoints.push(...pts);
        });
        
        let rawElevations: number[] = [];
        if (surfaceProvider === 'AWS') {
          rawElevations = await extractOnlineSurfaceProfile(flattenedPoints, 14);
        } else if (surfaceProvider === 'MANUAL' && surfaceFile) {
          rawElevations = await extractSurfaceProfile(surfaceFile, flattenedPoints);
        } else {
          rawElevations = flattenedPoints.map(() => 0);
        }

        const profile = optimizeVerticalProfile(flattenedPoints, rawElevations, maxGrade, cutSlope, fillSlope, designSpeed);
        setOptimizedProfile(profile);
      } catch (e) {
        console.error("Vertical auto-optimize error", e);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [optimizedSegments, surfaceProvider, surfaceFile, maxGrade, cutSlope, fillSlope, designSpeed]);

  const handleOptimize = async () => {
    if (waypoints.length < 3) {
      alert("Please add at least 3 waypoints on the map.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // 1. Horizontal Optimization is already auto-run, just ensure we have latest segments
      const segments = optimizeHorizontalAlignment(waypoints, utmZone);
      setOptimizedSegments(segments);
      
      // Flatten points for surface profiling
      const flattenedPoints: [number, number][] = [];
      segments.forEach(seg => {
        const pts = flattenedPoints.length > 0 ? seg.points.slice(1) : seg.points;
        flattenedPoints.push(...pts);
      });
      
      let rawElevations: number[] = [];

      // 2. Vertical Optimization
      if (surfaceProvider === 'AWS') {
        rawElevations = await extractOnlineSurfaceProfile(flattenedPoints, 14);
      } else if (surfaceProvider === 'MANUAL' && surfaceFile) {
        rawElevations = await extractSurfaceProfile(surfaceFile, flattenedPoints);
      } else {
        alert("Warning: No surface (GeoTIFF) uploaded. Vertical profile is flat (Elevation = 0).");
        rawElevations = flattenedPoints.map(() => 0);
      }

      const profile = optimizeVerticalProfile(flattenedPoints, rawElevations, maxGrade, cutSlope, fillSlope, designSpeed);
      setOptimizedProfile(profile);

      // 3. Generate Corridor Footprint
      const footprint = await generateCorridorExtents(segments, profile.elevations, leftLanes, rightLanes, laneWidth, cutSlope, fillSlope, surfaceProvider);
      setCorridorFootprint(footprint);
      
    } catch (err) {
      console.error(err);
      alert("Error optimizing route. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const runAutoGenerate = async () => {
    if (!autoStartPoint || !autoEndPoint) {
      alert("Please select both a Start and End point on the map first.");
      return;
    }
    setIsProcessing(true);
    try {
      const generatedPIs = await generateOptimalCorridor(
        autoStartPoint, 
        autoEndPoint, 
        maxGrade, 
        designSpeed, 
        surfaceProvider, 
        surfaceFile
      );
      
      if (generatedPIs.length < 2) {
        alert("Failed to find a viable path under max grade constraints.");
      } else {
        // Optimize radius and spiral length automatically!
        const fullyOptimizedPIs = await optimizeCurveParameters(
          generatedPIs, 
          utmZone, 
          maxGrade, 
          cutSlope, 
          fillSlope, 
          designSpeed
        );

        setWaypoints(fullyOptimizedPIs);
        setAutoMode(false); // turn off auto mode after successful gen
        setAutoStartPoint(null);
        setAutoEndPoint(null);
      }
    } catch (err) {
      console.error("Auto Gen Error", err);
      alert("Error generating auto route. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (optimizedSegments.length === 0 || !optimizedProfile) {
      alert("Please generate the full geometry including surface profile first.");
      return;
    }
    const xml = generateLandXML(`PROME_Route_${roadType}`, optimizedSegments, optimizedProfile.elevations, utmZone);
    
    const blob = new Blob([xml], { type: 'application/xml' });
    
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `Optimized_Alignment_${Date.now()}.xml`,
          types: [{
            description: 'LandXML File',
            accept: {'application/xml': ['.xml']},
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback for browsers that do not support the File System Access API
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Optimized_Alignment_${Date.now()}.xml`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error saving file:", err);
        alert("An error occurred while saving the file.");
      }
    }
  };
  
  const updatePI = (id: string, field: keyof PI, value: number) => {
    setWaypoints(prev => prev.map(pi => pi.id === id ? { ...pi, [field]: value } : pi));
  };
  
  const removePI = (id: string) => {
    setWaypoints(prev => prev.filter(pi => pi.id !== id));
  };

  const getSegmentColor = (type: string) => {
    if (type === 'Tangent') return '#0ea5e9'; // Light blue
    if (type === 'Curve') return '#ef4444'; // Red
    if (type === 'Spiral') return '#22c55e'; // Light green
    return '#64748b';
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      
      {/* Settings Sidebar */}
      <div style={{ width: '380px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon size={20} color="#0f766e" /> Route Optimizer
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            AASHTO standard geometric route optimization
          </p>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Map Settings */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
              <MapIcon style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: '#475569' }} />
              Environment Setup
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>UTM Zone (WGS 84)</label>
                <select style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} value={utmZone} onChange={e => setUtmZone(e.target.value)}>
                  {UTM_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Base Map Provider</label>
                <select style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} value={mapProvider} onChange={e => setMapProvider(e.target.value)}>
                  <option value="ESRI">Esri Satellite</option>
                  <option value="GOOGLE">Google Earth</option>
                  <option value="BING">Bing Maps</option>
                  <option value="OSM">OpenStreetMap</option>
                  <option value="TOPO">OpenTopoMap</option>
                </select>
              </div>
              
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #cbd5e1', marginTop: '0.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: '600', marginBottom: '0.5rem' }}>Elevation Surface</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Surface Source</label>
                    <select style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} value={surfaceProvider} onChange={e => setSurfaceProvider(e.target.value)}>
                      <option value="AWS">Global Online Surface (AWS Terrarium)</option>
                      <option value="MANUAL">Manual GeoTIFF Upload</option>
                    </select>
                  </div>
                  
                  {surfaceProvider === 'MANUAL' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Upload GeoTIFF</label>
                      <input 
                        type="file" 
                        accept=".tif,.tiff" 
                        style={{ width: '100%', padding: '0.25rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        onChange={e => {
                          if (e.target.files) setSurfaceFile(e.target.files[0]);
                        }} 
                      />
                    </div>
                  )}
                  
                  <button 
                    onClick={() => setShowSurface(!showSurface)}
                    style={{ 
                      width: '100%', 
                      padding: '0.375rem 0.75rem', 
                      fontSize: '0.85rem', 
                      borderRadius: '0.375rem', 
                      transition: 'background-color 0.2s', 
                      backgroundColor: showSurface ? 'var(--primary-color)' : '#f1f5f9', 
                      color: showSurface ? '#ffffff' : '#334155',
                      border: showSurface ? 'none' : '1px solid #cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {showSurface ? 'Hide Terrain Overlay' : 'Show Terrain Overlay'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Design Parameters */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: '0.5rem' }}>Design Parameters</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Road Type</label>
                <select value={roadType} onChange={e => setRoadType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}>
                  <option>Arterial</option>
                  <option>Collector</option>
                  <option>Local</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Speed (km/h)</label>
                <input type="number" value={designSpeed} onChange={e => setDesignSpeed(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Max Grade (%)</label>
                <input type="number" value={maxGrade} onChange={e => setMaxGrade(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Left Lanes</label>
                <input type="number" value={leftLanes} onChange={e => setLeftLanes(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Right Lanes</label>
                <input type="number" value={rightLanes} onChange={e => setRightLanes(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Lane Width (m)</label>
                <input type="number" step="0.1" value={laneWidth} onChange={e => setLaneWidth(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Cut Slope (%)</label>
                <input type="number" value={cutSlope} onChange={e => setCutSlope(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} title="e.g. 50% for 1:2 slope" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Fill Slope (%)</label>
                <input type="number" value={fillSlope} onChange={e => setFillSlope(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} title="e.g. 33.3% for 1:3 slope" />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: '0.5rem' }}>Auto-Generate Route</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.4' }}>
              Use the A* Search algorithm to find an optimal corridor that minimizes earthworks based on steep grade penalties.
            </p>
            
            <button
              onClick={() => { setAutoMode(!autoMode); setAutoStartPoint(null); setAutoEndPoint(null); }}
              className={`w-full py-2 text-sm rounded transition-colors ${autoMode ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {autoMode ? 'Cancel Auto Mode' : 'Enter Auto-Generate Mode'}
            </button>
            
            {autoMode && (
              <div className="space-y-3 bg-gray-50 p-3 rounded text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${autoStartPoint ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={autoStartPoint ? 'text-gray-800' : 'text-gray-400'}>
                    {autoStartPoint ? `Start: ${autoStartPoint[0].toFixed(4)}, ${autoStartPoint[1].toFixed(4)}` : 'Click map to set Start Point'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${autoEndPoint ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  <span className={autoEndPoint ? 'text-gray-800' : 'text-gray-400'}>
                    {autoEndPoint ? `End: ${autoEndPoint[0].toFixed(4)}, ${autoEndPoint[1].toFixed(4)}` : 'Click map to set End Point'}
                  </span>
                </div>
                <button 
                  onClick={runAutoGenerate}
                  disabled={!autoStartPoint || !autoEndPoint || isProcessing}
                  className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded font-medium disabled:opacity-50"
                >
                  {isProcessing ? 'Generating...' : 'Run Pathfinding Algorithm'}
                </button>
              </div>
            )}
          </div>
          
          {/* PI Editor */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              PI Editor
              <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '1rem', color: '#475569' }}>{waypoints.length} PIs</span>
            </h3>
            
            {waypoints.length === 0 ? (
              <div style={{ padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '0.375rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                Click on the map to add PIs
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {waypoints.map((pi, i) => (
                  <div key={pi.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
                    <div 
                      style={{ padding: '0.5rem', background: editingPI === pi.id ? '#e0f2fe' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setEditingPI(editingPI === pi.id ? null : pi.id)}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>PI {i + 1}</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); removePI(pi.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {editingPI === pi.id && (
                      <div style={{ padding: '0.75rem', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Lat</label>
                            <input type="number" step="0.000001" value={pi.lat} onChange={e => updatePI(pi.id, 'lat', Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Lng</label>
                            <input type="number" step="0.000001" value={pi.lng} onChange={e => updatePI(pi.id, 'lng', Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} />
                          </div>
                          {i > 0 && i < waypoints.length - 1 && (
                            <>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Radius (m)</label>
                                <input type="number" value={pi.radius} onChange={e => updatePI(pi.id, 'radius', Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Spiral Length (m)</label>
                                <input type="number" value={pi.spiralLength} onChange={e => updatePI(pi.id, 'spiralLength', Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={handleOptimize}
              disabled={isProcessing}
              style={{ padding: '0.75rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: isProcessing ? 0.7 : 1 }}
            >
              <Settings size={18} /> {isProcessing ? 'Processing Geometry...' : 'Generate Geometry'}
            </button>
            <button 
              onClick={handleExport}
              style={{ padding: '0.75rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Download size={18} /> Export LandXML
            </button>
            <button 
              onClick={() => { setWaypoints([]); setOptimizedSegments([]); }}
              style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Trash2 size={18} /> Clear Alignment
            </button>
          </div>

        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={[0.3476, 32.5825]} zoom={13} style={{ width: '100%', height: '100%' }}>
          {mapProvider === 'BING' ? (
            <BingTileLayer />
          ) : (
            <TileLayer
              url={(MAP_PROVIDERS as any)[mapProvider]}
              attribution='&copy; OpenStreetMap contributors, Google, Esri'
            />
          )}
          
          {showSurface && <TerrainRGBLayer />}
          
          <MapEvents />
          
          {/* Render Auto Mode Points */}
          {autoStartPoint && (
            <Marker position={autoStartPoint} icon={L.divIcon({ className: 'custom-icon', html: '<div style="background-color:#22c55e;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>' })} />
          )}
          {autoEndPoint && (
            <Marker position={autoEndPoint} icon={L.divIcon({ className: 'custom-icon', html: '<div style="background-color:#ef4444;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>' })} />
          )}
          
          {/* Render User Waypoints (PIs) */}
          {waypoints.map((pi, i) => (
            <Marker 
              key={pi.id} 
              position={[pi.lat, pi.lng]} 
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  updatePI(pi.id, 'lat', pos.lat);
                  updatePI(pi.id, 'lng', pos.lng);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>PI {i + 1} Configuration</h4>
                  
                  {i > 0 && i < waypoints.length - 1 ? (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.15rem' }}>Curve Radius (m)</label>
                        <input 
                          type="number" 
                          value={pi.radius} 
                          onChange={e => updatePI(pi.id, 'radius', Number(e.target.value))} 
                          style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.15rem' }}>Spiral Length (m)</label>
                        <input 
                          type="number" 
                          value={pi.spiralLength} 
                          onChange={e => updatePI(pi.id, 'spiralLength', Number(e.target.value))} 
                          style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} 
                        />
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                        * Profile auto-recalculates after changes
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                      Start/End points do not have curves.
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Render Raw PI Lines (dotted grey) */}
          {waypoints.length > 1 && (
            <Polyline positions={waypoints.map(pi => [pi.lat, pi.lng])} color="#64748b" dashArray="5, 10" weight={2} />
          )}

          {/* Render Corridor Footprint (Daylight bounds) */}
          {corridorFootprint && (
            <>
              {/* Paved Road Surface */}
              {corridorFootprint.roadSurface.length > 0 && (
                <Polygon 
                  positions={corridorFootprint.roadSurface} 
                  color="#94a3b8" 
                  weight={1}
                  fillColor="#cbd5e1" 
                  fillOpacity={0.8} 
                />
              )}
              
              {/* Cut Slopes */}
              {corridorFootprint.cutPolygons.map((poly, idx) => (
                <Polygon 
                  key={`cut-${idx}`}
                  positions={poly} 
                  color="#b45309" // darker brown border
                  weight={1}
                  fillColor="#d97706" // light brown
                  fillOpacity={0.4} 
                />
              ))}

              {/* Fill Slopes */}
              {corridorFootprint.fillPolygons.map((poly, idx) => (
                <Polygon 
                  key={`fill-${idx}`}
                  positions={poly} 
                  color="#16a34a" // darker green border
                  weight={1}
                  fillColor="#4ade80" // light green
                  fillOpacity={0.4} 
                />
              ))}
            </>
          )}

          {/* Render Optimized Alignment Segments */}
          {optimizedSegments.map((seg, i) => (
            <Polyline 
              key={`seg-${i}`} 
              positions={seg.points} 
              color={getSegmentColor(seg.type)} 
              weight={4} 
            />
          ))}

        </MapContainer>
        
        {/* Map Overlay info */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.9)', padding: '0.75rem 1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 400 }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Legend</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '4px', background: '#0ea5e9' }}></div> Tangent
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '4px', background: '#22c55e' }}></div> Spiral
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '4px', background: '#ef4444' }}></div> Curve
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '12px', background: '#cbd5e1', opacity: 0.8, border: '1px solid #94a3b8' }}></div> Lanes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '12px', background: '#d97706', opacity: 0.6, border: '1px solid #b45309' }}></div> Cut
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
              <div style={{ width: '12px', height: '12px', background: '#4ade80', opacity: 0.6, border: '1px solid #16a34a' }}></div> Fill
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
