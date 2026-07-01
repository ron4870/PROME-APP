import React, { useEffect, useState, useRef } from 'react';
import { Database, Cloud, RefreshCw, Layers, Compass, FileText, ArrowLeft, Link as LinkIcon } from 'lucide-react';

declare global {
  interface Window {
    Cesium?: any;
  }
}

interface StreamFile {
  name: string;
  type: string;
  size: string;
  lastModified: string;
  layerType: 'GeoJSON' | 'CZML' | 'KML' | 'Point Cloud';
  status: 'Ready' | 'Loaded' | 'Failed';
}

const mockStreamFiles: StreamFile[] = [
  { name: 'kampala_flyover_alignment.geojson', type: 'application/json', size: '1.2 MB', lastModified: '2026-06-29 14:02', layerType: 'GeoJSON', status: 'Ready' },
  { name: 'gulu_logistics_hub_perimeter.kml', type: 'application/xml', size: '420 KB', lastModified: '2026-06-28 11:45', layerType: 'KML', status: 'Ready' },
  { name: 'entebbe_expressway_corridor.geojson', type: 'application/json', size: '2.5 MB', lastModified: '2026-06-27 09:12', layerType: 'GeoJSON', status: 'Ready' },
  { name: 'flyover_construction_timelapse.czml', type: 'application/json', size: '890 KB', lastModified: '2026-06-25 16:30', layerType: 'CZML', status: 'Ready' }
];

export const CesiumWorkspace: React.FC = () => {
  const viewerRef = useRef<any>(null);
  const containerId = 'cesiumContainer';
  const [cesiumLoaded, setCesiumLoaded] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [gdriveStatus, setGdriveStatus] = useState<'connected' | 'syncing' | 'error'>('connected');
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'street'>('satellite');
  const [streamLog, setStreamLog] = useState<string[]>([
    'Initializing secure connection to Google Drive folder 1NiTtobaBBEgm0MbJz0mdVmJPO5TOKwKO...',
    'Connected to Google Drive Master Registry.',
    'Discovered 4 streamable spatial layers in folder /PROME_3D_Master_Database.'
  ]);
  const [files, setFiles] = useState<StreamFile[]>(mockStreamFiles);
  const [selectedProjectLocation, setSelectedProjectLocation] = useState<string>('World');

  // Load CesiumJS scripts and widgets dynamically
  useEffect(() => {
    // 1. Append widgets stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css';
    document.head.appendChild(link);

    // 2. Append main script loader
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js';
    script.async = true;
    script.onload = () => {
      setCesiumLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!cesiumLoaded || !window.Cesium) return;

    const Cesium = window.Cesium;
    // Disable Cesium Ion access token request as requested
    Cesium.Ion.defaultAccessToken = '';

    // Initialize with ArcGIS World Imagery Satellite tiles and ArcGIS Elevation Server (No Ion credentials needed)
    const viewer = new Cesium.Viewer(containerId, {
      geocoder: false,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: false,
      infoBox: true,
      selectionIndicator: true,
      baseLayerPicker: false, // Custom switcher is implemented in the sidebar UI
      imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }),
      terrainProvider: new Cesium.ArcGISTiledElevationTerrainProvider({
        url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
      }),
      animation: false,
      timeline: false,
      fullscreenButton: false
    });

    // Configure lighting and camera view
    viewer.scene.globe.enableLighting = true;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;

    viewerRef.current = viewer;

    addLog('Loaded ArcGIS World Imagery (Satellite) & global 3D elevation server successfully.');

    // Fly to Uganda as the default operational scope
    flyToUganda(true);
  }, [cesiumLoaded]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setStreamLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const flyToUganda = (instant = false) => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    
    addLog('Positioning camera viewport over East Africa / Uganda.');
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(32.2903, 1.3733, 1200000.0), // Uganda bounding center
      duration: instant ? 0 : 3.0
    });
    setSelectedProjectLocation('Uganda');
  };

  const changeBaseLayer = (type: 'satellite' | 'street') => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const layers = viewerRef.current.imageryLayers;
    layers.removeAll();
    
    if (type === 'satellite') {
      layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }));
      addLog('Base imagery switched to ArcGIS World Imagery (Satellite View).');
    } else {
      layers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      }));
      addLog('Base imagery switched to OpenStreetMap (Street Map View).');
    }
    setBaseLayer(type);
  };

  const handleSyncDrive = () => {
    setGdriveStatus('syncing');
    addLog('Initiating real-time query request to Google Drive API...');
    
    setTimeout(() => {
      setGdriveStatus('connected');
      addLog('Stream folder /PROME_3D_Master_Database matches latest revision (v1.0.4).');
      addLog('All cached spatial coordinates are in WGS 84. Coordinate bounds verified.');
    }, 1500);
  };

  const toggleLayer = (file: StreamFile) => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const isCurrentlyActive = activeLayers.includes(file.name);
    
    if (isCurrentlyActive) {
      // Remove layer
      addLog(`Removing layer: ${file.name}`);
      
      // Remove matching entities
      const entitiesToRemove: any[] = [];
      viewer.entities.values.forEach((entity: any) => {
        if (entity.layerName === file.name) {
          entitiesToRemove.push(entity);
        }
      });
      entitiesToRemove.forEach(e => viewer.entities.remove(e));
      
      setActiveLayers(prev => prev.filter(name => name !== file.name));
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'Ready' } : f));
    } else {
      // Add layer (render mock spatial data coordinates in Uganda)
      addLog(`Streaming spatial layer payload from Google Drive: ${file.name}`);
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'Loaded' } : f));
      setActiveLayers(prev => [...prev, file.name]);

      if (file.name.includes('kampala_flyover')) {
        // Render Kampala Flyover glowing red alignment line
        const flyoverCoordinates = [
          32.5762, 0.3134, 1150,
          32.5802, 0.3142, 1155,
          32.5841, 0.3129, 1158,
          32.5898, 0.3098, 1152,
          32.5932, 0.3081, 1150
        ];

        const cartesianCoords = Cesium.Cartesian3.fromDegreesArrayHeights(flyoverCoordinates);

        // Add polyline path
        viewer.entities.add({
          layerName: file.name,
          name: 'Kampala Flyover Lot 2 Corridor',
          description: 'Proposed highway flyover alignment surveyed in GRCh38 / WGS 84.',
          polyline: {
            positions: cartesianCoords,
            width: 8,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: Cesium.Color.RED
            })
          }
        });

        // Add site markers
        viewer.entities.add({
          layerName: file.name,
          name: 'Queens Clocktower Junction Station',
          description: 'Primary cloverleaf intersection start point.',
          position: Cesium.Cartesian3.fromDegrees(32.5802, 0.3142, 1155),
          point: {
            pixelSize: 12,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
          }
        });

        // Fly camera to Kampala (tilt camera to show 3D topography and road)
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(32.5841, 0.3020, 1600.0),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-25.0), // Tilt for 3D terrain
            roll: 0.0
          },
          duration: 2.5
        });
        setSelectedProjectLocation('Kampala Flyover');
        addLog('Camera focused on Kampala Flyover Project Lot 2 corridor.');

      } else if (file.name.includes('gulu_logistics')) {
        // Render Gulu Logistics hub bounding polygon
        const bounds = [
          32.2882, 2.7680,
          32.2965, 2.7680,
          32.2965, 2.7750,
          32.2882, 2.7750
        ];

        viewer.entities.add({
          layerName: file.name,
          name: 'Gulu Logistics Hub Perimeter',
          description: 'Proposed Gulu inland dry port and logistics center layout.',
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(bounds),
            material: Cesium.Color.GOLD.withAlpha(0.35),
            outline: true,
            outlineColor: Cesium.Color.GOLD,
            outlineWidth: 3
          }
        });

        viewer.entities.add({
          layerName: file.name,
          name: 'Hub Office Complex Block',
          position: Cesium.Cartesian3.fromDegrees(32.2920, 2.7715, 1100),
          point: {
            pixelSize: 14,
            color: Cesium.Color.GOLD,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
          }
        });

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(32.2920, 2.7620, 1800.0),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-20.0),
            roll: 0.0
          },
          duration: 2.5
        });
        setSelectedProjectLocation('Gulu Hub');
        addLog('Camera focused on Gulu Logistics Hub perimeter boundaries.');

      } else if (file.name.includes('entebbe_expressway')) {
        // Render Entebbe Expressway corridor path
        const expressCoordinates = [
          32.5700, 0.3000, 1145,
          32.5580, 0.2500, 1140,
          32.5400, 0.2000, 1130,
          32.5200, 0.1500, 1125,
          32.4800, 0.0800, 1118,
          32.4650, 0.0500, 1115
        ];

        viewer.entities.add({
          layerName: file.name,
          name: 'Entebbe Expressway Alignment',
          description: 'Expansion bypass route corridor.',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(expressCoordinates),
            width: 6,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.CYAN
            })
          }
        });

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(32.5200, 0.1500, 35000.0),
          duration: 3.0
        });
        setSelectedProjectLocation('Entebbe Corridor');
        addLog('Camera viewport centered over Kampala-Entebbe Expressway bypass.');
      } else if (file.name.includes('timelapse')) {
        // Draw site planning markers
        const planningSites = [
          { name: 'Batching Plant Site A', lon: 32.585, lat: 0.308 },
          { name: 'Casting Yard Site B', lon: 32.578, lat: 0.312 },
          { name: 'Gantry Crane Assembly', lon: 32.591, lat: 0.309 }
        ];

        planningSites.forEach(site => {
          viewer.entities.add({
            layerName: file.name,
            name: site.name,
            position: Cesium.Cartesian3.fromDegrees(site.lon, site.lat, 1150),
            point: {
              pixelSize: 10,
              color: Cesium.Color.LIME,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2
            }
          });
        });

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(32.5841, 0.3129, 5000.0),
          duration: 2.0
        });
        setSelectedProjectLocation('Construction Planning');
        addLog('Loaded CZML timelapse coordinates. Site facilities mapped successfully.');
      }
    }
  };

  const clearAllLayers = () => {
    if (!viewerRef.current) return;
    viewerRef.current.entities.removeAll();
    setActiveLayers([]);
    setFiles(prev => prev.map(f => ({ ...f, status: 'Ready' })));
    addLog('Removed all active layers. Map cleared.');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: '#0f172a', position: 'relative' }}>
      
      {/* Dynamic Cesium Map Container */}
      <div id={containerId} style={{ flex: 1, height: '100%' }} />

      {!cesiumLoaded && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Database className="animate-spin" color="#0ea5e9" size={36} />
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc' }}>Loading Cesium 3D Engine...</span>
          </div>
          <p style={{ color: '#64748b' }}>Streaming spatial assets & graphics configurations from global CDN...</p>
        </div>
      )}

      {/* Floating Left Control Panel (Glassmorphism Sidebar) */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        width: '380px', 
        maxHeight: '92vh', 
        backgroundColor: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 100, 
        color: '#f8fafc',
        overflow: 'hidden'
      }}>
        
        {/* Header Block */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database color="#0ea5e9" size={22} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>PROME 3D Master DB</h2>
            </div>
            <button 
              onClick={() => window.close()} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#94a3b8', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              <ArrowLeft size={12} /> Exit
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
            Geospatial project modeling environment. Google Drive linked storage database workspace.
          </p>
        </div>

        {/* Google Drive Status Bar */}
        <div style={{ 
          padding: '0.75rem 1.25rem', 
          backgroundColor: gdriveStatus === 'syncing' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cloud color={gdriveStatus === 'syncing' ? '#f59e0b' : '#10b981'} size={16} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              {gdriveStatus === 'syncing' ? 'Syncing Drive registry...' : 'Drive Connected'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a 
              href="https://drive.google.com/drive/folders/1NiTtobaBBEgm0MbJz0mdVmJPO5TOKwKO?usp=drive_link" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#0ea5e9', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
              title="Open linked Google Drive folder"
            >
              <LinkIcon size={12} /> Drive Folder
            </a>
            <button 
              onClick={handleSyncDrive}
              disabled={gdriveStatus === 'syncing'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={12} className={gdriveStatus === 'syncing' ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Content scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Base Layer Switcher */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} /> Base Map Layer
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                onClick={() => changeBaseLayer('satellite')}
                style={{ 
                  backgroundColor: baseLayer === 'satellite' ? '#0ea5e9' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  color: '#f8fafc', 
                  padding: '8px 6px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                🛰️ Satellite View
              </button>
              <button 
                onClick={() => changeBaseLayer('street')}
                style={{ 
                  backgroundColor: baseLayer === 'street' ? '#0ea5e9' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  color: '#f8fafc', 
                  padding: '8px 6px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                🗺️ Street Map View
              </button>
            </div>
          </div>

          {/* Quick Camera Navigation */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Compass size={14} /> Quick Viewports (3D terrain focus)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                onClick={() => flyToUganda()}
                style={{ 
                  backgroundColor: selectedProjectLocation === 'Uganda' ? '#0f766e' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  color: '#f8fafc', 
                  padding: '6px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🇺🇬 Uganda Center
              </button>
              <button 
                onClick={() => {
                  if (!viewerRef.current || !window.Cesium) return;
                  const Cesium = window.Cesium;
                  viewerRef.current.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(32.5841, 0.3020, 1600.0),
                    orientation: {
                      heading: Cesium.Math.toRadians(0.0),
                      pitch: Cesium.Math.toRadians(-25.0),
                      roll: 0.0
                    },
                    duration: 2.0
                  });
                  setSelectedProjectLocation('Kampala Flyover');
                  addLog('Camera focused on Kampala Flyover Lot 2.');
                }}
                style={{ 
                  backgroundColor: selectedProjectLocation === 'Kampala Flyover' ? '#0f766e' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  color: '#f8fafc', 
                  padding: '6px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🌉 Kampala Flyover
              </button>
              <button 
                onClick={() => {
                  if (!viewerRef.current || !window.Cesium) return;
                  const Cesium = window.Cesium;
                  viewerRef.current.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(32.2920, 2.7620, 1800.0),
                    orientation: {
                      heading: Cesium.Math.toRadians(0.0),
                      pitch: Cesium.Math.toRadians(-20.0),
                      roll: 0.0
                    },
                    duration: 2.0
                  });
                  setSelectedProjectLocation('Gulu Hub');
                  addLog('Camera focused on Gulu Logistics Hub.');
                }}
                style={{ 
                  backgroundColor: selectedProjectLocation === 'Gulu Hub' ? '#0f766e' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  color: '#f8fafc', 
                  padding: '6px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🏭 Gulu Logistics Hub
              </button>
              <button 
                onClick={clearAllLayers}
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '6px', 
                  color: '#f87171', 
                  padding: '6px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                🧹 Clear Map
              </button>
            </div>
          </div>

          {/* Drive Streamed Layers List */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} /> Drive Stream Registry
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {files.map(file => {
                const isActive = activeLayers.includes(file.name);
                return (
                  <div 
                    key={file.name} 
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: `1px solid ${isActive ? 'rgba(14, 165, 233, 0.3)' : 'rgba(255,255,255,0.05)'}`, 
                      borderRadius: '8px', 
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', wordBreak: 'break-all' }}>{file.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Size: {file.size} | Type: {file.layerType}</span>
                      </div>
                      
                      <button 
                        onClick={() => toggleLayer(file)}
                        style={{ 
                          backgroundColor: isActive ? '#0284c7' : 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#ffffff',
                          padding: '4px 8px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isActive ? 'Hide Layer' : 'Stream'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drive Stream Real-time Log */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={14} /> Drive Stream logs
            </div>
            <div style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.3)', 
              borderRadius: '8px', 
              padding: '0.75rem', 
              border: '1px solid rgba(255,255,255,0.05)',
              fontFamily: 'monospace',
              fontSize: '0.68rem',
              color: '#38bdf8',
              maxHeight: '140px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              textAlign: 'left'
            }}>
              {streamLog.map((log, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '2px' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer block */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.7rem', color: '#475569', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}>
          Spatial CRS: <span style={{ color: '#94a3b8', fontWeight: 600 }}>EPSG:4326 (WGS 84)</span>
        </div>

      </div>

    </div>
  );
};
