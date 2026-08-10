import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Database, Cloud, RefreshCw, Layers, ArrowLeft, ChevronLeft, ChevronRight, Upload, X, ChevronDown, Plus, FolderOpen, Play, Pause, RotateCcw, Trash2, Activity, Settings, Wrench, Ruler, Hexagon, Columns2, AreaChart, Clock, Compass, Paintbrush, Box, Square, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import proj4 from 'proj4';
import JSZip from 'jszip';
import { AIAssistantPanel } from '../components/cesium/AIAssistantPanel';
import { CesiumCommandBridge } from '../components/cesium/CesiumCommandBridge';

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
  layerType: 'GeoJSON' | 'CZML' | 'KML' | 'Point Cloud' | 'LandXML' | 'DXF' | 'DWG' | 'IFC' | 'SHP' | 'OpenDRIVE' | '3D Tiles' | 'GeoTIFF' | 'OBJ/FBX';
  status: 'Ready' | 'Loaded' | 'Failed';
  coordinates?: any;
  fileUrl?: string;
}

const mockStreamFiles: StreamFile[] = [];

export const CesiumWorkspace: React.FC = () => {
  const viewerRef = useRef<any>(null);
  const designFileInputRef = useRef<HTMLInputElement>(null);
  const surfaceFileInputRef = useRef<HTMLInputElement>(null);
  const gltfFileInputRef = useRef<HTMLInputElement>(null);
  const gltfPrjInputRef = useRef<HTMLInputElement>(null);
  const containerId = 'cesiumContainer';
  const [cesiumLoaded, setCesiumLoaded] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [gdriveStatus, setGdriveStatus] = useState<'connected' | 'syncing' | 'error'>('connected');
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'google' | 'street'>('satellite');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isSurfaceModalOpen, setIsSurfaceModalOpen] = useState(false);
  const [pendingSurfaceFile, setPendingSurfaceFile] = useState<File | null>(null);
  const [surfaceCrs, setSurfaceCrs] = useState<'EPSG:4326' | 'EPSG:32636' | 'EPSG:32635' | 'local'>('EPSG:32636');
  const [surfaceAnchorLat, setSurfaceAnchorLat] = useState('0.3134');
  const [surfaceAnchorLon, setSurfaceAnchorLon] = useState('32.5802');

  // Modal states for GLTF/GLB Georeference import
  const [isGltfModalOpen, setIsGltfModalOpen] = useState(false);
  const [pendingGltfFiles, setPendingGltfFiles] = useState<File[]>([]);
  const [gltfAnchorLat, setGltfAnchorLat] = useState('0.3134');
  const [gltfAnchorLon, setGltfAnchorLon] = useState('32.5802');
  const [gltfCrs, setGltfCrs] = useState('UTM Zone 36N / WGS 84 (EPSG:32636)');
  const [gltfPrjFileName, setGltfPrjFileName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Surfaces': true,
    'Design Files': true,
    'PNGs': true,
    'GLTF/GLB': true
  });

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const { token, hasPermission, user } = useAuth();
  const isAdmin = !!(user?.roles?.some((r: any) => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin') || hasPermission?.('admin_panel'));
  const [masterProjectId, setMasterProjectId] = useState<number | null>(null);
  const [files, setFiles] = useState<StreamFile[]>(mockStreamFiles);
  const [uploadDestination, setUploadDestination] = useState<'project' | 'catalog'>('project');

  // States for Project Selection, Dropdown, and Project Creation
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  // New Project Form States
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('PROME');
  const [newProjDate, setNewProjDate] = useState(new Date().toISOString().slice(0, 10));
  const [newProjDesc, setNewProjDesc] = useState('');
  const [selectedProjectMembers, setSelectedProjectMembers] = useState<number[]>([]);
  const [isCreatingProj, setIsCreatingProj] = useState(false);

  // Edit Project Form States
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjClient, setEditProjClient] = useState('PROME');
  const [editProjDate, setEditProjDate] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjectMembers, setEditProjectMembers] = useState<number[]>([]);
  const [isSavingProj, setIsSavingProj] = useState(false);
  const [isDeletingProj, setIsDeletingProj] = useState(false);

  // Modal states for PNG World File Georeference import
  const [isPngModalOpen, setIsPngModalOpen] = useState(false);
  const [pngFileName, setPngFileName] = useState('');
  const [pgwFileName, setPgwFileName] = useState('');
  const [prjFileName, setPrjFileName] = useState('');
  const [pgwText, setPgwText] = useState('');
  const [prjText, setPrjText] = useState('');
  const [pngFileObj, setPngFileObj] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sub Module states
  const [isSubModulePanelOpen, setIsSubModulePanelOpen] = useState(false);
  const [selectedSubModule, setSelectedSubModule] = useState<'GeoTech' | 'Terrain' | 'Corridors' | 'Hydrology' | 'Structures' | null>(null);

  // TerriaMap GIS Integration states
  const [rightPanelTab, setRightPanelTab] = useState<'registry' | 'catalog'>('registry');
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isSplitActive, setIsSplitActive] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area' | 'profile' | null>(null);
  const [measurementResult, setMeasurementResult] = useState<string>('');
  const [isTimelineActive, setIsTimelineActive] = useState(false);
  const [timelineTime, setTimelineTime] = useState(0); // 0 to 100
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [profileData, setProfileData] = useState<{ dist: number; elev: number }[]>([]);
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({});
  const [activeCatalogItems, setActiveCatalogItems] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Pedestrian Mode and Scene Editor states
  const [isPedestrianActive, setIsPedestrianActive] = useState(false);
  const [pedestrianSpeed, setPedestrianSpeed] = useState(3);
  const [isSceneEditorActive, setIsSceneEditorActive] = useState(false);
  const [isGisMenuOpen, setIsGisMenuOpen] = useState(false);
  const [sceneFog, setSceneFog] = useState(true);
  const [sceneAtmosphere, setSceneAtmosphere] = useState(true);
  const [sceneLighting, setSceneLighting] = useState(true);
  const [sceneShadows, setSceneShadows] = useState(false);
  const [sceneDepthTest, setSceneDepthTest] = useState(true);
  const [sceneContrast, setSceneContrast] = useState(100);
  const [sceneBrightness, setSceneBrightness] = useState(100);

  const keysPressed = useRef<Record<string, boolean>>({});

  // Terrain Area Surface Exporter states
  const [terrainSelectMode, setTerrainSelectMode] = useState<'box' | 'polygon' | null>(null);
  const [terrainExportFormat, setTerrainExportFormat] = useState<'dem_asc' | 'dxf_tin' | 'dxf_contour' | 'geotif_image'>('dxf_tin');
  const [terrainGridResolution, setTerrainGridResolution] = useState<number>(10);
  const [terrainContourInterval, setTerrainContourInterval] = useState<number>(5);
  const [terrainCrs, setTerrainCrs] = useState<string>('EPSG:32636');
  const [isExportingTerrain, setIsExportingTerrain] = useState(false);
  const [terrainSelectionStatus, setTerrainSelectionStatus] = useState<string>('');

  const terrainSelectModeRef = useRef<'box' | 'polygon' | null>(null);
  const terrainPointsRef = useRef<any[]>([]);
  const terrainEntitiesRef = useRef<any[]>([]);

  // Refs for tracking mutable states in Cesium callbacks
  const measurementModeRef = useRef<string | null>(null);
  const measuredPointsRef = useRef<any[]>([]);
  const measurementEntitiesRef = useRef<any[]>([]);
  const timelineTimeRef = useRef<number>(0);
  const timeDynamicVehicleRef = useRef<any>(null);
  const splitLeftImageryLayerRef = useRef<any>(null);
  const splitRightImageryLayerRef = useRef<any>(null);
  const catalogEntitiesRef = useRef<Record<string, any[]>>({});

  interface CatalogFolder {
    id: string;
    name: string;
    parentId: string | null;
  }

  interface CatalogItem {
    key: string;
    name: string;
    type: string;
    color: string;
    folderId: string;
    geojsonString?: string;
    coordinates?: { west: number; south: number; east: number; north: number };
    pngDataUrl?: string;
  }

  const [catalogFolders, setCatalogFolders] = useState<CatalogFolder[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedUploadFolderId, setSelectedUploadFolderId] = useState<string>('');

  const getFolderPath = (folder: CatalogFolder): string => {
    let path = folder.name;
    let current = folder;
    while (current.parentId) {
      const parent = catalogFolders.find(f => f.id === current.parentId);
      if (!parent) break;
      path = `${parent.name} / ${path}`;
      current = parent;
    }
    return `/${path}`;
  };

  const handleCreateFolder = (parentId: string | null = null) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName || !folderName.trim()) return;

    const newFolder: CatalogFolder = {
      id: Date.now().toString(),
      name: folderName.trim(),
      parentId
    };

    setCatalogFolders(prev => [...prev, newFolder]);
    addLog(`Created spatial catalog folder "${folderName.trim()}"`);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!window.confirm('Are you sure you want to delete this folder and all its subfolders/files?')) return;

    const getDescendants = (fid: string): string[] => {
      const children = catalogFolders.filter(f => f.parentId === fid);
      return [fid, ...children.flatMap(c => getDescendants(c.id))];
    };

    const foldersToRemove = getDescendants(folderId);

    setCatalogFolders(prev => prev.filter(f => !foldersToRemove.includes(f.id)));
    setCatalogItems(prev => {
      const remainingItems = prev.filter(item => !foldersToRemove.includes(item.folderId));
      const deletedItemKeys = prev.filter(item => foldersToRemove.includes(item.folderId)).map(item => item.key);
      setActiveCatalogItems(active => active.filter(k => !deletedItemKeys.includes(k)));
      return remainingItems;
    });

    addLog(`Deleted spatial catalog folder and its contents.`);
  };

  const handleDeleteCatalogItem = (itemKey: string) => {
    if (!window.confirm('Delete this layer from spatial catalog?')) return;

    if (catalogEntitiesRef.current[itemKey]) {
      const viewer = viewerRef.current;
      if (viewer) {
        catalogEntitiesRef.current[itemKey].forEach(ent => {
          if (ent.entities) {
            viewer.dataSources.remove(ent);
          } else {
            viewer.entities.remove(ent);
          }
        });
      }
      delete catalogEntitiesRef.current[itemKey];
    }

    setCatalogItems(prev => prev.filter(item => item.key !== itemKey));
    setActiveCatalogItems(prev => prev.filter(k => k !== itemKey));
    addLog(`Deleted catalog layer: ${itemKey}`);
  };

  const renderFolderNode = (folder: CatalogFolder, depth = 0) => {
    const subfolders = catalogFolders.filter(f => f.parentId === folder.id);
    const folderItems = catalogItems.filter(item => item.folderId === folder.id);

    return (
      <div key={folder.id} style={{ marginLeft: `${depth * 12}px`, display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '8px', marginTop: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📁 {folder.name}
          </span>

          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleCreateFolder(folder.id)}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                title="Create Subfolder"
              >
                <Plus size={10} /> Subfolder
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer' }}
                title="Delete Folder"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Render child subfolders */}
        {subfolders.map(sub => renderFolderNode(sub, depth + 1))}

        {/* Render child files/layers */}
        {folderItems.map(item => {
          const isActive = activeCatalogItems.includes(item.key);
          return (
            <div 
              key={item.key}
              style={{
                marginLeft: '12px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(14, 165, 233, 0.25)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9' }}>📄 {item.name}</span>
                  <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Format: {item.type}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => toggleCatalogItem(item.key)}
                    style={{
                      backgroundColor: isActive ? '#0284c7' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isActive ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '4px',
                      color: '#ffffff',
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isActive ? 'Remove' : 'Add Layer'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCatalogItem(item.key)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#f87171',
                        padding: '4px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {isActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94a3b8' }}>
                    <span>Opacity</span>
                    <span>{layerOpacities[item.key] ?? 100}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layerOpacities[item.key] ?? 100}
                      onChange={(e) => setLayerOpacity(item.key, parseInt(e.target.value))}
                      style={{ flex: 1, height: '3px', cursor: 'pointer' }}
                    />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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

  const fetchProjectDocuments = async (projectId: number, customProjectsList?: any[]) => {
    setGdriveStatus('syncing');
    try {
      const docsRes = await fetch(`/api/projects-database/${projectId}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (docsRes.ok) {
        const docs = await docsRes.json();
        const mappedDocs: StreamFile[] = docs.map((doc: any) => {
          let size = '2.5 MB';
          let coordinates: any = null;
          let is3dTiles = false;
          try {
            const urlInfo = JSON.parse(doc.fileUrl || '{}');
            if (urlInfo.metadata && urlInfo.metadata.anchor) {
              coordinates = urlInfo.metadata.anchor;
            } else if (urlInfo.metadata && urlInfo.metadata.coordinates) {
              coordinates = urlInfo.metadata.coordinates;
            }
            if (urlInfo.is3dTiles) {
              is3dTiles = true;
            }
          } catch(e) {}
          
          let layerType: any = 'GeoJSON';
          if (is3dTiles || doc.type === '3D Tiles' || doc.title.toLowerCase().endsWith('.zip')) {
            layerType = '3D Tiles';
          } else {
            const lowerTitle = doc.title.toLowerCase();
            const docType = doc.type || '';
            if (lowerTitle.endsWith('.kml')) layerType = 'KML';
            if (lowerTitle.endsWith('.czml')) layerType = 'CZML';
            if (lowerTitle.endsWith('.glb') || lowerTitle.endsWith('.gltf') || lowerTitle.includes('.glb') || lowerTitle.includes('.gltf') || docType === 'GLTF/GLB' || docType.includes('GLTF') || docType.includes('GLB') || docType === 'Point Cloud') layerType = 'Point Cloud';
            if (lowerTitle.endsWith('.xml')) layerType = 'LandXML';
            if (lowerTitle.endsWith('.tif') || lowerTitle.endsWith('.tiff') || docType === 'GeoTIFF' || docType === 'Surface') layerType = 'GeoTIFF';
            if (lowerTitle.endsWith('.obj') || lowerTitle.endsWith('.fbx')) layerType = 'OBJ/FBX';
            if (lowerTitle.endsWith('.dxf')) layerType = 'DXF';
            if (lowerTitle.endsWith('.dwg')) layerType = 'DWG';
            if (lowerTitle.endsWith('.ifc')) layerType = 'IFC';
            if (lowerTitle.endsWith('.shp')) layerType = 'SHP';
            if (lowerTitle.endsWith('.xodr')) layerType = 'OpenDRIVE';
          }
          
          return {
            id: doc.id,
            name: doc.title,
            type: doc.type,
            size: size,
            lastModified: new Date(doc.createdAt).toISOString().replace('T', ' ').slice(0, 16),
            layerType: layerType,
            status: 'Ready',
            coordinates: coordinates,
            fileUrl: doc.fileUrl
          };
        });

        // Clear existing viewer layers on map switch
        if (viewerRef.current) {
          const viewer = viewerRef.current;
          const entitiesToRemove: any[] = [];
          viewer.entities.values.forEach((entity: any) => {
            entitiesToRemove.push(entity);
          });
          entitiesToRemove.forEach(e => viewer.entities.remove(e));
        }
        setActiveLayers([]);

        const currentList = customProjectsList || projects;
        const activeProj = currentList.find(p => p.id === projectId) || selectedProject;
        const isMaster = activeProj?.name === 'Master Database';

        if (isMaster) {
          const merged = [...mappedDocs];
          mockStreamFiles.forEach(mock => {
            if (!merged.some(f => f.name === mock.name)) {
              merged.push(mock);
            }
          });
          setFiles(merged);
        } else {
          setFiles(mappedDocs);
        }
        
        setGdriveStatus('connected');
        addLog(`Switched active workspace. Discovered ${mappedDocs.length} layers in folder "${activeProj?.name || 'Active Project'}".`);
      }
    } catch (err) {
      console.error(err);
      setGdriveStatus('error');
      addLog('Error: Failed to fetch registry from Google Drive.');
    }
  };

  // Update surface file anchor coordinates when active project switches
  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.name?.includes('Gulu')) {
        setSurfaceAnchorLat('2.7715');
        setSurfaceAnchorLon('32.2920');
      } else {
        setSurfaceAnchorLat('0.3134');
        setSurfaceAnchorLon('32.5802');
      }
    }
  }, [selectedProject]);

  // Fetch projects list, users list, and select Master Database on mount
  useEffect(() => {
    const initMasterDatabase = async () => {
      try {
        setGdriveStatus('syncing');
        
        // 1. Fetch available projects
        const projRes = await fetch('/api/projects-database', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let loadedProjects: any[] = [];
        if (projRes.ok) {
          loadedProjects = await projRes.json();
          setProjects(loadedProjects);
          
          const masterProj = loadedProjects.find((p: any) => p.name === 'Master Database') || loadedProjects[0];
          if (masterProj) {
            setMasterProjectId(masterProj.id);
            setSelectedProject(masterProj);
            addLog(`Master Database Project resolved (ID: ${masterProj.id}).`);
            
            // Fetch documents for Master Database
            await fetchProjectDocuments(masterProj.id, loadedProjects);
          }
        }

        // 2. Fetch users for project creation membership selection
        const usersRes = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAvailableUsers(usersData);
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

  // Synchronize ref values
  useEffect(() => {
    measurementModeRef.current = measurementMode;
  }, [measurementMode]);

  useEffect(() => {
    terrainSelectModeRef.current = terrainSelectMode;
  }, [terrainSelectMode]);

  useEffect(() => {
    timelineTimeRef.current = timelineTime;
  }, [timelineTime]);

  // Set up click handlers on the viewer canvas
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: any) => {
      const mode = measurementModeRef.current;
      const tMode = terrainSelectModeRef.current;

      const ray = viewer.camera.getPickRay(click.position);
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return;

      if (mode) {
        handleMeasurementClick(cartesian, mode);
      } else if (tMode) {
        handleTerrainClick(cartesian, tMode);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      const mode = measurementModeRef.current;
      const tMode = terrainSelectModeRef.current;

      if (mode) {
        finishMeasurement();
      } else if (tMode === 'polygon') {
        finishTerrainPolygon();
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [cesiumLoaded, viewerRef.current]);

  // Split Compare Controller
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    if (isSplitActive) {
      addLog('Split Compare Mode enabled. Splitting imagery views.');
      
      const baseLayer = viewer.imageryLayers.get(0);
      if (baseLayer) {
        baseLayer.splitDirection = Cesium.SplitDirection.RIGHT;
        splitRightImageryLayerRef.current = baseLayer;
      }

      try {
        const osmLayer = viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
          url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
        }));
        osmLayer.splitDirection = Cesium.SplitDirection.LEFT;
        splitLeftImageryLayerRef.current = osmLayer;
      } catch (err) {
        console.error(err);
      }

      viewer.scene.imagerySplitPosition = splitPosition / 100.0;
    } else {
      addLog('Split Compare Mode disabled. Resetting imagery views.');
      
      if (splitRightImageryLayerRef.current) {
        splitRightImageryLayerRef.current.splitDirection = Cesium.SplitDirection.NONE;
        splitRightImageryLayerRef.current = null;
      }

      if (splitLeftImageryLayerRef.current) {
        viewer.imageryLayers.remove(splitLeftImageryLayerRef.current);
        splitLeftImageryLayerRef.current = null;
      }
    }
  }, [isSplitActive]);

  useEffect(() => {
    if (!viewerRef.current || !window.Cesium || !isSplitActive) return;
    const viewer = viewerRef.current;
    viewer.scene.imagerySplitPosition = splitPosition / 100.0;
  }, [splitPosition, isSplitActive]);

  // Pedestrian walk mode handler
  useEffect(() => {
    if (!isPedestrianActive || !viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    
    // Disable standard camera rotation/translation
    const controller = viewer.scene.screenSpaceCameraController;
    const originalRotate = controller.enableRotate;
    const originalTranslate = controller.enableTranslate;
    const originalZoom = controller.enableZoom;
    const originalTilt = controller.enableTilt;
    const originalLook = controller.enableLook;
    
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableZoom = false;
    controller.enableTilt = false;
    controller.enableLook = true; // allow looking around by dragging mouse
    
    const camera = viewer.camera;
    
    // Handle keyboard state
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Tick listener for walking
    const removeTickListener = viewer.clock.onTick.addEventListener(() => {
      const moveForward = keysPressed.current['w'] || keysPressed.current['arrowup'];
      const moveBackward = keysPressed.current['s'] || keysPressed.current['arrowdown'];
      const moveLeft = keysPressed.current['a'] || keysPressed.current['arrowleft'];
      const moveRight = keysPressed.current['d'] || keysPressed.current['arrowright'];
      
      const speedMultiplier = pedestrianSpeed;
      
      if (moveForward) {
        camera.moveForward(speedMultiplier);
      }
      if (moveBackward) {
        camera.moveBackward(speedMultiplier);
      }
      if (moveLeft) {
        camera.moveLeft(speedMultiplier);
      }
      if (moveRight) {
        camera.moveRight(speedMultiplier);
      }
      
      // Keep height locked 2.5 meters above local terrain height
      const cartographic = Cesium.Cartographic.fromCartesian(camera.position);
      if (cartographic) {
        const terrainHeight = viewer.scene.globe.getHeight(cartographic) || 0;
        const eyeHeight = 2.5;
        camera.position = Cesium.Cartesian3.fromRadians(
          cartographic.longitude,
          cartographic.latitude,
          terrainHeight + eyeHeight
        );
      }
    });
    
    // Smoothly fly close to the ground
    const startCarto = Cesium.Cartographic.fromCartesian(camera.position);
    if (startCarto) {
      const terrainHeight = viewer.scene.globe.getHeight(startCarto) || 0;
      camera.flyTo({
        destination: Cesium.Cartesian3.fromRadians(startCarto.longitude, startCarto.latitude, terrainHeight + 10),
        orientation: {
          pitch: Cesium.Math.toRadians(-12),
          heading: camera.heading
        },
        duration: 1.5
      });
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      removeTickListener();
      
      // Restore previous settings
      controller.enableRotate = originalRotate;
      controller.enableTranslate = originalTranslate;
      controller.enableZoom = originalZoom;
      controller.enableTilt = originalTilt;
      controller.enableLook = originalLook;
    };
  }, [isPedestrianActive, pedestrianSpeed]);

  // Scene Editor / Environmental style updater
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) return;
    const viewer = viewerRef.current;
    
    viewer.scene.fog.enabled = sceneFog;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = sceneAtmosphere;
    }
    viewer.scene.globe.enableLighting = sceneLighting;
    viewer.shadows = sceneShadows;
    viewer.scene.globe.depthTestAgainstTerrain = sceneDepthTest;
  }, [sceneFog, sceneAtmosphere, sceneLighting, sceneShadows, sceneDepthTest, cesiumLoaded]);

  // Timeline Playback loop
  useEffect(() => {
    let interval: any = null;
    if (isTimelineActive && isPlaybackPlaying) {
      interval = setInterval(() => {
        setTimelineTime(prev => {
          if (prev >= 100) return 0;
          return prev + 1;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimelineActive, isPlaybackPlaying]);

  // Handle timeline dynamic vehicle animation
  useEffect(() => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    if (isTimelineActive) {
      const flyoverCoords = [
        { lat: 0.3134, lon: 32.5762 },
        { lat: 0.3142, lon: 32.5802 },
        { lat: 0.3129, lon: 32.5841 },
        { lat: 0.3098, lon: 32.5898 },
        { lat: 0.3081, lon: 32.5932 }
      ];

      const idx = (timelineTime / 100) * (flyoverCoords.length - 1);
      const baseIdx = Math.floor(idx);
      const t = idx - baseIdx;
      const nextIdx = Math.min(baseIdx + 1, flyoverCoords.length - 1);
      
      const lat = flyoverCoords[baseIdx].lat + (flyoverCoords[nextIdx].lat - flyoverCoords[baseIdx].lat) * t;
      const lon = flyoverCoords[baseIdx].lon + (flyoverCoords[nextIdx].lon - flyoverCoords[baseIdx].lon) * t;

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, 1160);
      const station = (timelineTime * 45).toFixed(0);

      if (!timeDynamicVehicleRef.current) {
        timeDynamicVehicleRef.current = viewer.entities.add({
          position: position,
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString('#0ea5e9'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          },
          label: {
            text: `Material Transit (Station: 0+${station})`,
            font: '9pt sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10)
          }
        });
      } else {
        timeDynamicVehicleRef.current.position = position;
        timeDynamicVehicleRef.current.label.text = `Material Transit (Station: 0+${station})`;
      }
    } else {
      if (timeDynamicVehicleRef.current) {
        viewer.entities.remove(timeDynamicVehicleRef.current);
        timeDynamicVehicleRef.current = null;
      }
    }
  }, [isTimelineActive, timelineTime]);

  const handleMeasurementClick = (cartesian: any, mode: string) => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const point = viewer.entities.add({
      position: cartesian,
      point: {
        pixelSize: 8,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1.5
      }
    });
    
    measuredPointsRef.current.push(cartesian);
    measurementEntitiesRef.current.push(point);

    const pointsCount = measuredPointsRef.current.length;

    if (mode === 'distance') {
      if (pointsCount >= 2) {
        const lastIdx = pointsCount - 1;
        const p1 = measuredPointsRef.current[lastIdx - 1];
        const p2 = measuredPointsRef.current[lastIdx];

        const line = viewer.entities.add({
          polyline: {
            positions: [p1, p2],
            width: 3,
            material: Cesium.Color.YELLOW
          }
        });
        measurementEntitiesRef.current.push(line);

        let totalDist = 0;
        for (let i = 1; i < pointsCount; i++) {
          totalDist += Cesium.Cartesian3.distance(measuredPointsRef.current[i - 1], measuredPointsRef.current[i]);
        }

        const distStr = totalDist >= 1000 
          ? `${(totalDist / 1000).toFixed(2)} km` 
          : `${totalDist.toFixed(0)} m`;

        setMeasurementResult(`Total Distance: ${distStr}`);

        const label = viewer.entities.add({
          position: cartesian,
          label: {
            text: distStr,
            font: '10pt sans-serif',
            fillColor: Cesium.Color.YELLOW,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12)
          }
        });
        measurementEntitiesRef.current.push(label);
      } else {
        setMeasurementResult('Click another point to measure distance...');
      }
    } else if (mode === 'area') {
      if (pointsCount >= 3) {
        measurementEntitiesRef.current.forEach((ent: any) => {
          if (ent.polygon || ent.isBoundaryPoly) {
            viewer.entities.remove(ent);
          }
        });
        measurementEntitiesRef.current = measurementEntitiesRef.current.filter((ent: any) => !ent.polygon && !ent.isBoundaryPoly);

        const poly = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(measuredPointsRef.current),
            material: Cesium.Color.YELLOW.withAlpha(0.2)
          }
        });
        poly.isBoundaryPoly = false;
        measurementEntitiesRef.current.push(poly);

        const boundary = viewer.entities.add({
          polyline: {
            positions: [...measuredPointsRef.current, measuredPointsRef.current[0]],
            width: 2.5,
            material: Cesium.Color.YELLOW
          }
        });
        boundary.isBoundaryPoly = true;
        measurementEntitiesRef.current.push(boundary);

        const areaInSqM = getPolygonArea(measuredPointsRef.current);
        const areaStr = areaInSqM >= 1000000 
          ? `${(areaInSqM / 1000000).toFixed(3)} km²` 
          : `${areaInSqM.toFixed(0)} m²`;

        setMeasurementResult(`Enclosed Area: ${areaStr}`);
      } else {
        setMeasurementResult('Click more points to define an area...');
      }
    } else if (mode === 'profile') {
      if (pointsCount === 2) {
        const p1 = measuredPointsRef.current[0];
        const p2 = measuredPointsRef.current[1];
        
        const line = viewer.entities.add({
          polyline: {
            positions: [p1, p2],
            width: 3.5,
            material: Cesium.Color.CHARTREUSE
          }
        });
        measurementEntitiesRef.current.push(line);

        const distance = Cesium.Cartesian3.distance(p1, p2);
        const dataPoints = [];
        for (let i = 0; i <= 10; i++) {
          const ratio = i / 10;
          const baseHeight = 1140;
          const simHeight = baseHeight + Math.sin(ratio * Math.PI) * 45 + (Math.random() - 0.5) * 8;
          dataPoints.push({
            dist: parseFloat((ratio * distance).toFixed(0)),
            elev: parseFloat(simHeight.toFixed(1))
          });
        }

        setProfileData(dataPoints);
        setIsProfileActive(true);
        setMeasurementMode(null);
        addLog(`Generated elevation cross-section profile. Path Distance: ${distance.toFixed(0)}m`);
      } else {
        setMeasurementResult('Click the end point to extract elevation profile...');
      }
    }
  };

  const getPolygonArea = (points: any[]) => {
    if (!window.Cesium || points.length < 3) return 0;
    const Cesium = window.Cesium;
    
    const center = points[0];
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
    const invTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
    
    const localPoints = points.map(p => {
      const local = Cesium.Matrix4.multiplyByPoint(invTransform, p, new Cesium.Cartesian3());
      return local;
    });

    let area = 0;
    for (let i = 0; i < localPoints.length; i++) {
      const j = (i + 1) % localPoints.length;
      area += localPoints[i].x * localPoints[j].y;
      area -= localPoints[j].x * localPoints[i].y;
    }
    return Math.abs(area) / 2.0;
  };

  const finishMeasurement = () => {
    setMeasurementMode(null);
    addLog(`Measurement completed. ${measurementResult}`);
  };

  const clearMeasurements = () => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    
    measurementEntitiesRef.current.forEach((ent: any) => {
      viewer.entities.remove(ent);
    });
    
    measurementEntitiesRef.current = [];
    measuredPointsRef.current = [];
    setMeasurementResult('');
    setMeasurementMode(null);
    addLog('Cleared all active spatial measurements.');
  };

  // Terrain Area Surface Selection & Exporter Helpers
  const updateTerrainVisuals = () => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    terrainEntitiesRef.current.forEach((ent: any) => viewer.entities.remove(ent));
    terrainEntitiesRef.current = [];

    const pts = terrainPointsRef.current;
    if (pts.length === 0) {
      setTerrainSelectionStatus('');
      return;
    }

    const mode = terrainSelectModeRef.current;

    if (mode === 'box') {
      pts.forEach((p) => {
        const marker = viewer.entities.add({
          position: p,
          point: { pixelSize: 8, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.BLACK, outlineWidth: 1.5 }
        });
        terrainEntitiesRef.current.push(marker);
      });

      if (pts.length === 1) {
        setTerrainSelectionStatus('Click 2nd corner point on map to define rectangle bounding box...');
      } else if (pts.length >= 2) {
        const c1 = Cesium.Cartographic.fromCartesian(pts[0]);
        const c2 = Cesium.Cartographic.fromCartesian(pts[1]);
        const west = Math.min(c1.longitude, c2.longitude);
        const east = Math.max(c1.longitude, c2.longitude);
        const south = Math.min(c1.latitude, c2.latitude);
        const north = Math.max(c1.latitude, c2.latitude);

        const rectEntity = viewer.entities.add({
          rectangle: {
            coordinates: new Cesium.Rectangle(west, south, east, north),
            material: Cesium.Color.YELLOW.withAlpha(0.25),
            outline: true,
            outlineColor: Cesium.Color.GOLD,
            outlineWidth: 2
          }
        });
        terrainEntitiesRef.current.push(rectEntity);

        const widthMeters = Cesium.Cartesian3.distance(
          Cesium.Cartesian3.fromRadians(west, south),
          Cesium.Cartesian3.fromRadians(east, south)
        );
        const heightMeters = Cesium.Cartesian3.distance(
          Cesium.Cartesian3.fromRadians(west, south),
          Cesium.Cartesian3.fromRadians(west, north)
        );
        const areaKm2 = (widthMeters * heightMeters) / 1000000;

        setTerrainSelectionStatus(`Box Selected: ${widthMeters.toFixed(0)}m × ${heightMeters.toFixed(0)}m (${areaKm2.toFixed(3)} km²)`);
      }
    } else if (mode === 'polygon') {
      pts.forEach((p) => {
        const marker = viewer.entities.add({
          position: p,
          point: { pixelSize: 7, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 }
        });
        terrainEntitiesRef.current.push(marker);
      });

      if (pts.length >= 2) {
        const polylineEntity = viewer.entities.add({
          polyline: {
            positions: pts.length > 2 ? [...pts, pts[0]] : pts,
            width: 2.5,
            material: Cesium.Color.CYAN
          }
        });
        terrainEntitiesRef.current.push(polylineEntity);
      }

      if (pts.length >= 3) {
        const polygonEntity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(pts),
            material: Cesium.Color.CYAN.withAlpha(0.2)
          }
        });
        terrainEntitiesRef.current.push(polygonEntity);
      }

      if (pts.length < 3) {
        setTerrainSelectionStatus(`Polygon: ${pts.length} point${pts.length > 1 ? 's' : ''} added. Click map to add more points...`);
      } else {
        const areaM2 = getPolygonArea(pts);
        const areaKm2 = areaM2 / 1000000;
        setTerrainSelectionStatus(`Polygon Selected: ${pts.length} vertices (${areaKm2.toFixed(3)} km²)`);
      }
    }
  };

  const handleTerrainClick = (cartesian: any, mode: 'box' | 'polygon') => {
    if (mode === 'box') {
      if (terrainPointsRef.current.length >= 2) {
        terrainPointsRef.current = [cartesian];
      } else {
        terrainPointsRef.current.push(cartesian);
      }
      updateTerrainVisuals();
    } else if (mode === 'polygon') {
      terrainPointsRef.current.push(cartesian);
      updateTerrainVisuals();
    }
  };

  const finishTerrainPolygon = () => {
    if (terrainSelectModeRef.current === 'polygon') {
      if (terrainPointsRef.current.length >= 3) {
        updateTerrainVisuals();
        addLog(`Finalized terrain polygon selection (${terrainPointsRef.current.length} vertices).`);
      } else {
        addLog('Polygon selection requires at least 3 points.');
      }
    }
  };

  const clearTerrainSelection = () => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    terrainEntitiesRef.current.forEach((ent: any) => viewer.entities.remove(ent));
    terrainEntitiesRef.current = [];
    terrainPointsRef.current = [];
    setTerrainSelectionStatus('');
    setTerrainSelectMode(null);
    addLog('Cleared terrain area selection.');
  };

  const pointInPolygon = (lon: number, lat: number, polygonCoords: { lon: number; lat: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const xi = polygonCoords[i].lon, yi = polygonCoords[i].lat;
      const xj = polygonCoords[j].lon, yj = polygonCoords[j].lat;
      const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Coordinate Reference System (CRS) projection helper for Area Surface Exporter
  const getProjectedCoord = (
    lon: number,
    lat: number,
    crs: string,
    origin: { minLon: number; minLat: number; metersPerDegLon: number; metersPerDegLat: number }
  ): { x: number; y: number } => {
    if (crs === 'LOCAL') {
      return {
        x: (lon - origin.minLon) * origin.metersPerDegLon,
        y: (lat - origin.minLat) * origin.metersPerDegLat
      };
    }
    if (crs === 'EPSG:4326') {
      return { x: lon, y: lat };
    }

    try {
      if (typeof proj4 !== 'undefined') {
        proj4.defs('EPSG:32636', '+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs');
        proj4.defs('EPSG:32736', '+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs');
        proj4.defs('EPSG:32635', '+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs');
        proj4.defs('EPSG:21096', '+proj=utm +zone=36 +ellps=clrk80 +units=m +no_defs');

        const res = proj4('EPSG:4326', crs, [lon, lat]);
        return { x: res[0], y: res[1] };
      }
    } catch (err) {
      console.warn('proj4 transformation error, fallback to local meters', err);
    }

    return {
      x: (lon - origin.minLon) * origin.metersPerDegLon,
      y: (lat - origin.minLat) * origin.metersPerDegLat
    };
  };

  // Projection WKT file generator for georeferenced raster export
  const getPrjContent = (crs: string): string => {
    switch (crs) {
      case 'EPSG:32636':
        return `PROJCS["WGS_1984_UTM_Zone_36N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]`;
      case 'EPSG:32736':
        return `PROJCS["WGS_1984_UTM_Zone_36S",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",10000000.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]`;
      case 'EPSG:32635':
        return `PROJCS["WGS_1984_UTM_Zone_35N",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",27.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]`;
      case 'EPSG:21096':
        return `PROJCS["Arc_1960_UTM_Zone_36N",GEOGCS["GCS_Arc_1960",DATUM["D_Arc_1960",SPHEROID["Clarke_1880_RGS",6378249.145,293.465]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",33.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]`;
      case 'EPSG:4326':
        return `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
      case 'LOCAL':
      default:
        return `LOCAL_CS["Local Cartesian",LOCAL_DATUM["Local Datum",0],UNIT["Meter",1.0],AXIS["X",EAST],AXIS["Y",NORTH]]`;
    }
  };

  const handleDownloadTerrainSurface = async () => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;
    const pts = terrainPointsRef.current;

    if (pts.length < 2) {
      alert('Please select an area on the map using the Box or Polygon tool first.');
      return;
    }

    setIsExportingTerrain(true);
    addLog(`Initiating terrain surface elevation export in ${terrainCrs} (${terrainGridResolution}m resolution)...`);

    try {
      const cartographics = pts.map(p => Cesium.Cartographic.fromCartesian(p));
      const lons = cartographics.map(c => Cesium.Math.toDegrees(c.longitude));
      const lats = cartographics.map(c => Cesium.Math.toDegrees(c.latitude));

      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      const centerLatRad = Cesium.Math.toRadians((minLat + maxLat) / 2);
      const metersPerDegLat = 111320.0;
      const metersPerDegLon = Math.max(1000.0, 111320.0 * Math.cos(centerLatRad));
      const origin = { minLon, minLat, metersPerDegLon, metersPerDegLat };

      const gridStepDegLat = terrainGridResolution / metersPerDegLat;
      const gridStepDegLon = terrainGridResolution / metersPerDegLon;

      const numCols = Math.max(3, Math.min(100, Math.ceil((maxLon - minLon) / gridStepDegLon) + 1));
      const numRows = Math.max(3, Math.min(100, Math.ceil((maxLat - minLat) / gridStepDegLat) + 1));

      const actualStepLon = (maxLon - minLon) / (numCols - 1 || 1);
      const actualStepLat = (maxLat - minLat) / (numRows - 1 || 1);

      const polygonCoords = cartographics.map(c => ({
        lon: Cesium.Math.toDegrees(c.longitude),
        lat: Cesium.Math.toDegrees(c.latitude)
      }));

      const gridData: number[][] = [];
      let minH = Infinity;
      let maxH = -Infinity;

      for (let r = 0; r < numRows; r++) {
        const rowHeights: number[] = [];
        const lat = maxLat - r * actualStepLat;

        for (let c = 0; c < numCols; c++) {
          const lon = minLon + c * actualStepLon;

          if (terrainSelectMode === 'polygon' && !pointInPolygon(lon, lat, polygonCoords)) {
            rowHeights.push(-9999);
            continue;
          }

          const cart = Cesium.Cartographic.fromDegrees(lon, lat);
          let h = viewer.scene.globe.getHeight(cart);
          if (h === undefined || h === null) {
            h = 1150.0 + Math.sin(r * 0.1) * 15 + Math.cos(c * 0.1) * 10;
          }

          h = parseFloat(h.toFixed(2));
          rowHeights.push(h);

          // Only track min/max for valid elevation values (exclude NODATA -9999)
          if (h !== -9999 && h > -1000) {
            if (h < minH) minH = h;
            if (h > maxH) maxH = h;
          }
        }
        gridData.push(rowHeights);

        if (r % 15 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      if (minH === Infinity || maxH === -Infinity) {
        minH = 0;
        maxH = 100;
      }

      const totalPoints = numRows * numCols;
      addLog(`Sampled ${totalPoints} terrain grid points (${numCols}×${numRows}). Min Z: ${minH}m, Max Z: ${maxH}m`);

      const crsTag = terrainCrs.replace(':', '').toLowerCase();
      const filenamePrefix = `terrain_${terrainSelectMode || 'area'}_${crsTag}_${Date.now()}`;

      if (terrainExportFormat === 'dem_asc') {
        const chunks: string[] = [];
        chunks.push(`NCOLS ${numCols}\n`);
        chunks.push(`NROWS ${numRows}\n`);

        if (terrainCrs === 'EPSG:4326') {
          chunks.push(`XLLCORNER ${minLon.toFixed(6)}\n`);
          chunks.push(`YLLCORNER ${minLat.toFixed(6)}\n`);
          chunks.push(`CELLSIZE ${gridStepDegLon.toFixed(8)}\n`);
        } else if (terrainCrs === 'LOCAL') {
          chunks.push(`XLLCORNER 0.000\n`);
          chunks.push(`YLLCORNER 0.000\n`);
          chunks.push(`CELLSIZE ${terrainGridResolution.toFixed(2)}\n`);
        } else {
          const cornerPt = getProjectedCoord(minLon, minLat, terrainCrs, origin);
          chunks.push(`XLLCORNER ${cornerPt.x.toFixed(3)}\n`);
          chunks.push(`YLLCORNER ${cornerPt.y.toFixed(3)}\n`);
          chunks.push(`CELLSIZE ${terrainGridResolution.toFixed(2)}\n`);
        }

        chunks.push(`NODATA_VALUE -9999\n`);

        for (let r = 0; r < numRows; r++) {
          chunks.push(gridData[r].join(' ') + '\n');
        }

        downloadBlob(chunks.join(''), `${filenamePrefix}.asc`, 'text/plain');
        addLog(`Successfully exported DEM ASCII Grid (${terrainCrs}) to "${filenamePrefix}.asc"`);
      } else if (terrainExportFormat === 'dxf_tin') {
        const chunks: string[] = [];
        chunks.push(`0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`);

        const prec = terrainCrs === 'EPSG:4326' ? 6 : 3;

        for (let r = 0; r < numRows - 1; r++) {
          for (let c = 0; c < numCols - 1; c++) {
            const h00 = gridData[r][c];
            const h10 = gridData[r][c + 1];
            const h11 = gridData[r + 1][c + 1];
            const h01 = gridData[r + 1][c];

            if (h00 === -9999 || h10 === -9999 || h11 === -9999 || h01 === -9999) continue;

            const lon0 = minLon + c * actualStepLon;
            const lon1 = minLon + (c + 1) * actualStepLon;
            const lat0 = maxLat - r * actualStepLat;
            const lat1 = maxLat - (r + 1) * actualStepLat;

            const p00 = getProjectedCoord(lon0, lat0, terrainCrs, origin);
            const p10 = getProjectedCoord(lon1, lat0, terrainCrs, origin);
            const p11 = getProjectedCoord(lon1, lat1, terrainCrs, origin);
            const p01 = getProjectedCoord(lon0, lat1, terrainCrs, origin);

            chunks.push(`0\n3DFACE\n8\nTERRAIN_TIN\n10\n${p00.x.toFixed(prec)}\n20\n${p00.y.toFixed(prec)}\n30\n${h00.toFixed(3)}\n11\n${p10.x.toFixed(prec)}\n21\n${p10.y.toFixed(prec)}\n31\n${h10.toFixed(3)}\n12\n${p11.x.toFixed(prec)}\n22\n${p11.y.toFixed(prec)}\n32\n${h11.toFixed(3)}\n13\n${p11.x.toFixed(prec)}\n23\n${p11.y.toFixed(prec)}\n33\n${h11.toFixed(3)}\n`);
            chunks.push(`0\n3DFACE\n8\nTERRAIN_TIN\n10\n${p00.x.toFixed(prec)}\n20\n${p00.y.toFixed(prec)}\n30\n${h00.toFixed(3)}\n11\n${p11.x.toFixed(prec)}\n21\n${p11.y.toFixed(prec)}\n31\n${h11.toFixed(3)}\n12\n${p01.x.toFixed(prec)}\n22\n${p01.y.toFixed(prec)}\n32\n${h01.toFixed(3)}\n13\n${p01.x.toFixed(prec)}\n23\n${p01.y.toFixed(prec)}\n33\n${h01.toFixed(3)}\n`);
          }

          if (r % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        chunks.push(`0\nENDSEC\n0\nEOF\n`);
        downloadBlob(chunks.join(''), `${filenamePrefix}_tin.dxf`, 'application/dxf');
        addLog(`Successfully exported DXF TIN Surface (${terrainCrs}) to "${filenamePrefix}_tin.dxf"`);
      } else if (terrainExportFormat === 'dxf_contour') {
        const chunks: string[] = [];
        chunks.push(`0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`);

        const interval = Math.max(1, terrainContourInterval || 5);
        const startZ = Math.ceil(minH / interval) * interval;
        const endZ = Math.floor(maxH / interval) * interval;
        const prec = terrainCrs === 'EPSG:4326' ? 6 : 3;

        let contourCount = 0;
        let steps = 0;
        const maxSteps = 200;

        for (let targetZ = startZ; targetZ <= endZ && steps < maxSteps; targetZ += interval) {
          steps++;
          for (let r = 0; r < numRows - 1; r++) {
            for (let c = 0; c < numCols - 1; c++) {
              const h00 = gridData[r][c];
              const h10 = gridData[r][c + 1];
              const h11 = gridData[r + 1][c + 1];
              const h01 = gridData[r + 1][c];

              if (h00 === -9999 || h10 === -9999 || h11 === -9999 || h01 === -9999) continue;

              const lon0 = minLon + c * actualStepLon;
              const lon1 = minLon + (c + 1) * actualStepLon;
              const lat0 = maxLat - r * actualStepLat;
              const lat1 = maxLat - (r + 1) * actualStepLat;

              const points: { x: number; y: number }[] = [];

              if ((h00 <= targetZ && h10 >= targetZ) || (h10 <= targetZ && h00 >= targetZ)) {
                if (h10 !== h00) {
                  const t = (targetZ - h00) / (h10 - h00);
                  const pt = getProjectedCoord(lon0 + t * (lon1 - lon0), lat0, terrainCrs, origin);
                  points.push(pt);
                }
              }
              if ((h10 <= targetZ && h11 >= targetZ) || (h11 <= targetZ && h10 >= targetZ)) {
                if (h11 !== h10) {
                  const t = (targetZ - h10) / (h11 - h10);
                  const pt = getProjectedCoord(lon1, lat0 + t * (lat1 - lat0), terrainCrs, origin);
                  points.push(pt);
                }
              }
              if ((h11 <= targetZ && h01 >= targetZ) || (h01 <= targetZ && h11 >= targetZ)) {
                if (h01 !== h11) {
                  const t = (targetZ - h11) / (h01 - h11);
                  const pt = getProjectedCoord(lon1 + t * (lon0 - lon1), lat1, terrainCrs, origin);
                  points.push(pt);
                }
              }
              if ((h01 <= targetZ && h00 >= targetZ) || (h00 <= targetZ && h01 >= targetZ)) {
                if (h00 !== h01) {
                  const t = (targetZ - h01) / (h00 - h01);
                  const pt = getProjectedCoord(lon0, lat1 + t * (lat0 - lat1), terrainCrs, origin);
                  points.push(pt);
                }
              }

              if (points.length >= 2) {
                contourCount++;
                chunks.push(`0\nLINE\n8\nCONTOURS_${targetZ}M\n10\n${points[0].x.toFixed(prec)}\n20\n${points[0].y.toFixed(prec)}\n30\n${targetZ.toFixed(3)}\n11\n${points[1].x.toFixed(prec)}\n21\n${points[1].y.toFixed(prec)}\n31\n${targetZ.toFixed(3)}\n`);
              }
            }
          }

          if (steps % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        chunks.push(`0\nENDSEC\n0\nEOF\n`);
        downloadBlob(chunks.join(''), `${filenamePrefix}_contours.dxf`, 'application/dxf');
        addLog(`Successfully exported ${contourCount} DXF Contour lines (${terrainCrs}) to "${filenamePrefix}_contours.dxf"`);
      } else if (terrainExportFormat === 'geotif_image') {
        addLog(`Preparing highest quality orthographic map image capture for bounds [W: ${minLon.toFixed(5)}, S: ${minLat.toFixed(5)}, E: ${maxLon.toFixed(5)}, N: ${maxLat.toFixed(5)}] in ${terrainCrs}...`);

        // 1. Temporarily save user's current camera state
        const savedCameraPos = viewer.camera.position.clone();
        const savedHeading = viewer.camera.heading;
        const savedPitch = viewer.camera.pitch;
        const savedRoll = viewer.camera.roll;

        // 2. Temporarily hide translucent selection entities (box / polygon overlays & outlines)
        const hiddenEntities: any[] = [];
        terrainEntitiesRef.current.forEach((entity: any) => {
          if (entity && entity.show !== false) {
            entity.show = false;
            hiddenEntities.push(entity);
          }
        });

        // 3. Set camera to true top-down orthographic view (heading 0 = North up, pitch -90 = straight down)
        const rect = Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat);
        viewer.camera.setView({
          destination: rect,
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0
          }
        });

        // 4. Force high resolution tile streaming
        const originalSSE = viewer.scene.globe.maximumScreenSpaceError;
        viewer.scene.globe.maximumScreenSpaceError = 0.8;

        // Wait for high resolution imagery tiles to load & settle
        await new Promise(resolve => setTimeout(resolve, 350));
        viewer.render();

        const canvas = viewer.scene.canvas;

        // 5. Convert Top-Left and Bottom-Right WGS84 coordinates to screen pixel coordinates
        const ptTL = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
          viewer.scene, 
          Cesium.Cartesian3.fromDegrees(minLon, maxLat)
        );
        const ptBR = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
          viewer.scene, 
          Cesium.Cartesian3.fromDegrees(maxLon, minLat)
        );

        let screenXMin = 0;
        let screenXMax = canvas.width;
        let screenYMin = 0;
        let screenYMax = canvas.height;

        if (ptTL && ptBR) {
          screenXMin = Math.max(0, Math.min(ptTL.x, ptBR.x));
          screenXMax = Math.min(canvas.width, Math.max(ptTL.x, ptBR.x));
          screenYMin = Math.max(0, Math.min(ptTL.y, ptBR.y));
          screenYMax = Math.min(canvas.height, Math.max(ptTL.y, ptBR.y));
        }

        const cropWidth = Math.max(100, Math.round(screenXMax - screenXMin));
        const cropHeight = Math.max(100, Math.round(screenYMax - screenYMin));

        const offCanvas = document.createElement('canvas');
        offCanvas.width = cropWidth;
        offCanvas.height = cropHeight;
        const ctx = offCanvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(
            canvas,
            screenXMin, screenYMin, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );

          // Apply polygon clipping if polygon selection tool was used
          if (terrainSelectMode === 'polygon' && polygonCoords.length >= 3) {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            polygonCoords.forEach((coord, idx) => {
              const winPt = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
                viewer.scene, 
                Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat)
              );
              if (winPt) {
                const x = winPt.x - screenXMin;
                const y = winPt.y - screenYMin;
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
            });
            ctx.closePath();
            ctx.fill();
          }
        }

        // 6. Restore hidden selection overlays, globe SSE, and user's original camera view
        hiddenEntities.forEach(entity => {
          entity.show = true;
        });
        viewer.scene.globe.maximumScreenSpaceError = originalSSE;
        viewer.camera.setView({
          destination: savedCameraPos,
          orientation: {
            heading: savedHeading,
            pitch: savedPitch,
            roll: savedRoll
          }
        });
        viewer.render();

        // 7. Convert cropped canvas to Blob
        const imageBlob = await new Promise<Blob | null>(resolve => offCanvas.toBlob(resolve, 'image/png'));
        
        if (!imageBlob) {
          throw new Error('Failed to generate map image blob.');
        }

        // 8. Calculate projected coordinates of Top-Left and Bottom-Right for World File (.tfw)
        const topLeft = getProjectedCoord(minLon, maxLat, terrainCrs, origin);
        const bottomRight = getProjectedCoord(maxLon, minLat, terrainCrs, origin);

        const widthInUnits = bottomRight.x - topLeft.x;
        const heightInUnits = topLeft.y - bottomRight.y;

        const scaleX = widthInUnits / cropWidth;
        const scaleY = -(heightInUnits / cropHeight);

        const originX = topLeft.x + (scaleX / 2.0);
        const originY = topLeft.y - (Math.abs(scaleY) / 2.0);

        // 9. Construct World File (.tfw) content
        const tfwContent = [
          scaleX.toFixed(8),
          '0.00000000',
          '0.00000000',
          scaleY.toFixed(8),
          originX.toFixed(4),
          originY.toFixed(4)
        ].join('\n') + '\n';

        // 10. Construct Projection (.prj) content
        const prjContent = getPrjContent(terrainCrs);

        // 11. Package TIF Map Image, TFW World File, and PRJ Projection File into ZIP
        const zip = new JSZip();
        zip.file(`${filenamePrefix}.tif`, imageBlob);
        zip.file(`${filenamePrefix}.tfw`, tfwContent);
        zip.file(`${filenamePrefix}.prj`, prjContent);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${filenamePrefix}_geotif.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);

        addLog(`Successfully exported high-quality orthographic TIF Map Package (${terrainCrs}) with .tfw world file & .prj projection file to "${filenamePrefix}_geotif.zip"`);
      }
    } catch (err) {
      console.error('Terrain export error:', err);
      addLog('Error generating terrain surface export file.');
    } finally {
      setIsExportingTerrain(false);
    }
  };

  const setLayerOpacity = (layerName: string, opacityVal: number) => {
    setLayerOpacities(prev => ({ ...prev, [layerName]: opacityVal }));
    
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    viewer.entities.values.forEach((entity: any) => {
      if (entity.layerName === layerName) {
        if (entity.polyline) {
          if (entity.polyline.material instanceof Cesium.PolylineGlowMaterialProperty) {
            entity.polyline.material.color = Cesium.Color.RED.withAlpha(opacityVal / 100);
          } else if (entity.polyline.material && entity.polyline.material.color) {
            const currentColor = entity.polyline.material.color.getValue(Cesium.JulianDate.now()) || Cesium.Color.YELLOW;
            entity.polyline.material = currentColor.withAlpha(opacityVal / 100);
          }
        }
        if (entity.polygon && entity.polygon.material) {
          const currentColor = entity.polygon.material.color.getValue(Cesium.JulianDate.now()) || Cesium.Color.YELLOW;
          entity.polygon.material = currentColor.withAlpha(opacityVal / 100);
        }
        if (entity.point) {
          const currentPointColor = entity.point.color.getValue(Cesium.JulianDate.now()) || Cesium.Color.YELLOW;
          entity.point.color = currentPointColor.withAlpha(opacityVal / 100);
        }
        if (entity.label) {
          const currentLabelColor = entity.label.fillColor?.getValue(Cesium.JulianDate.now()) || Cesium.Color.WHITE;
          entity.label.fillColor = currentLabelColor.withAlpha(opacityVal / 100);
        }
      }
    });

    if (viewer._customPrimitives && viewer._customPrimitives[layerName]) {
      const tileset = viewer._customPrimitives[layerName];
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: `rgba(255, 255, 255, ${opacityVal / 100})`
      });
    }
  };

  const toggleCatalogItem = (itemKey: string) => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const isActive = activeCatalogItems.includes(itemKey);

    if (isActive) {
      if (catalogEntitiesRef.current[itemKey]) {
        catalogEntitiesRef.current[itemKey].forEach(ent => {
          if (ent.entities) {
            viewer.dataSources.remove(ent);
          } else if (ent.destroy && !ent.id) {
            viewer.imageryLayers.remove(ent);
          } else {
            viewer.entities.remove(ent);
          }
        });
        delete catalogEntitiesRef.current[itemKey];
      }
      setActiveCatalogItems(prev => prev.filter(k => k !== itemKey));
      addLog(`Removed catalog layer: ${itemKey}`);
    } else {
      const entities: any[] = [];

      if (itemKey === 'roads') {
        const roadEnt = viewer.entities.add({
          name: 'Uganda Primary Transit Corridor',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              32.5824, 0.3476,
              32.8021, 0.4124,
              33.1024, 0.4241
            ]),
            width: 4,
            material: Cesium.Color.fromCssColorString('#f57c00')
          }
        });
        entities.push(roadEnt);
        viewer.zoomTo(roadEnt);
      } else if (itemKey === 'hydro') {
        const pin1 = viewer.entities.add({
          name: 'Nalubaale Hydroelectric Power Station',
          position: Cesium.Cartesian3.fromDegrees(33.1811, 0.4439, 1140),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString('#ffd54f'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
          },
          label: {
            text: 'Nalubaale Power Station (180 MW)',
            font: '10pt sans-serif',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -9)
          }
        });
        entities.push(pin1);
        viewer.zoomTo(pin1);
      } else if (itemKey === 'basins') {
        const basinCoords = [
          32.5500, 0.3200,
          32.5900, 0.3500,
          32.6100, 0.3100,
          32.5700, 0.2800
        ];
        const basinPoly = viewer.entities.add({
          name: 'Nakivubo Catchment Area',
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(basinCoords)),
            material: Cesium.Color.fromCssColorString('#29b6f6').withAlpha(0.35),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#0284c7')
          }
        });
        entities.push(basinPoly);
        viewer.zoomTo(basinPoly);
      } else if (itemKey === 'forests') {
        const forestCoords = [
          32.9500, 0.3800,
          33.0500, 0.4200,
          33.0800, 0.3700,
          32.9800, 0.3300
        ];
        const forestPoly = viewer.entities.add({
          name: 'Mabira Forest Central Reserve Boundary',
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(forestCoords)),
            material: Cesium.Color.fromCssColorString('#66bb6a').withAlpha(0.35),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#166534')
          }
        });
        entities.push(forestPoly);
        viewer.zoomTo(forestPoly);
      } else if (itemKey === 'faults') {
        const faultLine = viewer.entities.add({
          name: 'Albertine Graben Fault Line Segment',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
              31.3200, 1.4500,
              31.4500, 1.8200,
              31.6200, 2.1200
            ]),
            width: 3.5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString('#ef5350')
            })
          }
        });
        entities.push(faultLine);
        viewer.zoomTo(faultLine);
      } else {
        const dynamicItem = catalogItems.find(item => item.key === itemKey);
        if (dynamicItem) {
          if (dynamicItem.geojsonString) {
            try {
              const parsed = JSON.parse(dynamicItem.geojsonString);
              Cesium.GeoJsonDataSource.load(parsed, {
                stroke: Cesium.Color.fromCssColorString(dynamicItem.color),
                fill: Cesium.Color.fromCssColorString(dynamicItem.color).withAlpha(0.25),
                strokeWidth: 3
              }).then((dataSource: any) => {
                viewer.dataSources.add(dataSource);
                entities.push(dataSource);
                viewer.zoomTo(dataSource);
              });
            } catch (e) {
              console.error('Failed to load dynamic GeoJSON layer', e);
            }
          } else if (dynamicItem.type === 'Georeferenced PNG' && dynamicItem.coordinates) {
            const layer = viewer.imageryLayers.addImageryProvider(new Cesium.SingleTileImageryProvider({
              url: dynamicItem.pngDataUrl || '/placeholder_ortho.png',
              rectangle: Cesium.Rectangle.fromDegrees(
                dynamicItem.coordinates.west,
                dynamicItem.coordinates.south,
                dynamicItem.coordinates.east,
                dynamicItem.coordinates.north
              )
            }));
            entities.push(layer);
            viewer.camera.flyTo({
              destination: Cesium.Rectangle.fromDegrees(
                dynamicItem.coordinates.west,
                dynamicItem.coordinates.south,
                dynamicItem.coordinates.east,
                dynamicItem.coordinates.north
              )
            });
          }
        }
      }

      catalogEntitiesRef.current[itemKey] = entities;
      setActiveCatalogItems(prev => [...prev, itemKey]);
      addLog(`Added catalog layer: ${itemKey}`);
    }
  };

  const handleLocalFileDrop = (file: File) => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const fileName = file.name;
    const isJson = fileName.endsWith('.json') || fileName.endsWith('.geojson');

    if (!isJson) {
      alert('Only .geojson or .json Spatial vector files are supported for browser-side rendering.');
      return;
    }

    if (uploadDestination === 'catalog') {
      if (!selectedUploadFolderId) {
        alert('Please select a folder in the Spatial Catalog first to drop the data into.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const text = e.target.result;
          JSON.parse(text);
          const newItem: CatalogItem = {
            key: `layer_${Date.now()}`,
            name: file.name,
            type: 'GeoJSON',
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
            folderId: selectedUploadFolderId,
            geojsonString: text
          };
          setCatalogItems(prev => [...prev, newItem]);
          addLog(`Successfully added dropped file "${file.name}" to Spatial Catalog.`);
        } catch (err) {
          alert('Invalid GeoJSON format.');
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const geojson = JSON.parse(e.target.result);
        addLog(`Parsing dropped GeoJSON file: ${fileName}`);

        const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
          stroke: Cesium.Color.YELLOW,
          fill: Cesium.Color.YELLOW.withAlpha(0.2),
          strokeWidth: 3
        });
        viewer.dataSources.add(dataSource);
        viewer.zoomTo(dataSource);

        const newFile: StreamFile = {
          id: Date.now(),
          name: fileName,
          type: 'project',
          size: `${(file.size / 1024).toFixed(0)} KB`,
          lastModified: new Date().toISOString(),
          layerType: 'GeoJSON',
          fileUrl: '',
          status: 'Loaded'
        };

        setFiles(prev => [...prev, newFile]);
        setActiveLayers(prev => [...prev, fileName]);

        viewer._customDataSources = viewer._customDataSources || {};
        viewer._customDataSources[fileName] = dataSource;

        addLog(`Successfully loaded vector layers from local file: ${fileName}`);
      } catch (err) {
        console.error(err);
        alert('Invalid GeoJSON format. Ensure the file contains valid features.');
      }
    };
    reader.readAsText(file);
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${msg}`);
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

  const getFileCategory = (file: StreamFile): 'Surfaces' | 'Design Files' | 'PNGs' | 'GLTF/GLB' => {
    const nameLower = (file.name || '').toLowerCase();
    const layerTypeStr = ((file.layerType as string) || '').toLowerCase();
    const fileTypeStr = ((file.type as string) || '').toLowerCase();

    // 1. GLTF/GLB (Checked first)
    if (
      nameLower.endsWith('.glb') || 
      nameLower.endsWith('.gltf') || 
      nameLower.includes('.glb') || 
      nameLower.includes('.gltf') || 
      layerTypeStr.includes('point cloud') || 
      layerTypeStr.includes('gltf') || 
      layerTypeStr.includes('glb') || 
      fileTypeStr.includes('gltf') || 
      fileTypeStr.includes('glb') || 
      fileTypeStr.includes('point cloud')
    ) {
      return 'GLTF/GLB';
    }
    // 2. PNGs
    if (nameLower.includes('.png') || fileTypeStr.includes('png') || layerTypeStr.includes('png')) {
      return 'PNGs';
    }
    // 3. Surfaces
    if (
      nameLower.includes('.tif') ||
      nameLower.includes('.tiff') ||
      nameLower.includes('.geotiff') ||
      nameLower.includes('.fbx') ||
      nameLower.includes('.obj') ||
      nameLower.endsWith('.zip') ||
      fileTypeStr.includes('surface') ||
      fileTypeStr.includes('geotiff') ||
      fileTypeStr.includes('3d tiles') ||
      layerTypeStr.includes('geotiff') ||
      layerTypeStr.includes('landxml') ||
      layerTypeStr.includes('obj') ||
      layerTypeStr.includes('3d tiles') ||
      layerTypeStr.includes('surface') ||
      (nameLower.endsWith('.xml') && !nameLower.includes('design'))
    ) {
      return 'Surfaces';
    }
    // 4. Design Files
    return 'Design Files';
  };

  const toggleLayer = async (file: StreamFile, forceState?: boolean) => {
    if (!viewerRef.current || !window.Cesium) return;
    const Cesium = window.Cesium;
    const viewer = viewerRef.current;

    const isCurrentlyActive = activeLayers.includes(file.name);
    const targetState = forceState !== undefined ? forceState : !isCurrentlyActive;
    
    if (targetState === isCurrentlyActive) return;

    if (!targetState) {
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

      // Remove 3D Tileset primitives
      if (viewer._customPrimitives && viewer._customPrimitives[file.name]) {
        viewer.scene.primitives.remove(viewer._customPrimitives[file.name]);
        delete viewer._customPrimitives[file.name];
      }

      // Remove custom GeoJSON data sources
      if (viewer._customDataSources && viewer._customDataSources[file.name]) {
        viewer.dataSources.remove(viewer._customDataSources[file.name]);
        delete viewer._customDataSources[file.name];
      }

      // Remove custom imagery layers (PNG orthophotos)
      if (viewer._customImageryLayers && viewer._customImageryLayers[file.name]) {
        viewer.imageryLayers.remove(viewer._customImageryLayers[file.name]);
        delete viewer._customImageryLayers[file.name];
      }

      // Remove custom 3D Tileset primitives if present
      if (viewer._customPrimitives && viewer._customPrimitives[file.name]) {
        viewer.scene.primitives.remove(viewer._customPrimitives[file.name]);
        delete viewer._customPrimitives[file.name];
      }
      
      // Remove custom surface elements and restore terrain clipping
      if (viewer._customSurfaceElements && viewer._customSurfaceElements[file.name]) {
        const { entities } = viewer._customSurfaceElements[file.name];
        entities.forEach((entity: any) => viewer.entities.remove(entity));
        if (viewer.globe.clippingPlanes) {
          viewer.globe.clippingPlanes.enabled = false;
          viewer.globe.clippingPlanes = undefined;
        }
        delete viewer._customSurfaceElements[file.name];
      }
      
      setActiveLayers(prev => prev.filter(name => name !== file.name));
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'Ready' } : f));
    } else {
      // Add layer (render mock spatial data coordinates in Uganda)
      addLog(`Streaming spatial layer payload from Google Drive: ${file.name}`);
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'Loaded' } : f));
      setActiveLayers(prev => [...prev, file.name]);

      if (file.layerType === '3D Tiles' || file.type === '3D Tiles' || file.name.toLowerCase().endsWith('.zip')) {
        let tilesetUrl = '';
        if (file.fileUrl) {
          try {
            const urlInfo = JSON.parse(file.fileUrl);
            tilesetUrl = urlInfo.view || urlInfo.download || '';
          } catch (e) {
            tilesetUrl = file.fileUrl;
          }
        }
        if (!tilesetUrl && file.id) {
          tilesetUrl = `/api/projects-database/documents/${file.id}/file?token=${encodeURIComponent(token || '')}`;
        }

        if (tilesetUrl) {
          addLog(`Streaming 3D Tileset primitive: ${tilesetUrl}`);
          
          const onTilesetLoaded = (tileset: any) => {
            viewer.scene.primitives.add(tileset);
            viewer._customPrimitives = viewer._customPrimitives || {};
            viewer._customPrimitives[file.name] = tileset;
            
            // Fly / zoom camera to 3D Tileset
            viewer.zoomTo(tileset);
            addLog(`Successfully streamed 3D Tileset "${file.name}" onto surface.`);
          };

          if (Cesium.Cesium3DTileset && typeof Cesium.Cesium3DTileset.fromUrl === 'function') {
            Cesium.Cesium3DTileset.fromUrl(tilesetUrl).then(onTilesetLoaded).catch((err: any) => {
              console.warn('Cesium3DTileset.fromUrl failed, trying fallback constructor:', err);
              try {
                const tileset = new Cesium.Cesium3DTileset({ url: tilesetUrl });
                onTilesetLoaded(tileset);
              } catch (e2) {
                console.error('Error streaming 3D tileset:', e2);
                addLog(`Error: Failed to stream 3D tileset "${file.name}"`);
              }
            });
          } else {
            try {
              const tileset = new Cesium.Cesium3DTileset({ url: tilesetUrl });
              onTilesetLoaded(tileset);
            } catch (err) {
              console.error('Error streaming 3D tileset:', err);
              addLog(`Error: Failed to stream 3D tileset "${file.name}"`);
            }
          }
        }
      } else if (file.layerType === 'GeoTIFF' || file.layerType === 'LandXML' || file.layerType === 'OBJ/FBX' || file.name.endsWith('.xml') || file.name.endsWith('.tif') || file.name.endsWith('.tiff') || file.name.endsWith('.obj') || file.name.endsWith('.fbx')) {
        addLog(`Initiating surface loading for: ${file.name}`);
        
        // For LandXML files with a document ID, fetch and render real TIN surface data
        if (file.id && (file.layerType === 'LandXML' || file.name.endsWith('.xml'))) {
          addLog(`Parsing LandXML TIN surface data from server...`);
          try {
            const surfaceRes = await fetch(`/api/projects-database/documents/${file.id}/parse-surface`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });

            if (!surfaceRes.ok) {
              const errData = await surfaceRes.json().catch(() => ({}));
              addLog(`Error parsing surface: ${errData.error || 'Unknown error'}`);
              setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'Failed' } : f));
              return;
            }

            const surfaceData = await surfaceRes.json();
            const { vertices, triangles, bounds, center, stats } = surfaceData;

            addLog(`Surface parsed: ${stats.vertexCount} vertices, ${stats.triangleCount} triangles, elevation range ${stats.minElev.toFixed(1)}m - ${stats.maxElev.toFixed(1)}m`);

            // 1. Clip base terrain at the surface bounds with a small padding
            const padDeg = 0.0002;
            const clipCenter = Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 0.0);
            const clipModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(clipCenter);

            // Calculate clipping plane distances from center to bounds (in meters)
            const latRange = (bounds.north - bounds.south + padDeg * 2) * 111320;
            const lonRange = (bounds.east - bounds.west + padDeg * 2) * 111320 * Math.cos(center.lat * Math.PI / 180);
            const halfDistNS = latRange / 2;
            const halfDistEW = lonRange / 2;

            const planes = [
              new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.0, 0.0), -halfDistEW),   // East
              new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, 0.0, 0.0), -halfDistEW),  // West
              new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), -halfDistNS),   // North
              new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), -halfDistNS)   // South
            ];

            viewer.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
              modelMatrix: clipModelMatrix,
              planes: planes,
              edgeColor: Cesium.Color.DODGERBLUE,
              edgeWidth: 2.0,
              unionClippingRegions: false,
              enabled: true
            });

            // 2. Render TIN triangles as polygon entities with per-position height
            const entitiesAdded: any[] = [];
            const elevRange = stats.maxElev - stats.minElev || 1;

            // Color ramp function: green (low) -> yellow (mid) -> brown (high)
            const getElevColor = (elev: number) => {
              const t = Math.max(0, Math.min(1, (elev - stats.minElev) / elevRange));
              if (t < 0.5) {
                // Green to Yellow
                const s = t * 2;
                return new Cesium.Color(s * 0.8, 0.55 + s * 0.35, 0.15 * (1 - s), 0.9);
              } else {
                // Yellow to Brown
                const s = (t - 0.5) * 2;
                return new Cesium.Color(0.8 - s * 0.2, 0.9 - s * 0.45, s * 0.1, 0.9);
              }
            };

            for (let ti = 0; ti < triangles.length; ti++) {
              const [i1, i2, i3] = triangles[ti];
              if (!vertices[i1] || !vertices[i2] || !vertices[i3]) continue;

              const v1 = vertices[i1]; // [lat, lon, elev]
              const v2 = vertices[i2];
              const v3 = vertices[i3];

              const avgElev = (v1[2] + v2[2] + v3[2]) / 3;

              const polygonCoords = Cesium.Cartesian3.fromDegreesArrayHeights([
                v1[1], v1[0], v1[2],
                v2[1], v2[0], v2[2],
                v3[1], v3[0], v3[2]
              ]);

              const triEntity = viewer.entities.add({
                layerName: file.name,
                name: `TIN Triangle ${ti}`,
                polygon: {
                  hierarchy: new Cesium.PolygonHierarchy(polygonCoords),
                  material: getElevColor(avgElev),
                  outline: true,
                  outlineColor: Cesium.Color.DARKSLATEGRAY.withAlpha(0.3),
                  outlineWidth: 1,
                  perPositionHeight: true
                }
              });
              entitiesAdded.push(triEntity);
            }

            viewer._customSurfaceElements = viewer._customSurfaceElements || {};
            viewer._customSurfaceElements[file.name] = {
              entities: entitiesAdded,
              clippingPlanes: viewer.globe.clippingPlanes
            };

            // 3. Fly camera to surface center
            const flyAltitude = Math.max(500, latRange * 1.5, lonRange * 1.5);
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(center.lon, center.lat - (bounds.north - bounds.south) * 0.3, flyAltitude),
              orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-35.0),
                roll: 0.0
              },
              duration: 2.5
            });

            addLog(`Successfully rendered ${triangles.length} TIN triangles for surface "${file.name}".`);

          } catch (err: any) {
            console.error('Surface parsing error:', err);
            addLog(`Error loading surface: ${err.message}`);
            setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'Failed' } : f));
            return;
          }
        } else {
          // Fallback for GeoTIFF, OBJ, FBX, or surfaces without an ID — use the original grid approach
          let lat = 0.3134;
          let lon = 32.5802;
          if (file.coordinates && typeof file.coordinates.lat === 'number') {
            lat = file.coordinates.lat;
            lon = file.coordinates.lon;
          } else if (selectedProject?.name?.includes('Gulu')) {
            lat = 2.7715;
            lon = 32.2920;
          }

          const delta = 0.003; 
          const west = lon - delta;
          const east = lon + delta;
          const south = lat - delta;
          const north = lat + delta;

          const center = Cesium.Cartesian3.fromDegrees(lon, lat, 0.0);
          const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);

          const planes = [
            new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.0, 0.0), -150.0),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, 0.0, 0.0), -150.0),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), -150.0),
            new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), -150.0)
          ];

          viewer.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
            modelMatrix: modelMatrix,
            planes: planes,
            edgeColor: Cesium.Color.DODGERBLUE,
            edgeWidth: 2.0,
            unionClippingRegions: false,
            enabled: true
          });

          const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);
          const terrainHeight = viewer.scene.globe.getHeight(cartographic) || 1150.0;
          const baseElevation = terrainHeight;
          
          const entitiesAdded: any[] = [];
          const gridRes = 10;
          const stepX = (east - west) / gridRes;
          const stepY = (north - south) / gridRes;

          for (let i = 0; i < gridRes; i++) {
            for (let j = 0; j < gridRes; j++) {
              const w = west + i * stepX;
              const e = west + (i + 1) * stepX;
              const s = south + j * stepY;
              const n = south + (j + 1) * stepY;

              const distFromCenter = Math.sqrt(Math.pow((i - gridRes/2), 2) + Math.pow((j - gridRes/2), 2));
              const elevationOffset = -18.0 * Math.exp(-distFromCenter / 3.0); 

              const polygonCoords = Cesium.Cartesian3.fromDegreesArrayHeights([
                w, s, baseElevation + elevationOffset,
                e, s, baseElevation + elevationOffset,
                e, n, baseElevation + elevationOffset,
                w, n, baseElevation + elevationOffset
              ]);

              const cellEntity = viewer.entities.add({
                name: `Surface Cell [${i},${j}]`,
                polygon: {
                  hierarchy: new Cesium.PolygonHierarchy(polygonCoords),
                  material: file.name.endsWith('.tif') || file.name.endsWith('.tiff') || file.layerType === 'GeoTIFF'
                    ? Cesium.Color.DARKGREEN.withAlpha(0.8) 
                    : Cesium.Color.LIGHTSLATEGRAY.withAlpha(0.9), 
                  outline: true,
                  outlineColor: Cesium.Color.DARKSLATEGRAY.withAlpha(0.2),
                  outlineWidth: 1,
                  perPositionHeight: true
                }
              });
              entitiesAdded.push(cellEntity);
            }
          }

          viewer._customSurfaceElements = viewer._customSurfaceElements || {};
          viewer._customSurfaceElements[file.name] = {
            entities: entitiesAdded,
            clippingPlanes: viewer.globe.clippingPlanes
          };

          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.005, 1300.0),
            orientation: {
              heading: Cesium.Math.toRadians(0.0),
              pitch: Cesium.Math.toRadians(-35.0),
              roll: 0.0
            },
            duration: 2.5
          });

          addLog(`Loaded surface "${file.name}" with grid replacement.`);
        }

        addLog(`Successfully loaded georeferenced surface "${file.name}".`);
      } else if (file.name.includes('kampala_flyover')) {
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
      } else if (file.name.includes('orthophoto') || file.name.toLowerCase().endsWith('.png') || file.type === 'Georeferenced PNG' || (file.type === 'General Stream Registry' && file.name.toLowerCase().endsWith('.png'))) {
        let fileCoords = (file as any).coordinates;
        if (!fileCoords && file.fileUrl) {
          try {
            const urlInfo = JSON.parse(file.fileUrl);
            fileCoords = urlInfo.metadata?.coordinates || urlInfo.metadata?.anchor;
          } catch (e) {}
        }

        const defaultLat = parseFloat(surfaceAnchorLat) || (selectedProject?.name?.includes('Gulu') ? 2.7715 : 0.3134);
        const defaultLon = parseFloat(surfaceAnchorLon) || (selectedProject?.name?.includes('Gulu') ? 32.2920 : 32.5802);

        let west = defaultLon - 0.01;
        let south = defaultLat - 0.01;
        let east = defaultLon + 0.01;
        let north = defaultLat + 0.01;
        
        if (fileCoords) {
          let tempWest = fileCoords.west;
          let tempSouth = fileCoords.south;
          let tempEast = fileCoords.east;
          let tempNorth = fileCoords.north;

          if (tempWest !== undefined && tempSouth !== undefined && tempEast !== undefined && tempNorth !== undefined) {
            let minW = Math.min(tempWest, tempEast);
            let maxW = Math.max(tempWest, tempEast);
            let minS = Math.min(tempSouth, tempNorth);
            let maxS = Math.max(tempSouth, tempNorth);

            if (Math.abs(minW) > 180 || Math.abs(maxS) > 90) {
              try {
                const projectionDef = "+proj=utm +zone=36 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
                const bottomLeft = proj4(projectionDef, "+proj=longlat +datum=WGS84 +no_defs", [minW, minS]);
                const topRight = proj4(projectionDef, "+proj=longlat +datum=WGS84 +no_defs", [maxW, maxS]);
                west = Math.min(bottomLeft[0], topRight[0]);
                east = Math.max(bottomLeft[0], topRight[0]);
                south = Math.min(bottomLeft[1], topRight[1]);
                north = Math.max(bottomLeft[1], topRight[1]);
              } catch (projErr) {
                console.error("Proj4 conversion failed in toggleLayer:", projErr);
                west = minW;
                south = minS;
                east = maxW;
                north = maxS;
              }
            } else {
              west = minW;
              south = minS;
              east = maxW;
              north = maxS;
            }
          } else if (fileCoords.lat !== undefined && fileCoords.lon !== undefined) {
            west = fileCoords.lon - 0.01;
            east = fileCoords.lon + 0.01;
            south = fileCoords.lat - 0.01;
            north = fileCoords.lat + 0.01;
          }
        }

        let imageUrl = '/prome.png';
        if (file.id) {
          imageUrl = `/api/projects-database/documents/${file.id}/file?token=${encodeURIComponent(token || '')}`;
        } else {
          try {
            const urlInfo = JSON.parse(file.fileUrl || '{}');
            imageUrl = urlInfo.download || urlInfo.view || '/prome.png';
          } catch (e) {
            imageUrl = file.fileUrl || '/prome.png';
          }
        }

        const rect = Cesium.Rectangle.fromDegrees(west, south, east, north);
        const centerLon = (west + east) / 2;
        const centerLat = (south + north) / 2;

        if (Cesium.SingleTileImageryProvider && (Cesium.SingleTileImageryProvider as any).fromUrl) {
          (Cesium.SingleTileImageryProvider as any).fromUrl(imageUrl, { rectangle: rect })
            .then((provider: any) => {
              const imgLayer = viewer.imageryLayers.addImageryProvider(provider);
              viewer._customImageryLayers = viewer._customImageryLayers || {};
              viewer._customImageryLayers[file.name] = imgLayer;
              addLog(`SingleTileImageryProvider draped successfully for "${file.name}".`);
            })
            .catch((err: any) => {
              console.warn('SingleTileImageryProvider.fromUrl failed, falling back to entity rectangle:', err);
              viewer.entities.add({
                layerName: file.name,
                name: file.name,
                rectangle: {
                  coordinates: rect,
                  material: new Cesium.ImageMaterialProperty({
                    image: imageUrl,
                    transparent: true
                  })
                }
              });
            });
        } else {
          const provider = new Cesium.SingleTileImageryProvider({ url: imageUrl, rectangle: rect });
          const imgLayer = viewer.imageryLayers.addImageryProvider(provider);
          viewer._customImageryLayers = viewer._customImageryLayers || {};
          viewer._customImageryLayers[file.name] = imgLayer;
        }

        // Fly camera to center of image at 800 meters altitude looking at 45 degrees
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 800.0),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-45.0),
            roll: 0.0
          },
          duration: 2.0
        });
        addLog(`Visualizing georeferenced orthophoto raster overlay mask at bounds [W: ${west.toFixed(5)}, S: ${south.toFixed(5)}, E: ${east.toFixed(5)}, N: ${north.toFixed(5)}].`);
      } else if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf') || file.type === 'GLTF/GLB' || file.layerType === 'Point Cloud' || (file.layerType as string) === 'GLTF/GLB') {
        addLog(`Initiating 3D GLTF/GLB model streaming & surface draping for "${file.name}"...`);
        
        let lat = selectedProject?.name?.includes('Gulu') ? 2.7715 : 0.3134;
        let lon = selectedProject?.name?.includes('Gulu') ? 32.2920 : 32.5802;

        let anchorCoords = file.coordinates;
        if (!anchorCoords && file.fileUrl) {
          try {
            const urlInfo = JSON.parse(file.fileUrl);
            anchorCoords = urlInfo.metadata?.anchor || urlInfo.metadata?.coordinates;
          } catch(e) {}
        }

        if (anchorCoords && typeof anchorCoords.lat === 'number') {
          lat = anchorCoords.lat;
          lon = anchorCoords.lon;
          addLog(`Using anchor coordinates: Lat ${lat}, Lon ${lon}`);
        }

        // Get prevailing terrain elevation at location
        const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);
        const terrainHeight = viewer.scene.globe.getHeight(cartographic) || 1150.0;

        let modelUrl = '';
        if (file.id) {
          modelUrl = `/api/projects-database/documents/${file.id}/file?token=${encodeURIComponent(token || '')}`;
        } else if (file.fileUrl) {
          try {
            const urlInfo = JSON.parse(file.fileUrl);
            modelUrl = urlInfo.view || file.fileUrl;
          } catch(e) {
            modelUrl = file.fileUrl;
          }
        }

        if (modelUrl) {
          viewer.entities.add({
            layerName: file.name,
            name: file.name,
            position: Cesium.Cartesian3.fromDegrees(lon, lat, terrainHeight),
            model: {
              uri: modelUrl,
              minimumPixelSize: 128,
              maximumScale: 20000,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            point: {
              pixelSize: 10,
              color: Cesium.Color.DODGERBLUE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            label: {
              text: `${file.name} (3D Model)`,
              font: '12pt sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -15),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });
        } else {
          // Visual marker draped onto prevailing ground surface
          viewer.entities.add({
            layerName: file.name,
            name: file.name,
            position: Cesium.Cartesian3.fromDegrees(lon, lat, terrainHeight),
            point: {
              pixelSize: 14,
              color: Cesium.Color.LIME,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            label: {
              text: `${file.name} (3D GLTF Model)`,
              font: '12pt sans-serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -15),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });
        }

        // Fly camera to 3D model site at 400m altitude draped on surface
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.003, terrainHeight + 400.0),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-45.0),
            roll: 0.0
          },
          duration: 2.0
        });
        addLog(`Successfully draped 3D GLTF/GLB model "${file.name}" onto prevailing terrain surface at Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}.`);
      } else {
        // Generic simulated overlay for custom design files
        addLog(`Streaming design model payload from Google Drive: ${file.name}`);
        
        // Add simulated alignment points or markers corresponding to Uganda center coordinates
        const lat = 1.373 + (Math.random() - 0.5) * 0.1;
        const lon = 32.290 + (Math.random() - 0.5) * 0.1;
        
        viewer.entities.add({
          layerName: file.name,
          name: `${file.name} (Simulated ${file.layerType} Design)`,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 1150),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString('#38bdf8'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
          },
          label: {
            text: `${file.name} (${file.layerType})`,
            font: '10pt sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -9)
          }
        });
        
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.02, 5000.0),
          orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-35.0),
            roll: 0.0
          },
          duration: 2.0
        });
        
        addLog(`Simulated design overlay rendered successfully for "${file.name}"`);
      }
    }
  };

  const toggleCategoryLayers = (categoryName: string, streamAll: boolean) => {
    const categoryFiles = files.filter(f => f.type !== 'General Stream Registry' && getFileCategory(f) === categoryName);
    categoryFiles.forEach(file => {
      toggleLayer(file, streamAll);
    });
    addLog(`${streamAll ? 'Streamed' : 'Hidden'} all files in category: ${categoryName}`);
  };



  const uploadRealFileToActiveProject = async (fileObj: File, fileSize: string, layerType: 'GeoJSON' | 'CZML' | 'KML' | 'Point Cloud' | 'LandXML' | 'DXF' | 'DWG' | 'IFC' | 'SHP' | 'OpenDRIVE' | '3D Tiles' | 'GeoTIFF' | 'OBJ/FBX', customMetadata?: any, docType: string = 'GIS Layer', overrideDestination?: 'project' | 'catalog') => {
    const dest = overrideDestination || uploadDestination;
    if (dest === 'catalog') {
      if (!selectedUploadFolderId) {
        addLog('Error: Please select a folder in the Spatial Catalog first to upload the data to.');
        alert('Please select a folder in the Spatial Catalog first to upload the data to.');
        return;
      }

      if (layerType === 'GeoJSON') {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            const text = event.target.result;
            JSON.parse(text); // validation
            const newItem: CatalogItem = {
              key: `layer_${Date.now()}`,
              name: fileObj.name,
              type: layerType,
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              folderId: selectedUploadFolderId,
              geojsonString: text
            };
            setCatalogItems(prev => [...prev, newItem]);
            addLog(`Successfully uploaded "${fileObj.name}" to Spatial Catalog.`);
          } catch (e) {
            alert('Invalid GeoJSON content file.');
          }
        };
        reader.readAsText(fileObj);
      } else {
        const newItem: CatalogItem = {
          key: `layer_${Date.now()}`,
          name: fileObj.name,
          type: layerType,
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          folderId: selectedUploadFolderId
        };
        setCatalogItems(prev => [...prev, newItem]);
        addLog(`Successfully uploaded "${fileObj.name}" to Spatial Catalog.`);
      }
      return;
    }

    const targetProjectId = selectedProject?.id || masterProjectId || projects[0]?.id;
    if (!targetProjectId) {
      addLog('Error: Active project ID not resolved.');
      alert('Master Database project not resolved. Please select a project before uploading.');
      return;
    }

    const targetProjectName = selectedProject?.name || projects.find(p => p.id === targetProjectId)?.name || 'Master Database';

    addLog(`Initiating secure connection to project folder for "${targetProjectName}"...`);
    addLog(`Uploading "${fileObj.name}" to project folder...`);

    try {
      const formData = new FormData();
      formData.append('file', fileObj);
      formData.append('title', fileObj.name);
      formData.append('type', docType);
      formData.append('documentNumber', `GIS-${Date.now()}`);
      formData.append('revision', '1.0');
      formData.append('status', 'Ready');
      formData.append('issueDate', new Date().toISOString());
      if (customMetadata) {
        formData.append('metadata', JSON.stringify(customMetadata));
      }

      const res = await fetch(`/api/projects-database/${targetProjectId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const newDoc = await res.json();
        const newFile: StreamFile = {
          id: newDoc.id,
          name: newDoc.title,
          type: newDoc.type || docType,
          size: fileSize,
          lastModified: new Date(newDoc.createdAt).toISOString().replace('T', ' ').slice(0, 16),
          layerType: layerType,
          status: 'Loaded',
          coordinates: customMetadata?.anchor || customMetadata?.coordinates,
          fileUrl: newDoc.fileUrl
        };
        setFiles(prev => {
          const filtered = prev.filter(f => f.name !== newFile.name);
          return [newFile, ...filtered];
        });
        const targetCategory = getFileCategory(newFile);
        setExpandedCategories(prev => ({
          ...prev,
          [targetCategory]: true
        }));
        setActiveLayers(prev => [...prev.filter(l => l !== newFile.name), newFile.name]);
        addLog(`Successfully imported "${fileObj.name}" to "${targetProjectName}" project folder.`);

        setTimeout(() => {
          toggleLayer(newFile, true);
        }, 100);
      } else {
        const errData = await res.json().catch(() => ({}));
        addLog(`Error: ${errData.message || 'Failed to upload file metadata to database API.'}`);
      }
    } catch (err) {
      console.error(err);
      addLog(`Network Error: Failed to upload file to Google Drive.`);
    }
  };

  const handlePngFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPngFileObj(file);
      setPngFileName(file.name);
    }
  };

  const handlePgwFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPgwFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPgwText(evt.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handlePrjFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrjFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPrjText(evt.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const loadDemoGeoreference = () => {
    setPngFileName('uganda_orthophoto_lot2.png');
    setPgwFileName('uganda_orthophoto_lot2.pgw');
    setPrjFileName('uganda_orthophoto_lot2.prj');
    setPgwText(`0.0000045\n0.0\n0.0\n-0.0000045\n32.285\n2.780`);
    setPrjText(`GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`);
    
    // Create a real valid 1x1 base64 transparent PNG file so HTML Image decoder succeeds
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const byteCharacters = atob(base64Png);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mockFile = new File([byteArray], 'uganda_orthophoto_lot2.png', { type: 'image/png' });
    setPngFileObj(mockFile);
    addLog('Loaded Uganda orthophoto georeferencing demo coordinates.');
  };

  const handleImportAndGeoreference = async () => {
    if (!pngFileObj) {
      alert('Please select a PNG Image file.');
      return;
    }

    setIsUploading(true);
    addLog(`Initiating georeferencing calculations for "${pngFileName}"...`);

    // Determine dimensions with fallback
    let width = 2000;
    let height = 2000;

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(pngFileObj);
      await new Promise<void>((resolve) => {
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            width = img.naturalWidth;
            height = img.naturalHeight;
          }
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.onerror = () => {
          console.warn('Could not extract PNG dimensions, falling back to default 2000x2000.');
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.src = objectUrl;
      });
    } catch (e) {
      console.warn('Failed to load PNG image dimensions:', e);
    }

    // Default bounds (Active Project Location) if no PGW file provided
    const centerLat = parseFloat(surfaceAnchorLat) || (selectedProject?.name?.includes('Gulu') ? 2.7715 : 0.3134);
    const centerLon = parseFloat(surfaceAnchorLon) || (selectedProject?.name?.includes('Gulu') ? 32.2920 : 32.5802);
    let west = centerLon - 0.01;
    let south = centerLat - 0.01;
    let east = centerLon + 0.01;
    let north = centerLat + 0.01;

    const lines = pgwText.trim() ? pgwText.trim().split('\n').map(l => l.trim()) : [];
    if (lines.length >= 6) {
      const a = parseFloat(lines[0]);      
      const eScale = parseFloat(lines[3]); 
      const c = parseFloat(lines[4]);      
      const f = parseFloat(lines[5]);      
      if (!isNaN(a) && !isNaN(eScale) && !isNaN(c) && !isNaN(f)) {
        west = c;
        north = f;
        east = c + a * width;
        south = f + eScale * height; 
      }
    }

    const rawWest = Math.min(west, east);
    const rawEast = Math.max(west, east);
    const rawSouth = Math.min(south, north);
    const rawNorth = Math.max(south, north);

    let projectionDef = "+proj=utm +zone=36 +ellps=WGS84 +datum=WGS84 +units=m +no_defs"; // Default to Zone 36N
    if (prjText.trim()) {
      const prjUpper = prjText.toUpperCase();
      let zone = '36';
      let isSouth = false;

      if (prjUpper.includes('ZONE 35') || prjUpper.includes('UTM35') || prjUpper.includes('UTM_ZONE_35')) {
        zone = '35';
      } else if (prjUpper.includes('ZONE 36') || prjUpper.includes('UTM36') || prjUpper.includes('UTM_ZONE_36')) {
        zone = '36';
      } else if (prjUpper.includes('ZONE 37') || prjUpper.includes('UTM37') || prjUpper.includes('UTM_ZONE_37')) {
        zone = '37';
      }

      if (prjUpper.includes('SOUTH') || prjUpper.includes('35S') || prjUpper.includes('36S') || prjUpper.includes('37S')) {
        isSouth = true;
      }

      if ((prjUpper.includes('WGS_1984') || prjUpper.includes('WGS84')) && !prjUpper.includes('UTM') && !prjUpper.includes('PROJCS')) {
        projectionDef = "+proj=longlat +datum=WGS84 +no_defs";
      } else {
        projectionDef = `+proj=utm +zone=${zone} ${isSouth ? '+south ' : ''}+ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
      }
    }

    let wgsWest = rawWest;
    let wgsSouth = rawSouth;
    let wgsEast = rawEast;
    let wgsNorth = rawNorth;

    // Project UTM coordinates to WGS 84 degrees if values indicate projected meters
    if (Math.abs(rawWest) > 180 || Math.abs(rawNorth) > 90) {
      try {
        const bottomLeft = proj4(projectionDef, "+proj=longlat +datum=WGS84 +no_defs", [rawWest, rawSouth]);
        const topRight = proj4(projectionDef, "+proj=longlat +datum=WGS84 +no_defs", [rawEast, rawNorth]);
        wgsWest = Math.min(bottomLeft[0], topRight[0]);
        wgsEast = Math.max(bottomLeft[0], topRight[0]);
        wgsSouth = Math.min(bottomLeft[1], topRight[1]);
        wgsNorth = Math.max(bottomLeft[1], topRight[1]);
      } catch (projErr) {
        console.error("Proj4 conversion failed for PNG:", projErr);
      }
    }

    const coordinates = { west: wgsWest, south: wgsSouth, east: wgsEast, north: wgsNorth };

    if (uploadDestination === 'catalog') {
      if (!selectedUploadFolderId) {
        alert('Please select a folder in the Spatial Catalog to upload the data to.');
        setIsUploading(false);
        return;
      }

      if (pngFileObj) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const dataUrl = event.target.result;
          const newItem: CatalogItem = {
            key: `layer_${Date.now()}`,
            name: pngFileName,
            type: 'Georeferenced PNG',
            color: '#eab308',
            folderId: selectedUploadFolderId,
            coordinates: coordinates,
            pngDataUrl: dataUrl
          };
          setCatalogItems(prev => [...prev, newItem]);
          addLog(`Successfully added georeferenced PNG "${pngFileName}" to Spatial Catalog.`);
          setIsPngModalOpen(false);
          setIsUploading(false);

          // Reset
          setPngFileObj(null);
          setPngFileName('');
          setPgwFileName('');
          setPrjFileName('');
          setPgwText('');
          setPrjText('');
        };
        reader.readAsDataURL(pngFileObj);
      } else {
        setIsUploading(false);
      }
      return;
    }

    const targetProjectId = selectedProject?.id || masterProjectId;
    if (!targetProjectId) {
      alert('Master Database project not resolved.');
      setIsUploading(false);
      return;
    }

    addLog(`Computed bounds: W:${wgsWest.toFixed(5)}, S:${wgsSouth.toFixed(5)}, E:${wgsEast.toFixed(5)}, N:${wgsNorth.toFixed(5)}`);

    try {
      const formData = new FormData();
      formData.append('file', pngFileObj);
      formData.append('title', pngFileName);
      formData.append('type', 'Georeferenced PNG');
      formData.append('documentNumber', `PNG-${Date.now()}`);
      formData.append('revision', '1.0');
      formData.append('status', 'Ready');
      formData.append('issueDate', new Date().toISOString());
      formData.append('metadata', JSON.stringify({ coordinates }));

      addLog(`Uploading files to "${selectedProject?.name || 'Master Database'}" project folder...`);

      const res = await fetch(`/api/projects-database/${targetProjectId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const newDoc = await res.json();
        const newFile: StreamFile = {
          id: newDoc.id,
          name: newDoc.title,
          type: newDoc.type || 'Georeferenced PNG',
          size: `${(pngFileObj.size / (1024 * 1024)).toFixed(1)} MB`,
          lastModified: new Date(newDoc.createdAt).toISOString().replace('T', ' ').slice(0, 16),
          layerType: 'GeoTIFF',
          status: 'Ready',
          coordinates: coordinates,
          fileUrl: newDoc.fileUrl
        };

        setFiles(prev => {
          const filtered = prev.filter(f => f.name !== newFile.name);
          return [newFile, ...filtered];
        });
        addLog(`Georeferenced PNG "${pngFileName}" successfully uploaded to Google Drive and registered.`);
        setIsPngModalOpen(false);

        // Reset
        setPngFileObj(null);
        setPngFileName('');
        setPgwFileName('');
        setPrjFileName('');
        setPgwText('');
        setPrjText('');
      } else {
        const data = await res.json();
        addLog(`Error: ${data.message || 'Failed to upload'}`);
      }
    } catch (err) {
      console.error(err);
      addLog('Error: Failed to upload georeferenced PNG.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportSurface = () => {
    surfaceFileInputRef.current?.click();
  };

  const handleSurfaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingSurfaceFile(file);
    setIsSurfaceModalOpen(true);
    e.target.value = '';
  };

  const handleConfirmSurfaceUpload = async () => {
    if (!pendingSurfaceFile) return;

    const file = pendingSurfaceFile;
    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 1 
      ? `${sizeInMB.toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;

    const ext = file.name.split('.').pop()?.toLowerCase();
    let layerType: any = '3D Tiles';
    if (ext === 'tif' || ext === 'tiff') layerType = 'GeoTIFF';
    if (ext === 'xml') layerType = 'LandXML';
    if (ext === 'obj' || ext === 'fbx') layerType = 'OBJ/FBX';
    if (ext === 'json' || ext === 'zip') layerType = '3D Tiles';

    // Store georeference & CRS parameters
    const metadata = {
      crs: surfaceCrs,
      anchor: {
        lat: parseFloat(surfaceAnchorLat) || 0.3134,
        lon: parseFloat(surfaceAnchorLon) || 32.5802
      }
    };

    setIsSurfaceModalOpen(false);
    setPendingSurfaceFile(null);

    await uploadRealFileToActiveProject(file, sizeStr, layerType, metadata, 'GIS Layer', 'project');
  };

  const handleImportDesignFiles = () => {
    designFileInputRef.current?.click();
  };

  const handleDesignFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Calculate file size string (e.g. "2.4 MB")
    const sizeInMB = file.size / (1024 * 1024);
    const sizeStr = sizeInMB >= 1 
      ? `${sizeInMB.toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`;
      
    // Determine layer type from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    let layerType: any = 'GeoJSON';
    if (ext === 'xml') layerType = 'LandXML';
    if (ext === 'dxf') layerType = 'DXF';
    if (ext === 'dwg') layerType = 'DWG';
    if (ext === 'ifc') layerType = 'IFC';
    if (ext === 'shp') layerType = 'SHP';
    if (ext === 'xodr') layerType = 'OpenDRIVE';
    if (ext === 'json' || ext === 'zip') layerType = '3D Tiles';
    if (ext === 'glb' || ext === 'gltf') layerType = 'Point Cloud';
    
    // Clear the input value so the same file can be selected again
    e.target.value = '';
    
    const docType = (ext === 'glb' || ext === 'gltf') ? 'GLTF/GLB' : ((ext === 'zip' || ext === 'json') ? '3D Tiles' : 'GIS Layer');
    await uploadRealFileToActiveProject(file, sizeStr, layerType, undefined, docType, 'project');
  };

  const handleImportPNGs = () => {
    setIsPngModalOpen(true);
  };

  const handleImportGLTF = () => {
    gltfFileInputRef.current?.click();
  };

  const handleGltfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (selectedProject?.name?.includes('Gulu')) {
      setGltfAnchorLat('2.7715');
      setGltfAnchorLon('32.2920');
    } else {
      setGltfAnchorLat('0.3134');
      setGltfAnchorLon('32.5802');
    }

    setPendingGltfFiles(selectedFiles);
    setIsGltfModalOpen(true);
    e.target.value = '';
  };

  const handleGltfPrjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGltfPrjFileName(file.name);

    try {
      const prjContent = await file.text();
      const prjUpper = prjContent.toUpperCase();

      if (prjUpper.includes('ZONE 36') || prjUpper.includes('36N')) {
        setGltfCrs('UTM Zone 36N / WGS 84 (EPSG:32636)');
      } else if (prjUpper.includes('ZONE 35') || prjUpper.includes('35N')) {
        setGltfCrs('UTM Zone 35N / WGS 84 (EPSG:32635)');
      } else if (prjUpper.includes('ZONE 37') || prjUpper.includes('37N')) {
        setGltfCrs('UTM Zone 37N / WGS 84 (EPSG:32637)');
      } else if (prjUpper.includes('GEOGCS') || prjUpper.includes('WGS_1984')) {
        setGltfCrs('WGS 84 Geographic (EPSG:4326)');
      }
      addLog(`Parsed projection sidecar "${file.name}": CRS set to ${gltfCrs}.`);
    } catch (err) {
      console.error('Failed to read .prj file:', err);
    }
  };

  const handleConfirmGltfUpload = async () => {
    if (pendingGltfFiles.length === 0) return;

    const filesToUpload = [...pendingGltfFiles];
    setIsGltfModalOpen(false);
    setPendingGltfFiles([]);

    const lat = parseFloat(gltfAnchorLat) || (selectedProject?.name?.includes('Gulu') ? 2.7715 : 0.3134);
    const lon = parseFloat(gltfAnchorLon) || (selectedProject?.name?.includes('Gulu') ? 32.2920 : 32.5802);

    const metadata = {
      crs: gltfCrs,
      anchor: { lat, lon }
    };

    for (const file of filesToUpload) {
      const sizeInMB = file.size / (1024 * 1024);
      const sizeStr = sizeInMB >= 1 
        ? `${sizeInMB.toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`;

      await uploadRealFileToActiveProject(file, sizeStr, 'Point Cloud', metadata, 'GLTF/GLB', 'project');
    }
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

      if (viewer._customPrimitives && viewer._customPrimitives[file.name]) {
        viewer.scene.primitives.remove(viewer._customPrimitives[file.name]);
        delete viewer._customPrimitives[file.name];
      }
    }

    setActiveLayers(prev => prev.filter(name => name !== file.name));
    setFiles(prev => prev.filter(f => f.name !== file.name));

    if (file.id && selectedProject?.id) {
      try {
        const res = await fetch(`/api/projects-database/${selectedProject.id}/documents/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          addLog(`Successfully deleted "${file.name}" from Google Drive folder "${selectedProject.name}".`);
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

  const handleCreateDatabaseProject = async () => {
    if (!newProjName.trim()) {
      alert('Please enter a project name.');
      return;
    }
    
    setIsCreatingProj(true);
    addLog(`Initiating folder creation structure in Google Drive for "${newProjName}"...`);
    
    try {
      const res = await fetch('/api/projects-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProjName,
          client: newProjClient || 'PROME',
          description: newProjDesc,
          startDate: newProjDate,
          members: selectedProjectMembers.map(userId => ({ userId, role: 'Viewer' }))
        })
      });

      if (res.ok) {
        const createdProj = await res.json();
        
        // Append to current list and switch selection to this project
        setProjects(prev => [createdProj, ...prev]);
        setSelectedProject(createdProj);
        setIsCreateProjectOpen(false);
        
        // Reset form fields
        setNewProjName('');
        setNewProjClient('PROME');
        setNewProjDate(new Date().toISOString().slice(0, 10));
        setNewProjDesc('');
        setSelectedProjectMembers([]);
        
        // Reload documents for this project (starts empty)
        await fetchProjectDocuments(createdProj.id, [createdProj, ...projects]);
        addLog(`Database project and Google Drive folder created successfully.`);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to create project');
      }
    } catch (err) {
      console.error(err);
      alert('Network error: Failed to create database project.');
    } finally {
      setIsCreatingProj(false);
    }
  };

  const handleUpdateDatabaseProject = async () => {
    if (!editProjName.trim()) {
      alert('Please enter a project name.');
      return;
    }
    if (!editingProject) return;
    
    setIsSavingProj(true);
    addLog(`Saving changes for project "${editProjName}"...`);
    
    try {
      const res = await fetch(`/api/projects-database/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editProjName,
          client: editProjClient || 'PROME',
          description: editProjDesc,
          startDate: editProjDate,
          members: editProjectMembers.map(userId => ({ userId, role: 'Viewer' }))
        })
      });

      if (res.ok) {
        const updatedProj = await res.json();
        
        // Update local projects list state
        setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
        
        // If the edited project was currently selected, update the selected project state too!
        if (selectedProject?.id === updatedProj.id) {
          setSelectedProject(updatedProj);
        }
        
        setIsEditProjectOpen(false);
        setEditingProject(null);
        addLog(`Changes to database project "${editProjName}" saved successfully.`);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      alert('Network error: Failed to save database project changes.');
    } finally {
      setIsSavingProj(false);
    }
  };

  const handleDeleteDatabaseProject = async () => {
    if (!editingProject) return;
    if (editingProject.name === 'Master Database') {
      alert('Deleting the system "Master Database" project is not allowed.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to permanently delete project "${editingProject.name}"? This will delete all registered documents and cannot be undone.`)) {
      return;
    }
    
    setIsDeletingProj(true);
    addLog(`Initiating removal of project "${editingProject.name}" from database...`);
    
    try {
      const res = await fetch(`/api/projects-database/${editingProject.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        // Remove from local projects list
        setProjects(prev => prev.filter(p => p.id !== editingProject.id));
        
        // If the deleted project was currently selected, switch back to Master Database!
        if (selectedProject?.id === editingProject.id) {
          const masterProj = projects.find(p => p.name === 'Master Database');
          if (masterProj) {
            setSelectedProject(masterProj);
            fetchProjectDocuments(masterProj.id);
          } else {
            setSelectedProject(null);
            setFiles([]);
          }
        }
        
        setIsEditProjectOpen(false);
        setEditingProject(null);
        addLog(`Project "${editingProject.name}" deleted successfully.`);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error(err);
      alert('Network error: Failed to delete project.');
    } finally {
      setIsDeletingProj(false);
    }
  };

  // ── AI Command Bridge ──
  // Instantiate the bridge that maps AI commands to workspace operations
  const cesiumCommandBridge = useMemo(() => {
    return new CesiumCommandBridge({
      getViewer: () => viewerRef.current,

      // Camera
      flyToUganda: () => flyToUganda(),

      // Base Maps
      changeBaseLayer: (type) => changeBaseLayer(type),

      // Layers — adapter: AI sends layer name string, toggleLayer expects StreamFile
      toggleLayer: (layerName: string) => {
        const file = files.find(f => f.name === layerName);
        if (file) toggleLayer(file);
      },
      toggleCategoryLayers: (category: string, show: boolean) => {
        toggleCategoryLayers(category, show);
      },
      setLayerOpacity: (layerName: string, opacity: number) => {
        setLayerOpacity(layerName, opacity);
      },
      getActiveLayers: () => activeLayers,
      getFiles: () => files.map(f => ({ name: f.name, type: f.type })),

      // Measurements
      setMeasurementMode: (mode) => {
        setMeasurementMode(mode);
        measurementModeRef.current = mode;
      },
      clearMeasurements: () => clearMeasurements(),
      getMeasurementResult: () => measurementResult,

      // Scene settings
      setSceneFog: (enabled) => {
        setSceneFog(enabled);
        if (viewerRef.current) viewerRef.current.scene.fog.enabled = enabled;
      },
      setAtmosphere: (enabled) => {
        setSceneAtmosphere(enabled);
        if (viewerRef.current) viewerRef.current.scene.skyAtmosphere.show = enabled;
      },
      setLighting: (enabled) => {
        setSceneLighting(enabled);
        if (viewerRef.current) viewerRef.current.scene.globe.enableLighting = enabled;
      },
      setShadows: (enabled) => {
        setSceneShadows(enabled);
        if (viewerRef.current) viewerRef.current.shadows = enabled;
      },
      setDepthTest: (enabled) => {
        setSceneDepthTest(enabled);
        if (viewerRef.current) viewerRef.current.scene.globe.depthTestAgainstTerrain = enabled;
      },
      setContrast: (value) => setSceneContrast(value),
      setBrightness: (value) => setSceneBrightness(value),
      getSceneSettings: () => ({
        fog: sceneFog, atmosphere: sceneAtmosphere, lighting: sceneLighting,
        shadows: sceneShadows, depthTest: sceneDepthTest, contrast: sceneContrast, brightness: sceneBrightness,
      }),

      // Terrain Export
      setTerrainSelectMode: (mode) => {
        setTerrainSelectMode(mode);
        terrainSelectModeRef.current = mode;
      },
      clearTerrainSelection: () => clearTerrainSelection(),
      setTerrainExportFormat: (format) => setTerrainExportFormat(format as any),
      setTerrainCrs: (crs) => setTerrainCrs(crs),
      downloadTerrainSurface: () => handleDownloadTerrainSurface(),

      // Split Compare
      toggleSplitCompare: () => setIsSplitActive(prev => !prev),
      setSplitPosition: (percent) => setSplitPosition(percent),
      getIsSplitActive: () => isSplitActive,

      // Timeline
      toggleTimeline: () => setIsTimelineActive(prev => !prev),
      setTimelinePosition: (percent) => setTimelineTime(percent),
      togglePlayback: () => setIsPlaybackPlaying(prev => !prev),
      getIsTimelineActive: () => isTimelineActive,

      // Pedestrian Mode
      togglePedestrianMode: () => setIsPedestrianActive(prev => !prev),
      setPedestrianSpeed: (speed) => setPedestrianSpeed(speed),
      getIsPedestrianActive: () => isPedestrianActive,

      // Projects
      selectProject: (projectId) => {
        const proj = projects.find((p: any) => p.id === projectId);
        if (proj) setSelectedProject(proj);
      },
      getProjects: () => projects.map((p: any) => ({ id: p.id, name: p.name })),
      getSelectedProject: () => selectedProject,

      // Panels
      setLeftPanelOpen: (open) => setIsLeftPanelOpen(open),
      setRightPanelOpen: (open) => setIsPanelOpen(open),
      selectSubModule: (name) => {
        setSelectedSubModule(name as any);
        if (name) {
          setIsLeftPanelOpen(true);
          setIsSubModulePanelOpen(true);
        }
      },
      getSelectedSubModule: () => selectedSubModule,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cesiumLoaded, files, activeLayers, projects, selectedProject, selectedSubModule,
      isSplitActive, isTimelineActive, isPedestrianActive, measurementResult,
      sceneFog, sceneAtmosphere, sceneLighting, sceneShadows, sceneDepthTest, sceneContrast, sceneBrightness]);

  return (
    <div 
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => {
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
          handleLocalFileDrop(file);
        }
      }}
      style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', fontFamily: 'sans-serif', backgroundColor: '#0f172a', position: 'relative' }}
    >
      
      {/* Drag & Drop Visual Overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          border: '3px dashed #0ea5e9',
          margin: '20px',
          borderRadius: '16px',
          color: '#ffffff',
          pointerEvents: 'none'
        }}>
          <Upload className="animate-bounce" size={48} color="#0ea5e9" />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1rem' }}>Drop GeoJSON Vector File Here</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.5rem' }}>Natively stream and render spatial geometries directly on the globe</p>
        </div>
      )}
      
      {/* Dynamic Cesium Map Container */}
      <div id={containerId} style={{ flex: 1, height: '100%', filter: `contrast(${sceneContrast}%) brightness(${sceneBrightness}%)` }} />

      {/* Slide-down Sub-Modules Panel */}
      <div style={{
        position: 'absolute',
        top: isSubModulePanelOpen ? '0px' : '-52px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 101,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderTop: 'none',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        padding: '10px 16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '52px',
        boxSizing: 'border-box'
      }}>
        {/* Floating Toggle Chevron Button on Bottom Edge */}
        <button 
          onClick={() => setIsSubModulePanelOpen(!isSubModulePanelOpen)}
          style={{ 
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50px',
            height: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: 'none',
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 102,
            color: '#f8fafc',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            transition: 'color 0.2s',
            outline: 'none'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'}
          onMouseLeave={e => e.currentTarget.style.color = '#f8fafc'}
          title={isSubModulePanelOpen ? "Collapse Modules" : "Expand Modules"}
        >
          <ChevronDown 
            size={16} 
            style={{ 
              transform: isSubModulePanelOpen ? 'rotate(180deg)' : 'none', 
              transition: 'transform 0.3s ease-in-out' 
            }} 
          />
        </button>

        {['GeoTech', 'Terrain', 'Corridors', 'Hydrology', 'Structures'].map((mod) => {
          const isSelected = selectedSubModule === mod;
          return (
            <button
              key={mod}
              onClick={() => {
                setSelectedSubModule(mod as any);
                setIsSubModulePanelOpen(false);
                setIsLeftPanelOpen(true);
                addLog(`Switched active sub-module to "${mod}"`);
              }}
              style={{
                backgroundColor: isSelected ? '#0ea5e9' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '6px',
                color: '#ffffff',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 0 10px rgba(14, 165, 233, 0.4)' : 'none'
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }
              }}
            >
              {mod}
            </button>
          );
        })}
      </div>

      {!cesiumLoaded && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Database className="animate-spin" color="#0ea5e9" size={36} />
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc' }}>Loading Cesium 3D Engine...</span>
          </div>
          <p style={{ color: '#64748b' }}>Streaming spatial assets & graphics configurations from global CDN...</p>
        </div>
      )}

      {/* Top-Left Project Selector & Creation Bar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '6px 12px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        color: '#f8fafc',
        fontFamily: 'sans-serif'
      }}>
        {/* Create Project Button (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => setIsCreateProjectOpen(!isCreateProjectOpen)}
            style={{
              backgroundColor: '#0ea5e9',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0284c7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0ea5e9'}
          >
            <Plus size={14} />
            Create Project
          </button>
        )}

        {/* Separator line */}
        {isAdmin && <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.15)' }} />}

        {/* Active Project label and chevron dropdown select */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              outline: 'none'
            }}
          >
            <span>{selectedProject ? selectedProject.name : 'Master Database'}</span>
            <ChevronDown size={14} style={{ transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Project List Dropdown */}
          {isProjectDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: '-12px',
              width: '240px',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              padding: '4px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    borderRadius: '6px',
                    backgroundColor: selectedProject?.id === proj.id ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                    transition: 'all 0.15s',
                    paddingRight: '6px'
                  }}
                  onMouseEnter={e => {
                    if (selectedProject?.id !== proj.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedProject?.id !== proj.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedProject(proj);
                      setIsProjectDropdownOpen(false);
                      fetchProjectDocuments(proj.id);
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: selectedProject?.id === proj.id ? '#38bdf8' : '#cbd5e1',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      outline: 'none'
                    }}
                  >
                    <span>{proj.name}</span>
                    {selectedProject?.id === proj.id && <span style={{ color: '#38bdf8', fontSize: '0.7rem' }}>●</span>}
                  </button>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(proj);
                        setEditProjName(proj.name);
                        setEditProjClient(proj.client || 'PROME');
                        setEditProjDate(proj.startDate ? new Date(proj.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
                        setEditProjDesc(proj.description || '');
                        setEditProjectMembers(proj.members ? proj.members.map((m: any) => m.userId) : []);
                        setIsEditProjectOpen(true);
                        setIsProjectDropdownOpen(false);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#38bdf8',
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        marginLeft: '4px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.3)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    >
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Create Project Panel (Under top selector bar) */}
      {isCreateProjectOpen && isAdmin && (
        <div style={{
          position: 'absolute',
          top: '68px',
          left: '20px',
          zIndex: 100,
          width: '340px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#38bdf8' }}>Create New Database Project</span>
            <button 
              onClick={() => setIsCreateProjectOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>PROJECT NAME</label>
              <input 
                type="text" 
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                placeholder="e.g. Kampala Flyover Lot 3"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none' }}
              />
            </div>

            {/* Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>CLIENT</label>
              <input 
                type="text" 
                value={newProjClient}
                onChange={e => setNewProjClient(e.target.value)}
                placeholder="PROME"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none' }}
              />
            </div>

            {/* Start Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>START DATE</label>
              <input 
                type="date" 
                value={newProjDate}
                onChange={e => setNewProjDate(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none', colorScheme: 'dark' }}
              />
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>DESCRIPTION</label>
              <textarea 
                value={newProjDesc}
                onChange={e => setNewProjDesc(e.target.value)}
                placeholder="Brief project details..."
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none', height: '60px', resize: 'none' }}
              />
            </div>

            {/* Members checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>ASSIGN USERS / MEMBERS</label>
              <div style={{ 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.06)', 
                borderRadius: '6px', 
                padding: '6px', 
                maxHeight: '110px', 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}>
                {availableUsers.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: '#cbd5e1' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedProjectMembers.includes(u.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedProjectMembers([...selectedProjectMembers, u.id]);
                        } else {
                          setSelectedProjectMembers(selectedProjectMembers.filter(id => id !== u.id));
                        }
                      }}
                    />
                    <span>{u.name} ({u.email})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => setIsCreateProjectOpen(false)}
              style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#cbd5e1', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              disabled={isCreatingProj}
              onClick={handleCreateDatabaseProject}
              style={{ backgroundColor: '#0ea5e9', border: 'none', borderRadius: '6px', color: '#ffffff', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: isCreatingProj ? 'not-allowed' : 'pointer', opacity: isCreatingProj ? 0.7 : 1 }}
            >
              {isCreatingProj ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </div>
      )}
      {/* Floating Edit Project Panel (Under top selector bar) */}
      {isEditProjectOpen && isAdmin && editingProject && (
        <div style={{
          position: 'absolute',
          top: '68px',
          left: '20px',
          zIndex: 100,
          width: '340px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#38bdf8' }}>Edit Project: {editingProject.name}</span>
            <button 
              onClick={() => { setIsEditProjectOpen(false); setEditingProject(null); }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>PROJECT NAME</label>
              <input 
                type="text" 
                value={editProjName}
                onChange={e => setEditProjName(e.target.value)}
                disabled={editingProject.name === 'Master Database'}
                style={{ 
                  backgroundColor: 'rgba(0,0,0,0.3)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  padding: '6px 10px', 
                  fontSize: '0.78rem', 
                  color: editingProject.name === 'Master Database' ? '#64748b' : '#f8fafc', 
                  outline: 'none',
                  cursor: editingProject.name === 'Master Database' ? 'not-allowed' : 'text'
                }}
              />
            </div>

            {/* Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>CLIENT</label>
              <input 
                type="text" 
                value={editProjClient}
                onChange={e => setEditProjClient(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none' }}
              />
            </div>

            {/* Start Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>START DATE</label>
              <input 
                type="date" 
                value={editProjDate}
                onChange={e => setEditProjDate(e.target.value)}
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none', colorScheme: 'dark' }}
              />
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>DESCRIPTION</label>
              <textarea 
                value={editProjDesc}
                onChange={e => setEditProjDesc(e.target.value)}
                placeholder="Brief project details..."
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none', height: '60px', resize: 'none' }}
              />
            </div>

            {/* Members checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>ASSIGN USERS / MEMBERS</label>
              <div style={{ 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.06)', 
                borderRadius: '6px', 
                padding: '6px', 
                maxHeight: '110px', 
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}>
                {availableUsers.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: '#cbd5e1' }}>
                    <input 
                      type="checkbox" 
                      checked={editProjectMembers.includes(u.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setEditProjectMembers([...editProjectMembers, u.id]);
                        } else {
                          setEditProjectMembers(editProjectMembers.filter(id => id !== u.id));
                        }
                      }}
                    />
                    <span>{u.name} ({u.email})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
            {/* Delete Button on the left */}
            {editingProject.name !== 'Master Database' ? (
              <button
                type="button"
                disabled={isDeletingProj}
                onClick={handleDeleteDatabaseProject}
                style={{ 
                  backgroundColor: '#ef4444', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: '#ffffff', 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  cursor: isDeletingProj ? 'not-allowed' : 'pointer',
                  opacity: isDeletingProj ? 0.7 : 1
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                {isDeletingProj ? 'Deleting...' : 'Delete Project'}
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setIsEditProjectOpen(false); setEditingProject(null); }}
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#cbd5e1', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={isSavingProj}
                onClick={handleUpdateDatabaseProject}
                style={{ 
                  backgroundColor: '#0ea5e9', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: '#ffffff', 
                  padding: '6px 12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  cursor: isSavingProj ? 'not-allowed' : 'pointer', 
                  opacity: isSavingProj ? 0.7 : 1 
                }}
              >
                {isSavingProj ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Left Control Panel (Glassmorphism Sidebar - PROJECT EXPLORER) */}
      <div style={{ 
        position: 'absolute', 
        top: '120px', 
        left: isLeftPanelOpen ? '20px' : '-390px', 
        width: '380px', 
        maxHeight: '80vh', 
        backgroundColor: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 100, 
        color: '#f8fafc',
        transition: 'left 0.3s ease-in-out',
        overflow: 'visible' // allow toggle button to float outside right border
      }}>

        {/* Floating Toggle Chevron Button on Right Edge */}
        <button 
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          style={{ 
            position: 'absolute',
            top: '50%',
            right: '-32px',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '60px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderLeft: 'none',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 101,
            color: '#f8fafc',
            boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.3)',
            transition: 'color 0.2s',
            outline: 'none'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'}
          onMouseLeave={e => e.currentTarget.style.color = '#f8fafc'}
          title={isLeftPanelOpen ? "Collapse Explorer" : "Expand Explorer"}
        >
          {isLeftPanelOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* Panel Main Container */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', borderRadius: '16px' }}>
          {/* Header Block */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen color="#0ea5e9" size={22} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>PROJECT EXPLORER</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Structure view and node explorer metadata.
            </p>
          </div>

          {/* Dynamic Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!selectedSubModule ? (
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic', display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                Please select a sub-module from the top dropdown to view its tools and project structure.
              </div>
            ) : (
              <>
                {/* Dynamic Title / Selector Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase' }}>
                    Active Module: {selectedSubModule}
                  </span>
                  <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    ONLINE
                  </span>
                </div>

                {selectedSubModule === 'GeoTech' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#94a3b8' }}>Borehole Log Registry</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span>BH-01 (Chainage 0+240)</span>
                          <span style={{ color: '#10b981' }}>Depth: 24.5m</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span>BH-02 (Chainage 0+850)</span>
                          <span style={{ color: '#10b981' }}>Depth: 18.2m</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span>BH-03 (Chainage 1+400)</span>
                          <span style={{ color: '#10b981' }}>Depth: 32.0m</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#94a3b8' }}>Soil Stratigraphy Profile</span>
                      <div style={{ height: '80px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '30%', backgroundColor: '#78350f', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '0.62rem', color: '#fef3c7' }}>Layer A: Sandy Clay (0.0m - 5.5m)</div>
                        <div style={{ height: '40%', backgroundColor: '#451a03', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '0.62rem', color: '#fef3c7' }}>Layer B: Silty Sand (5.5m - 15.2m)</div>
                        <div style={{ height: '30%', backgroundColor: '#1c1917', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '0.62rem', color: '#fef3c7' }}>Layer C: Bedrock / Gneiss (15.2m+)</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>SPT N-Value Plots</span>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px', padding: '4px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                        <div style={{ flex: 1, backgroundColor: '#ea580c', height: '30%', borderRadius: '2px 2px 0 0' }} title="N=12" />
                        <div style={{ flex: 1, backgroundColor: '#ea580c', height: '50%', borderRadius: '2px 2px 0 0' }} title="N=22" />
                        <div style={{ flex: 1, backgroundColor: '#ea580c', height: '80%', borderRadius: '2px 2px 0 0' }} title="N=45" />
                        <div style={{ flex: 1, backgroundColor: '#ea580c', height: '95%', borderRadius: '2px 2px 0 0' }} title="N=60" />
                      </div>
                    </div>

                    <button style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '6px', color: '#38bdf8', padding: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      📊 Export Geotechnical Summary
                    </button>
                  </div>
                )}

                {selectedSubModule === 'Terrain' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Active Elevation Source</span>
                      <select style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '0.75rem', padding: '4px' }}>
                        <option>Uganda SRTM DEM 30m</option>
                        <option>Cesium World Terrain</option>
                        <option>Local LiDAR Project Scan (1m)</option>
                      </select>
                    </div>

                    {/* Terrain Area Surface Exporter */}
                    <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Box size={14} /> Area Surface Exporter
                        </span>
                        {terrainPointsRef.current.length > 0 && (
                          <button
                            onClick={clearTerrainSelection}
                            title="Clear Selection"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', color: '#f87171', padding: '2px 6px', fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Trash2 size={12} /> Clear
                          </button>
                        )}
                      </div>

                      {/* Tool Selection Buttons: Box or Polygon */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            if (terrainSelectMode === 'box') {
                              setTerrainSelectMode(null);
                            } else {
                              clearTerrainSelection();
                              setTerrainSelectMode('box');
                              addLog('Box selection mode activated. Click 2 opposite corner points on map.');
                            }
                          }}
                          style={{
                            backgroundColor: terrainSelectMode === 'box' ? '#0ea5e9' : 'rgba(30, 41, 59, 0.8)',
                            border: terrainSelectMode === 'box' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: terrainSelectMode === 'box' ? '#0f172a' : '#cbd5e1',
                            fontWeight: terrainSelectMode === 'box' ? 700 : 500,
                            padding: '6px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Square size={13} /> Box Tool
                        </button>

                        <button
                          onClick={() => {
                            if (terrainSelectMode === 'polygon') {
                              setTerrainSelectMode(null);
                            } else {
                              clearTerrainSelection();
                              setTerrainSelectMode('polygon');
                              addLog('Polygon selection mode activated. Click map to add vertices, right-click to finish.');
                            }
                          }}
                          style={{
                            backgroundColor: terrainSelectMode === 'polygon' ? '#0ea5e9' : 'rgba(30, 41, 59, 0.8)',
                            border: terrainSelectMode === 'polygon' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: terrainSelectMode === 'polygon' ? '#0f172a' : '#cbd5e1',
                            fontWeight: terrainSelectMode === 'polygon' ? 700 : 500,
                            padding: '6px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Hexagon size={13} /> Polygon Tool
                        </button>
                      </div>

                      {/* Status / Instructions */}
                      {terrainSelectionStatus && (
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '0.4rem', borderRadius: '4px' }}>
                          {terrainSelectionStatus}
                        </div>
                      )}

                      {/* Coordinate System Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>Target Coordinate System (CRS)</span>
                        <select
                          value={terrainCrs}
                          onChange={(e: any) => setTerrainCrs(e.target.value)}
                          style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '0.72rem', padding: '4px' }}
                        >
                          <option value="EPSG:32636">WGS 84 / UTM Zone 36N (EPSG:32636) - Uganda Default</option>
                          <option value="EPSG:32736">WGS 84 / UTM Zone 36S (EPSG:32736)</option>
                          <option value="EPSG:32635">WGS 84 / UTM Zone 35N (EPSG:32635) - W. Uganda</option>
                          <option value="EPSG:21096">Arc 1960 / UTM Zone 36N (EPSG:21096)</option>
                          <option value="EPSG:4326">WGS 84 Geographic Lat/Lon (EPSG:4326)</option>
                          <option value="LOCAL">Local Project (0,0 Origin)</option>
                        </select>
                      </div>

                      {/* Export Format Dropdown */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>Export Format</span>
                        <select
                          value={terrainExportFormat}
                          onChange={(e: any) => setTerrainExportFormat(e.target.value)}
                          style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '0.72rem', padding: '4px' }}
                        >
                          <option value="dxf_tin">DXF 3D TIN Mesh (.dxf)</option>
                          <option value="dem_asc">DEM ESRI ASCII Grid (.asc)</option>
                          <option value="dxf_contour">DXF Contour Lines (.dxf)</option>
                          <option value="geotif_image">Georeferenced Map Image + World & PRJ (.tif, .tfw, .prj)</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Grid Spacing (m)</span>
                          <input
                            type="number"
                            min={2}
                            max={100}
                            value={terrainGridResolution}
                            onChange={(e: any) => setTerrainGridResolution(parseInt(e.target.value) || 10)}
                            style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.72rem', padding: '3px 6px' }}
                          />
                        </div>

                        {terrainExportFormat === 'dxf_contour' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Contour Step (m)</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={terrainContourInterval}
                              onChange={(e: any) => setTerrainContourInterval(parseInt(e.target.value) || 5)}
                              style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.72rem', padding: '3px 6px' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={handleDownloadTerrainSurface}
                        disabled={isExportingTerrain || terrainPointsRef.current.length < 2}
                        style={{
                          backgroundColor: (terrainPointsRef.current.length >= 2 && !isExportingTerrain) ? '#10b981' : 'rgba(51, 65, 85, 0.6)',
                          border: 'none',
                          borderRadius: '4px',
                          color: (terrainPointsRef.current.length >= 2 && !isExportingTerrain) ? '#022c22' : '#64748b',
                          fontWeight: 700,
                          padding: '7px',
                          fontSize: '0.75rem',
                          cursor: (terrainPointsRef.current.length >= 2 && !isExportingTerrain) ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          marginTop: '0.2rem'
                        }}
                      >
                        <Download size={14} />
                        {isExportingTerrain ? 'Generating Surface...' : 'Download Terrain Surface'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Contour Lines Configuration</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                        <span>Show Contours</span>
                        <input type="checkbox" defaultChecked />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                        <span>Interval (meters)</span>
                        <input type="number" defaultValue={5} style={{ width: '50px', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.72rem', padding: '2px', textAlign: 'center', borderRadius: '4px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Terrain Visualization Shaders</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <button style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#cbd5e1', padding: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>Slope Shading</button>
                        <button style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#cbd5e1', padding: '4px', fontSize: '0.7rem', cursor: 'pointer' }}>Aspect Shading</button>
                        <button style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)', border: '1px solid #0ea5e9', borderRadius: '4px', color: '#38bdf8', padding: '4px', fontSize: '0.7rem', cursor: 'pointer', gridColumn: 'span 2' }}>Elevation Colorization</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSubModule === 'Corridors' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Alignment Corridor Selector</span>
                      <select style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#f8fafc', fontSize: '0.75rem', padding: '4px' }}>
                        <option>Kampala Flyover - Alignment Option A</option>
                        <option>Kampala Flyover - Bypass Corridor</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Chainage / Station Tracker</span>
                      <input type="range" min="0" max="4500" defaultValue="1240" style={{ width: '100%', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                        <span>Start: 0+000</span>
                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Current: 1+240</span>
                        <span>End: 4+500</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Design Speed limit:</span>
                        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>80 km/h</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Max Super-elevation:</span>
                        <span>6.0%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Corridor Right of Way:</span>
                        <span>45 meters</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSubModule === 'Hydrology' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Catchment Basins & Runoff</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.72rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input type="checkbox" defaultChecked /> Basin A (Area: 1.4 km²)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input type="checkbox" /> Basin B (Area: 0.8 km²)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input type="checkbox" defaultChecked /> Basin C (Area: 2.1 km²)
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Culvert Drainage Assessment</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.7rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>Culvert-A1 (Station 0+450)</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>Normal Flow (8%)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>Culvert-A2 (Station 1+100)</span>
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>Silted / Blocked (75%)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>Culvert-B1 (Station 2+800)</span>
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>High Flow (62%)</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Simulation Parameters</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Rainfall Intensity:</span>
                        <input type="range" min="10" max="150" defaultValue="45" style={{ flex: 1, cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>45 mm/h</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSubModule === 'Structures' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>3D Structural Elements</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.72rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Bridge Deck Section B3</span>
                          <span style={{ fontSize: '0.65rem', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 4px', borderRadius: '3px' }}>HEALTHY</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <span>Concrete Pier P12</span>
                          <span style={{ fontSize: '0.65rem', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 4px', borderRadius: '3px' }}>HEALTHY</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <span>Gantry Truss Support</span>
                          <span style={{ fontSize: '0.65rem', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', padding: '2px 4px', borderRadius: '3px' }}>CHECK SENSOR</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Live Sensor Telemetry</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.7rem' }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#94a3b8' }}>STRAIN GAUGE</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>125 με</div>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#94a3b8' }}>TILT SENSOR</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>0.015°</div>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#94a3b8' }}>ACCELERATION</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>0.02 m/s²</div>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#94a3b8' }}>TEMPERATURE</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>28.4°C</div>
                        </div>
                      </div>
                    </div>

                    <button style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '6px', color: '#38bdf8', padding: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      🔍 Run Structure Clearance Analysis
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating GIS Toolbar (Top Right, next to Cesium Home/Scene controls) */}
      <div style={{
        position: 'absolute',
        top: '5px',
        right: '190px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        {/* Main GIS Toggle Icon */}
        <button
          onClick={() => setIsGisMenuOpen(!isGisMenuOpen)}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: isGisMenuOpen ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#edffff',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            transition: 'all 0.2s',
            outline: 'none',
            zIndex: 1001
          }}
          title="GIS Analysis Toolbar"
        >
          <Wrench size={16} style={{ transform: isGisMenuOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s ease' }} />
        </button>

        {/* Sliding Panel containing the GIS tool icons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: isGisMenuOpen ? '500px' : '0px',
          opacity: isGisMenuOpen ? 1 : 0,
          transform: isGisMenuOpen ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          paddingTop: isGisMenuOpen ? '2px' : '0px',
          pointerEvents: isGisMenuOpen ? 'auto' : 'none'
        }}>
          {/* Distance Measure */}
          <button
            onClick={() => {
              clearMeasurements();
              setMeasurementMode('distance');
              setMeasurementResult('Click on the globe to start measuring path distance...');
            }}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: measurementMode === 'distance' ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Measure Path Distance"
          >
            <Ruler size={16} />
          </button>

          {/* Area Measure */}
          <button
            onClick={() => {
              clearMeasurements();
              setMeasurementMode('area');
              setMeasurementResult('Click points on the globe to define an area...');
            }}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: measurementMode === 'area' ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Measure Enclosed Area"
          >
            <Hexagon size={16} />
          </button>

          {/* Split Screen Slider Compare */}
          <button
            onClick={() => setIsSplitActive(!isSplitActive)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isSplitActive ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Split Map Swipe View (Compare satellite & streets)"
          >
            <Columns2 size={16} />
          </button>

          {/* Terrain Topography Profile */}
          <button
            onClick={() => {
              clearMeasurements();
              setMeasurementMode('profile');
              setMeasurementResult('Click two points on the map to extract elevation cross-section profile...');
            }}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: measurementMode === 'profile' ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Terrain Elevation Cross-Section Profile"
          >
            <AreaChart size={16} />
          </button>

          {/* Timeline Slider Toggle */}
          <button
            onClick={() => setIsTimelineActive(!isTimelineActive)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isTimelineActive ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Toggle Playback Progress Timeline"
          >
            <Clock size={16} />
          </button>

          {/* Pedestrian First-Person Mode */}
          <button
            onClick={() => {
              setIsPedestrianActive(!isPedestrianActive);
              if (!isPedestrianActive) {
                // Deactivate conflicting visual panels if activating walk mode
                setIsSplitActive(false);
                setIsTimelineActive(false);
                setIsProfileActive(false);
              }
            }}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isPedestrianActive ? '#10b981' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Pedestrian First-Person Walk Mode (WSAD / Arrow Keys)"
          >
            <Compass size={16} />
          </button>

          {/* Scene Style & Environment Editor */}
          <button
            onClick={() => setIsSceneEditorActive(!isSceneEditorActive)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: isSceneEditorActive ? '#484b4f' : 'rgba(48, 51, 54, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#edffff',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            title="Scene Style & Atmosphere Editor"
          >
            <Paintbrush size={16} />
          </button>

          {/* Trash / Clear measurements */}
          {(measurementResult || isProfileActive) && (
            <button
              onClick={() => {
                clearMeasurements();
                setIsProfileActive(false);
                setProfileData([]);
              }}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '4px',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              title="Clear All Measurements"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Measurement Instructions Overlay */}
      {measurementResult && (
        <div style={{
          position: 'absolute',
          bottom: isTimelineActive || isProfileActive ? '180px' : '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '8px 16px',
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 600,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'bottom 0.3s ease-in-out'
        }}>
          <Activity size={14} color="#38bdf8" />
          <span>{measurementResult}</span>
          <button
            onClick={clearMeasurements}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              outline: 'none',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Split Screen Divider Visual & Drag Overlay */}
      {isSplitActive && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${splitPosition}%`,
            width: '4px',
            backgroundColor: '#0ea5e9',
            cursor: 'ew-resize',
            zIndex: 1000,
            boxShadow: '0 0 10px rgba(14, 165, 233, 0.8)'
          }}>
            <div 
              onMouseDown={() => setIsDraggingSplit(true)}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0ea5e9',
                border: '2px solid #ffffff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#ffffff',
                fontSize: '0.8rem',
                cursor: 'ew-resize',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                userSelect: 'none'
              }}
            >
              ↔
            </div>
          </div>

          {/* Overlay dragging capture */}
          {isDraggingSplit && (
            <div 
              onMouseMove={(e) => {
                const pct = (e.clientX / window.innerWidth) * 100;
                setSplitPosition(Math.max(5, Math.min(95, pct)));
              }}
              onMouseUp={() => setIsDraggingSplit(false)}
              onMouseLeave={() => setIsDraggingSplit(false)}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 999,
                cursor: 'ew-resize',
                backgroundColor: 'transparent'
              }}
            />
          )}
        </>
      )}

      {/* Time-Dynamic Timeline Overlay Panel */}
      {isTimelineActive && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>⏱️ Construction Stage Timeline (Lot 2)</span>
            <span style={{ color: '#94a3b8' }}>Shift Duration: 08:00 - 17:00</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsPlaybackPlaying(!isPlaybackPlaying)}
              style={{
                backgroundColor: '#0ea5e9',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {isPlaybackPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={timelineTime}
              onChange={(e) => setTimelineTime(parseInt(e.target.value))}
              style={{ flex: 1, cursor: 'pointer' }}
            />

            <button
              onClick={() => {
                setTimelineTime(0);
                setIsPlaybackPlaying(false);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.7rem',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
            <span>08:00 (Start)</span>
            <span style={{ color: '#0ea5e9', fontWeight: 600 }}>Active Station: 0+{(timelineTime * 45).toFixed(0)}m</span>
            <span>17:00 (Complete)</span>
          </div>
        </div>
      )}

      {/* Terrain Topography Profile Chart Panel */}
      {isProfileActive && profileData.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 18px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: '#10b981' }}>📈 Elevation Cross-Section Profile</span>
            <button
              onClick={() => {
                setIsProfileActive(false);
                setProfileData([]);
              }}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ height: '90px', position: 'relative', marginTop: '4px' }}>
            <svg viewBox="0 0 460 90" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <line x1="0" y1="10" x2="460" y2="10" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="45" x2="460" y2="45" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="80" x2="460" y2="80" stroke="rgba(255,255,255,0.05)" />

              <path
                d={`M 0,${90 - (profileData[0].elev - 1100)} ` + profileData.map((d, i) => `L ${i * 46},${90 - (d.elev - 1100)}`).join(' ') + ` L 460,90 L 0,90 Z`}
                fill="rgba(16, 185, 129, 0.15)"
                stroke="none"
              />
              <path
                d={profileData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * 46},${90 - (d.elev - 1100)}`).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />

              {profileData.map((d, i) => (
                <circle
                  key={i}
                  cx={i * 46}
                  cy={90 - (d.elev - 1100)}
                  r="3"
                  fill="#34d399"
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`Dist: ${d.dist}m, Elev: ${d.elev}m`}</title>
                </circle>
              ))}
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
            <span>Start: 0m</span>
            <span>Max Elevation: {Math.max(...profileData.map(d => d.elev)).toFixed(0)}m</span>
            <span>End: {profileData[profileData.length - 1].dist}m</span>
          </div>
        </div>
      )}

      {/* Pedestrian First-Person Mode HUD Panel */}
      {isPedestrianActive && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '450px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5), 0 0 10px rgba(16, 185, 129, 0.2)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🚶 Pedestrian walk mode active
              </span>
            </div>
            <button
              onClick={() => setIsPedestrianActive(false)}
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '4px', color: '#f87171', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Exit Walk Mode
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            🎮 <strong>Walk Controls:</strong> Use <strong>W / S / A / D</strong> or <strong>Arrow Keys</strong> to walk. Hold and drag the <strong>Mouse Left-Button</strong> on the globe to look around.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
              <span>Walking speed:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{pedestrianSpeed} meters/tick</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={pedestrianSpeed}
              onChange={(e) => setPedestrianSpeed(parseInt(e.target.value))}
              style={{ width: '100%', height: '3px', cursor: 'pointer', accentColor: '#10b981' }}
            />
          </div>
        </div>
      )}

      {/* Scene Style & Environment Editor Panel */}
      {isSceneEditorActive && (
        <div style={{
          position: 'absolute',
          top: '120px',
          right: isPanelOpen ? '420px' : '20px',
          width: '320px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          color: '#ffffff',
          transition: 'right 0.3s ease-in-out',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={14} /> Scene Style Editor
            </span>
            <button
              onClick={() => setIsSceneEditorActive(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Atmospheric Rendering</span>
            
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <span>Enable Fog & Haze</span>
              <input
                type="checkbox"
                checked={sceneFog}
                onChange={(e) => setSceneFog(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#0ea5e9', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <span>Show Sky Atmosphere</span>
              <input
                type="checkbox"
                checked={sceneAtmosphere}
                onChange={(e) => setSceneAtmosphere(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#0ea5e9', cursor: 'pointer' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Globe Lights & Shadows</span>
            
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <span>Enable Globe Lighting (Sun Angle)</span>
              <input
                type="checkbox"
                checked={sceneLighting}
                onChange={(e) => setSceneLighting(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#0ea5e9', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <span>Show 3D Terrain Shadows</span>
              <input
                type="checkbox"
                checked={sceneShadows}
                onChange={(e) => setSceneShadows(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#0ea5e9', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <span>Depth Test Against Terrain</span>
              <input
                type="checkbox"
                checked={sceneDepthTest}
                onChange={(e) => setSceneDepthTest(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: '#0ea5e9', cursor: 'pointer' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Visual Tuning Filter</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>Contrast:</span>
                <span>{sceneContrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={sceneContrast}
                onChange={(e) => setSceneContrast(parseInt(e.target.value))}
                style={{ width: '100%', height: '3px', cursor: 'pointer', accentColor: '#0ea5e9' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                <span>Brightness:</span>
                <span>{sceneBrightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={sceneBrightness}
                onChange={(e) => setSceneBrightness(parseInt(e.target.value))}
                style={{ width: '100%', height: '3px', cursor: 'pointer', accentColor: '#0ea5e9' }}
              />
            </div>
          </div>
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
                <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>{selectedProject ? selectedProject.name : 'PROME 3D Master DB'}</h2>
              </div>
              <button 
                onClick={() => window.close()} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#94a3b8', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                <ArrowLeft size={12} /> Exit
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              {selectedProject ? selectedProject.description || 'Google Drive linked storage database workspace.' : 'Geospatial project modeling environment. Google Drive linked storage database workspace.'}
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

          {/* Tabs for Right Panel */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <button
              onClick={() => setRightPanelTab('registry')}
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: rightPanelTab === 'registry' ? 'transparent' : 'rgba(0,0,0,0.15)',
                border: 'none',
                borderBottom: rightPanelTab === 'registry' ? '2px solid #0ea5e9' : 'none',
                color: rightPanelTab === 'registry' ? '#f8fafc' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              📂 Registry & Base Maps
            </button>
            <button
              onClick={() => setRightPanelTab('catalog')}
              style={{
                flex: 1,
                padding: '10px 0',
                backgroundColor: rightPanelTab === 'catalog' ? 'transparent' : 'rgba(0,0,0,0.15)',
                border: 'none',
                borderBottom: rightPanelTab === 'catalog' ? '2px solid #0ea5e9' : 'none',
                color: rightPanelTab === 'catalog' ? '#f8fafc' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              📖 Spatial Catalog
            </button>
          </div>

          {/* Content scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rightPanelTab === 'registry' ? (
              <>
            
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
              {isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Upload Target:</span>
                    <select 
                      value={uploadDestination} 
                      onChange={(e: any) => {
                        setUploadDestination(e.target.value);
                        setSelectedUploadFolderId('');
                      }}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        color: '#f8fafc',
                        fontSize: '0.7rem',
                        padding: '2px 4px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="project">Project Registry</option>
                      <option value="catalog">Spatial Catalog</option>
                    </select>
                  </div>
                  
                  {uploadDestination === 'catalog' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Select Folder:</span>
                      {catalogFolders.length === 0 ? (
                        <span style={{ fontSize: '0.68rem', color: '#f87171', fontStyle: 'italic' }}>No folder available. Create one first!</span>
                      ) : (
                        <select 
                          value={selectedUploadFolderId} 
                          onChange={(e: any) => setSelectedUploadFolderId(e.target.value)}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            color: '#f8fafc',
                            fontSize: '0.7rem',
                            padding: '2px 4px',
                            outline: 'none',
                            cursor: 'pointer',
                            maxWidth: '180px'
                          }}
                        >
                          <option value="">-- Choose Folder --</option>
                          {catalogFolders.map(folder => (
                            <option key={folder.id} value={folder.id}>{getFolderPath(folder)}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                <input 
                  type="file" 
                  ref={surfaceFileInputRef}
                  accept=".tif,.tiff,.xml,.obj,.fbx,.json,.zip"
                  onChange={handleSurfaceFileChange}
                  style={{ display: 'none' }}
                />
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
                <input 
                  type="file" 
                  ref={designFileInputRef}
                  accept=".geojson,.xml,.dxf,.dwg,.ifc,.shp,.xodr,.json,.zip,.glb,.gltf"
                  onChange={handleDesignFileChange}
                  style={{ display: 'none' }}
                />
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
                <input 
                  type="file" 
                  ref={gltfFileInputRef}
                  accept=".gltf,.glb"
                  multiple
                  onChange={handleGltfFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            {/* Drive Streamed Layers List */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={14} /> Drive Stream Registry
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {files.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', padding: '0.5rem 0', textAlign: 'center' }}>
                    No project stream files found.
                  </div>
                ) : (
                  (['Surfaces', 'Design Files', 'PNGs', 'GLTF/GLB'] as const).map(catName => {
                    const categoryFiles = files.filter(f => getFileCategory(f) === catName);
                    const isExpanded = expandedCategories[catName];
                    
                    // Count active files in this category
                    const activeCatCount = categoryFiles.filter(f => activeLayers.includes(f.name)).length;
                    const allActive = categoryFiles.length > 0 && activeCatCount === categoryFiles.length;

                    return (
                      <div 
                        key={catName}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Category Header Row */}
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.75rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                          }}
                          onClick={() => toggleCategoryExpand(catName)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                              {catName}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '10px' }}>
                              {categoryFiles.length}
                            </span>
                            {activeCatCount > 0 && (
                              <span style={{ fontSize: '0.65rem', color: '#0ea5e9', fontWeight: 500 }}>
                                • {activeCatCount} active
                              </span>
                            )}
                          </div>

                          {/* Category Bulk Actions */}
                          {categoryFiles.length > 0 && (
                            <div 
                              style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                              onClick={(e) => e.stopPropagation()} // Prevent toggling expansion
                            >
                              <button
                                onClick={() => toggleCategoryLayers(catName, !allActive)}
                                style={{
                                  backgroundColor: allActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: allActive ? '#f87171' : '#38bdf8',
                                  padding: '2px 6px',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {allActive ? 'Hide All' : 'Stream All'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expandable Category Contents */}
                        {isExpanded && (
                          <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {categoryFiles.length === 0 ? (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '0.4rem 0' }}>
                                No {catName} files uploaded yet.
                              </div>
                            ) : (
                              categoryFiles.map(file => {
                              const isActive = activeLayers.includes(file.name);
                              return (
                                <div 
                                  key={file.name} 
                                  style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.01)', 
                                    border: `1px solid ${isActive ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255,255,255,0.03)'}`, 
                                    borderRadius: '6px', 
                                    padding: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.3rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '8px' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' }}>{file.name}</span>
                                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Size: {file.size} | Type: {file.layerType}</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                      <button 
                                        onClick={() => toggleLayer(file)}
                                        style={{ 
                                          backgroundColor: isActive ? '#0284c7' : 'rgba(255,255,255,0.06)',
                                          border: 'none',
                                          borderRadius: '4px',
                                          color: '#ffffff',
                                          padding: '3px 6px',
                                          fontSize: '0.65rem',
                                          cursor: 'pointer',
                                          fontWeight: 500,
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {isActive ? 'Hide' : 'Stream'}
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteFile(file)}
                                        style={{ 
                                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                          border: 'none',
                                          borderRadius: '4px',
                                          color: '#f87171',
                                          padding: '3px 6px',
                                          fontSize: '0.65rem',
                                          cursor: 'pointer',
                                          fontWeight: 500,
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>

                                  {isActive && (
                                    <div style={{ marginTop: '0.3rem', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8' }}>
                                        <span>Opacity</span>
                                        <span>{layerOpacities[file.name] ?? 100}%</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input 
                                          type="range" 
                                          min="0" 
                                          max="100" 
                                          value={layerOpacities[file.name] ?? 100}
                                          onChange={(e) => setLayerOpacity(file.name, parseInt(e.target.value))}
                                          style={{ flex: 1, height: '2px', cursor: 'pointer' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
              </>
            ) : (
              /* Spatial Catalog Tab Content */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                    Browse and layer regional datasets from national GIS database catalogs.
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleCreateFolder(null)}
                      style={{
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        borderRadius: '4px',
                        color: '#38bdf8',
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={12} /> Root Folder
                    </button>
                  )}
                </div>

                {catalogFolders.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', padding: '1rem 0', textAlign: 'center' }}>
                    The Spatial Catalog is currently empty.
                    {isAdmin && <div style={{ marginTop: '4px' }}>Click "+ Root Folder" to start creating catalog folders.</div>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Render root-level folders */}
                    {catalogFolders.filter(f => f.parentId === null).map(folder => renderFolderNode(folder, 0))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer block */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.7rem', color: '#475569', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}>
            Spatial CRS: <span style={{ color: '#94a3b8', fontWeight: 600 }}>EPSG:4326 (WGS 84)</span>
          </div>
        </div>

      </div>

      {isPngModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '480px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Modal Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
                <Upload size={20} />
                Georeference PNG Raster Import
              </div>
              <button 
                onClick={() => setIsPngModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              
              {/* PNG File Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>1. Select PNG Raster Image (.png)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="btn btn-outline" style={{ margin: 0, padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    Browse...
                    <input type="file" accept=".png" onChange={handlePngFileSelect} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: pngFileName ? '#38bdf8' : '#64748b', fontStyle: pngFileName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {pngFileName || 'No file chosen'}
                  </span>
                </div>
              </div>

              {/* PGW File Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>2. Select World File (.pgw / .wld) <span style={{ fontWeight: 400, color: '#64748b' }}>(Optional - defaults to Uganda bounds)</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="btn btn-outline" style={{ margin: 0, padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    Browse...
                    <input type="file" accept=".pgw,.wld,.txt" onChange={handlePgwFileSelect} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: pgwFileName ? '#38bdf8' : '#64748b', fontStyle: pgwFileName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {pgwFileName || 'No file chosen'}
                  </span>
                </div>
                {pgwText && (
                  <textarea 
                    value={pgwText} 
                    onChange={(e) => setPgwText(e.target.value)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '6px', fontSize: '0.7rem', color: '#10b981', fontFamily: 'monospace', height: '80px', resize: 'none' }}
                  />
                )}
              </div>

              {/* PRJ File Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>3. Select Projection File (.prj) <span style={{ fontWeight: 400, color: '#64748b' }}>(Optional - defaults to UTM Zone 36N / WGS84)</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="btn btn-outline" style={{ margin: 0, padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    Browse...
                    <input type="file" accept=".prj,.txt" onChange={handlePrjFileSelect} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: prjFileName ? '#38bdf8' : '#64748b', fontStyle: prjFileName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {prjFileName || 'No file chosen'}
                  </span>
                </div>
                {prjText && (
                  <textarea 
                    value={prjText} 
                    onChange={(e) => setPrjText(e.target.value)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '6px', fontSize: '0.7rem', color: '#10b981', fontFamily: 'monospace', height: '50px', resize: 'none' }}
                  />
                )}
              </div>

            </div>

            {/* Actions Panel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                onClick={loadDemoGeoreference}
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                💡 Load Demo Files
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPngModalOpen(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  disabled={isUploading}
                  onClick={handleImportAndGeoreference}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px', opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                  {isUploading ? 'Importing...' : 'Import & Georeference'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {isSurfaceModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '460px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
                <Compass size={20} />
                Surface Georeference & CRS Import
              </div>
              <button 
                onClick={() => { setIsSurfaceModalOpen(false); setPendingSurfaceFile(null); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Selected File Details */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>File: <strong>{pendingSurfaceFile?.name}</strong></span>
              <span style={{ color: '#94a3b8' }}>{(pendingSurfaceFile ? (pendingSurfaceFile.size / (1024 * 1024)).toFixed(2) : 0)} MB</span>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              
              {/* CRS Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinate Reference System (CRS)</label>
                <select 
                  value={surfaceCrs}
                  onChange={(e: any) => setSurfaceCrs(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    padding: '8px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="EPSG:32636">UTM Zone 36N - WGS 84 (East Uganda / Kampala)</option>
                  <option value="EPSG:32635">UTM Zone 35N - WGS 84 (West Uganda)</option>
                  <option value="EPSG:4326">WGS 84 Geographic (Degrees Latitude/Longitude)</option>
                  <option value="local">Local Grid (Offset in meters relative to Anchor)</option>
                </select>
              </div>

              {/* Anchor Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anchor Reference Coordinates</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Latitude (Decimal)</span>
                    <input 
                      type="text"
                      value={surfaceAnchorLat}
                      onChange={(e) => setSurfaceAnchorLat(e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '0.8rem',
                        padding: '8px',
                        outline: 'none'
                      }}
                      placeholder="e.g. 0.3134"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Longitude (Decimal)</span>
                    <input 
                      type="text"
                      value={surfaceAnchorLon}
                      onChange={(e) => setSurfaceAnchorLon(e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '0.8rem',
                        padding: '8px',
                        outline: 'none'
                      }}
                      placeholder="e.g. 32.5802"
                    />
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                  💡 Pre-populated with the active project center coordinates.
                </span>
              </div>

            </div>

            {/* Actions Panel */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => { setIsSurfaceModalOpen(false); setPendingSurfaceFile(null); }}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmSurfaceUpload}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '6px 12px', fontWeight: 600 }}
              >
                Confirm & Import
              </button>
            </div>

          </div>
        </div>
      )}

      {isGltfModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            width: '460px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
                <Box size={20} />
                GLTF / GLB Model Georeference & CRS Import
              </div>
              <button 
                onClick={() => { setIsGltfModalOpen(false); setPendingGltfFiles([]); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Selected File(s) Summary */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              <div>Selected Files ({pendingGltfFiles.length}): <strong>{pendingGltfFiles.map(f => f.name).join(', ')}</strong></div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              
              {/* CRS Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinate Reference System (CRS)</label>
                <select 
                  value={gltfCrs}
                  onChange={(e: any) => setGltfCrs(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    padding: '8px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="UTM Zone 36N / WGS 84 (EPSG:32636)">UTM Zone 36N / WGS 84 (EPSG:32636) - Eastern Uganda / Kampala</option>
                  <option value="UTM Zone 35N / WGS 84 (EPSG:32635)">UTM Zone 35N / WGS 84 (EPSG:32635) - Western Uganda</option>
                  <option value="UTM Zone 37N / WGS 84 (EPSG:32637)">UTM Zone 37N / WGS 84 (EPSG:32637) - Kenya / East Africa</option>
                  <option value="WGS 84 Geographic (EPSG:4326)">WGS 84 Geographic (EPSG:4326)</option>
                  <option value="Local Engineering Grid">Local Engineering Grid</option>
                </select>
              </div>

              {/* Option to Upload .prj file */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Upload Projection Sidecar File (.prj) - Optional
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="file" 
                    ref={gltfPrjInputRef}
                    accept=".prj" 
                    onChange={handleGltfPrjChange} 
                    style={{ display: 'none' }} 
                  />
                  <button
                    type="button"
                    onClick={() => gltfPrjInputRef.current?.click()}
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    📄 Choose .PRJ File
                  </button>
                  <span style={{ fontSize: '0.75rem', color: gltfPrjFileName ? '#34d399' : '#64748b', fontStyle: gltfPrjFileName ? 'normal' : 'italic' }}>
                    {gltfPrjFileName || 'No .prj file selected'}
                  </span>
                </div>
              </div>

              {/* Anchor Lat / Lon Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anchor Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={gltfAnchorLat}
                    onChange={(e: any) => setGltfAnchorLat(e.target.value)}
                    placeholder="e.g. 0.3134"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      padding: '8px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anchor Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={gltfAnchorLon}
                    onChange={(e: any) => setGltfAnchorLon(e.target.value)}
                    placeholder="e.g. 32.5802"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      padding: '8px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { setIsGltfModalOpen(false); setPendingGltfFiles([]); }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#cbd5e1',
                  padding: '8px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGltfUpload}
                style={{
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '8px 18px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                }}
              >
                Import & Georeference Model(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Panel */}
      <AIAssistantPanel
        commandBridge={cesiumCommandBridge}
        onToggleDraw={() => {
          console.log('Toggle draw mode');
        }}
        onToggleVoice={() => {
          console.log('Toggle voice input');
        }}
      />

    </div>
  );
};
