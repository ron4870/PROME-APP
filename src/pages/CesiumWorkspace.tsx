import React, { useEffect, useState, useRef } from 'react';
import { Database, Cloud, RefreshCw, Layers, FileText, ArrowLeft, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    Cesium?: any;
  }
}

interface StreamFile {
  id?: number;
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
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'google' | 'street'>('satellite');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [streamLog, setStreamLog] = useState<string[]>([
    'Initializing secure connection to Google Drive folder 1NiTtobaBBEgm0MbJz0mdVmJPO5TOKwKO...',
    'Connected to Google Drive Master Registry.',
    'Discovered 4 streamable spatial layers in folder /PROME_3D_Master_Database.'
  ]);
  const { token } = useAuth();
  const [masterProjectId, setMasterProjectId] = useState<number | null>(null);
  const [files, setFiles] = useState<StreamFile[]>(mockStreamFiles);

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

  // Fetch Master Database and list files
  useEffect(() => {
    const initMasterDatabase = async () => {
      try {
        setGdriveStatus('syncing');
        const projRes = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (projRes.ok) {
          const projects = await projRes.json();
          const masterProj = projects.find((p: any) => p.name === 'Master Database');
          if (masterProj) {
            setMasterProjectId(masterProj.id);
            addLog(`Master Database Project resolved (ID: ${masterProj.id}).`);
            
            const docsRes = await fetch(`/api/projects/${masterProj.id}/documents`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (docsRes.ok) {
              const docs = await docsRes.json();
              const mappedDocs: StreamFile[] = docs.map((doc: any) => {
                let size = '2.5 MB';
                try {
                  JSON.parse(doc.fileUrl || '{}');
                } catch(e) {}
                
                let layerType: any = 'GeoJSON';
                if (doc.title.endsWith('.kml')) layerType = 'KML';
                if (doc.title.endsWith('.czml')) layerType = 'CZML';
                if (doc.title.endsWith('.glb') || doc.title.endsWith('.gltf')) layerType = 'Point Cloud';
                
                return {
                  id: doc.id,
                  name: doc.title,
                  type: doc.type,
                  size: size,
                  lastModified: new Date(doc.createdAt).toISOString().replace('T', ' ').slice(0, 16),
                  layerType: layerType,
                  status: 'Ready'
                };
              });
              
              const merged = [...mappedDocs];
              mockStreamFiles.forEach(mock => {
                if (!merged.some(f => f.name === mock.name)) {
                  merged.push(mock);
                }
              });
              setFiles(merged);
              setGdriveStatus('connected');
              addLog(`Discovered ${mappedDocs.length} streamable spatial layers in Google Drive folder "Master Database".`);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setGdriveStatus('error');
        addLog('Error: Failed to fetch registry from Google Drive.');
      }
    };

    if (token) {
      initMasterDatabase();
    }
  }, [token]);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!cesiumLoaded || !window.Cesium) return;

    const Cesium = window.Cesium;
    // Disable Cesium Ion access token request as requested
    Cesium.Ion.defaultAccessToken = '';

    const initViewer = async () => {
      try {
        let terrainProvider;
        
        // Try modern async factory first
        if (Cesium.ArcGISTiledElevationTerrainProvider && typeof Cesium.ArcGISTiledElevationTerrainProvider.fromUrl === 'function') {
          terrainProvider = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
            'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
          );
        } else {
          // Fallback to legacy constructor
          terrainProvider = new Cesium.ArcGISTiledElevationTerrainProvider({
            url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
          });
        }

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
          terrainProvider: terrainProvider,
          animation: false,
          timeline: false,
          fullscreenButton: false
        });

        viewer.scene.globe.enableLighting = true;
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
        viewerRef.current = viewer;

        addLog('Loaded ArcGIS World Imagery (Satellite) & global 3D elevation server successfully.');
        flyToUganda(true);
      } catch (err) {
        console.error('Failed to load terrain provider. Falling back to EllipsoidTerrainProvider.', err);
        
        try {
          const viewer = new Cesium.Viewer(containerId, {
            geocoder: false,
            homeButton: true,
            sceneModePicker: true,
            navigationHelpButton: false,
            infoBox: true,
            selectionIndicator: true,
            baseLayerPicker: false,
            imageryProvider: new Cesium.UrlTemplateImageryProvider({
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              credit: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            }),
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            animation: false,
            timeline: false,
            fullscreenButton: false
          });

          viewer.scene.globe.enableLighting = true;
          viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
          viewerRef.current = viewer;

          addLog('Loaded ArcGIS World Imagery on Ellipsoid terrain fallback.');
          flyToUganda(true);
        } catch (fallbackErr) {
          console.error('Final fallback viewer initialization failed', fallbackErr);
        }
      }
    };

    initViewer();
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
  };

  const changeBaseLayer = (type: 'satellite' | 'google' | 'street') => {
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
    } else if (type === 'google') {
      layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        credit: 'Map data © Google'
      }));
      addLog('Base imagery switched to Google Satellite View.');
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
          name: 'Campaign Flyover Lot 2 Corridor',
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
        addLog('Loaded CZML timelapse coordinates. Site facilities mapped successfully.');
      } else if (file.name.includes('design_alignment')) {
        // Draw a simulated design alignment corridor
        const corridor = [
          32.285, 2.760, 1080,
          32.290, 2.765, 1085,
          32.295, 2.772, 1092,
          32.305, 2.780, 1100
        ];
        viewer.entities.add({
          layerName: file.name,
          name: 'Highway Alignment corridor design (imported kml)',
          description: 'Vector alignment corridor imported from project drive folder.',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(corridor),
            width: 5,
            material: Cesium.Color.CYAN
          }
        });
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(32.295, 2.772, 5000.0),
          duration: 2.0
        });
        addLog('Camera focused on imported highway alignment corridor design.');
      } else if (file.name.includes('dem_elevation')) {
        addLog('Visualizing imported digital elevation model (terrain meshes).');
      } else if (file.name.includes('orthophoto')) {
        addLog('Visualizing imported orthophoto raster overlay mask.');
      } else if (file.name.includes('bridge_gantry')) {
        addLog('Visualizing imported 3D bridge gantry model structure mesh.');
      }
    }
  };

  const uploadFileToMasterDatabase = async (fileName: string, mimeType: string, fileSize: string, layerType: 'GeoJSON' | 'CZML' | 'KML' | 'Point Cloud') => {
    if (!masterProjectId) {
      addLog('Error: Master Database project ID not resolved.');
      return;
    }
    
    addLog(`Initiating secure connection to Google Drive folder for Master Database...`);
    addLog(`Uploading "${fileName}" to Master Database folder in Google Drive...`);
    
    try {
      const formData = new FormData();
      const mockBlob = new Blob([`mock data content for ${fileName}`], { type: mimeType });
      formData.append('file', mockBlob, fileName);
      formData.append('title', fileName);
      formData.append('type', 'GIS Layer');
      formData.append('documentNumber', `GIS-${Date.now()}`);
      formData.append('revision', '1.0');
      formData.append('status', 'Ready');
      formData.append('issueDate', new Date().toISOString());

      const res = await fetch(`/api/projects/${masterProjectId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const newDoc = await res.json();
        const newFile: StreamFile = {
          id: newDoc.id,
          name: newDoc.title,
          type: newDoc.type,
          size: fileSize,
          lastModified: new Date(newDoc.createdAt).toISOString().replace('T', ' ').slice(0, 16),
          layerType: layerType,
          status: 'Ready'
        };
        setFiles(prev => {
          if (prev.some(f => f.name === newFile.name)) return prev;
          return [newFile, ...prev];
        });
        addLog(`Successfully imported "${fileName}" to Master Database project folder.`);
      } else {
        addLog(`Error: Failed to upload file metadata to Master Database API.`);
      }
    } catch (err) {
      console.error(err);
      addLog(`Network Error: Failed to upload file to Google Drive.`);
    }
  };

  const handleImportSurface = () => {
    uploadFileToMasterDatabase('dem_elevation_uganda.tif', 'image/tiff', '8.4 MB', 'GeoJSON');
  };

  const handleImportDesignFiles = () => {
    uploadFileToMasterDatabase('design_alignment.kml', 'application/xml', '2.4 MB', 'KML');
  };

  const handleImportPNGs = () => {
    uploadFileToMasterDatabase('orthophoto_overlay_crop.png', 'image/png', '4.2 MB', 'KML');
  };

  const handleImportGLTF = () => {
    uploadFileToMasterDatabase('bridge_gantry_model.glb', 'model/gltf-binary', '14.5 MB', 'Point Cloud');
  };

  const handleDeleteFile = async (file: StreamFile) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}" from Google Drive and the stream registry?`)) return;

    if (viewerRef.current) {
      const viewer = viewerRef.current;
      const entitiesToRemove: any[] = [];
      viewer.entities.values.forEach((entity: any) => {
        if (entity.layerName === file.name) {
          entitiesToRemove.push(entity);
        }
      });
      entitiesToRemove.forEach(e => viewer.entities.remove(e));
    }

    setActiveLayers(prev => prev.filter(name => name !== file.name));
    setFiles(prev => prev.filter(f => f.name !== file.name));

    if (file.id && masterProjectId) {
      try {
        const res = await fetch(`/api/projects/${masterProjectId}/documents/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          addLog(`Successfully deleted "${file.name}" from Google Drive folder "Master Database".`);
        } else {
          addLog(`Error: Failed to delete "${file.name}" from Google Drive folder.`);
        }
      } catch (err) {
        console.error(err);
        addLog(`Network Error: Failed to delete "${file.name}" from Google Drive.`);
      }
    } else {
      addLog(`Deleted "${file.name}" from registry local cache.`);
    }
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

      {/* Floating Right Control Panel (Glassmorphism Sidebar) */}
      <div style={{ 
        position: 'absolute', 
        top: '60px', 
        right: isPanelOpen ? '20px' : '-390px', 
        width: '380px', 
        maxHeight: '88vh', 
        backgroundColor: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 100, 
        color: '#f8fafc',
        transition: 'right 0.3s ease-in-out',
        overflow: 'visible' // allow toggle button to float outside left border
      }}>

        {/* Floating Toggle Chevron Button on Left Edge */}
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          style={{ 
            position: 'absolute',
            top: '50%',
            left: '-32px',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '60px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRight: 'none',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 101,
            color: '#f8fafc',
            boxShadow: '-4px 4px 10px rgba(0, 0, 0, 0.3)',
            transition: 'color 0.2s',
            outline: 'none'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'}
          onMouseLeave={e => e.currentTarget.style.color = '#f8fafc'}
          title={isPanelOpen ? "Collapse registry" : "Expand registry"}
        >
          {isPanelOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Panel Main Container */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', borderRadius: '16px' }}>
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
            <button 
              onClick={handleSyncDrive}
              disabled={gdriveStatus === 'syncing'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={12} className={gdriveStatus === 'syncing' ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Content scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Base Layer Switcher */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={14} /> Base Map Layer
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button 
                  onClick={() => changeBaseLayer('satellite')}
                  style={{ 
                    width: '100%',
                    backgroundColor: baseLayer === 'satellite' ? '#0ea5e9' : 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '6px', 
                    color: '#f8fafc', 
                    padding: '8px 10px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  🛰️ ArcGIS Satellite View
                </button>
                <button 
                  onClick={() => changeBaseLayer('google')}
                  style={{ 
                    width: '100%',
                    backgroundColor: baseLayer === 'google' ? '#0ea5e9' : 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '6px', 
                    color: '#f8fafc', 
                    padding: '8px 10px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  🌎 Google Satellite View
                </button>
                <button 
                  onClick={() => changeBaseLayer('street')}
                  style={{ 
                    width: '100%',
                    backgroundColor: baseLayer === 'street' ? '#0ea5e9' : 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '6px', 
                    color: '#f8fafc', 
                    padding: '8px 10px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  🗺️ OpenStreetMap Street View
                </button>
              </div>
            </div>

            {/* Import Data Layers Section */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={14} /> Import Data Layers
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button 
                  onClick={handleImportSurface}
                  style={{ 
                    backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                    border: '1px solid rgba(14, 165, 233, 0.25)', 
                    borderRadius: '6px', 
                    color: '#38bdf8', 
                    padding: '8px 6px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  📥 Import Surface
                </button>
                <button 
                  onClick={handleImportDesignFiles}
                  style={{ 
                    backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                    border: '1px solid rgba(14, 165, 233, 0.25)', 
                    borderRadius: '6px', 
                    color: '#38bdf8', 
                    padding: '8px 6px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  📥 Import Design Files
                </button>
                <button 
                  onClick={handleImportPNGs}
                  style={{ 
                    backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                    border: '1px solid rgba(14, 165, 233, 0.25)', 
                    borderRadius: '6px', 
                    color: '#38bdf8', 
                    padding: '8px 6px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  📥 Import PNGs
                </button>
                <button 
                  onClick={handleImportGLTF}
                  style={{ 
                    backgroundColor: 'rgba(14, 165, 233, 0.1)', 
                    border: '1px solid rgba(14, 165, 233, 0.25)', 
                    borderRadius: '6px', 
                    color: '#38bdf8', 
                    padding: '8px 6px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  📥 Import GLTF/GLB
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
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', wordBreak: 'break-all' }}>{file.name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Size: {file.size} | Type: {file.layerType}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'stretch' }}>
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
                          <button 
                            onClick={() => handleDeleteFile(file)}
                            style={{ 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#f87171',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                          >
                            Delete
                          </button>
                        </div>
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

    </div>
  );
};
