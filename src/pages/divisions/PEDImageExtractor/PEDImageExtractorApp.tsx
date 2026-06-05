/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { GLTFQueueItem, GeoSettings, OutputGeoSettings, RenderingSettings, RenderedView, ExtractedTexture } from './types';
import { loadAndParseGLTF, renderOrthoView, canvasToBlob } from './utils/gltfProcessor';
import { generateGeoreference, generatePRJContent } from './utils/geoUtils';
import JSZip from 'jszip';
import ThreeCanvas from './components/ThreeCanvas';
import SettingsPanel from './components/SettingsPanel';
import ModelQueue from './components/ModelQueue';
import GeorefMapPreview from './components/GeorefMapPreview';
import { Compass, Play, Database, FolderOpen, AlertCircle, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import './PEDImageExtractorApp.css';

export default function PEDImageExtractorApp() {
  // Queue list state
  const [queue, setQueue] = useState<GLTFQueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Handled parsing scenes for active previews
  const [parsedScenes, setParsedScenes] = useState<Map<string, THREE.Group>>(new Map());
  const [currentSceneData, setCurrentSceneData] = useState<THREE.Group | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Geographic framework state
  const [geoSettings, setGeoSettings] = useState<GeoSettings>({
    coordinateSystem: 'WGS84_UTM', // Default to UTM Zone for professional surveys
    originX: 453200, // Reasonable default Easting for UTM Zone 36N
    originY: 38450,  // Reasonable default Northing for UTM Zone 36N (Kampala region, ~0.3476° N)
    utmZone: 36, // Uganda / East Kenya standard Zone 36 North
    utmHemisphere: 'N',
    customTM: {
      centralMeridian: 33.0,
      latitudeOfOrigin: 0.0,
      scaleFactor: 0.9996,
      falseEasting: 500000,
      falseNorthing: 0, // Standard Northern hemisphere TM false northing
      datumName: 'WGS 84',
    },
    scaleFactor: 1.0,
    autoCenterOrigin: true,
    alignmentAnchor: 'ORIGIN',
    internalOriginX: 0,
    internalOriginY: 0,
    internalOriginZ: 0,
  });

  // Target output coordinate mapping settings
  const [outputGeoSettings, setOutputGeoSettings] = useState<OutputGeoSettings>({
    coordinateSystem: 'WGS84_UTM',
    utmZone: 36,
    utmHemisphere: 'N',
    customTM: {
      centralMeridian: 33.0,
      latitudeOfOrigin: 0.0,
      scaleFactor: 0.9996,
      falseEasting: 500000,
      falseNorthing: 0,
      datumName: 'WGS 84',
    },
    alignmentAnchor: 'ORIGIN',
    internalOriginX: 0,
    internalOriginY: 0,
    internalOriginZ: 0,
  });

  // Image extracting configuration
  const [renderingSettings, setRenderingSettings] = useState<RenderingSettings>({
    resolutionWidth: 8192,
    resolutionHeight: 8192,
    transparentBackground: true,
    paddingRatio: 0.05,
    extractTextures: true,
    views: [
      { alignment: 'TOP_DOWN', label: 'Plan / Top-Down Ortho', suffix: '_top', enabled: true },
      { alignment: 'SOUTH_ELEVATION', label: 'South Face Elevation', suffix: '_south', enabled: false },
      { alignment: 'EAST_ELEVATION', label: 'East Face Elevation', suffix: '_east', enabled: false },
      { alignment: 'NORTH_ELEVATION', label: 'North Face Elevation', suffix: '_north', enabled: false },
      { alignment: 'WEST_ELEVATION', label: 'West Face Elevation', suffix: '_west', enabled: false },
    ],
  });

  // Windows Local folder sync (FileSystemAccess API)
  const [localDirHandle, setLocalDirHandle] = useState<any | null>(null);
  const [selectedDirName, setSelectedDirName] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<{ title: string; message: string; isSandbox: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, phase: '' });
  const [outputFileName, setOutputFileName] = useState('PROME_GIS_Georeferenced_Orthos');

  // Clean object URL creators
  const objectUrlsMap = React.useRef<Map<string, string>>(new Map());

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsMap.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Update the preview frame viewport model when active queue selection transitions
  useEffect(() => {
    if (!activeId) {
      setCurrentSceneData(null);
      return;
    }

    const scene = parsedScenes.get(activeId);
    if (scene) {
      setCurrentSceneData(scene);

      // Auto-detect raw model origin coordinates from bounding box center
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Absolute value of X or Z > 10m indicates georeferenced survey coordinate models
      const isGeoreferenced = Math.abs(center.x) > 10 || Math.abs(center.z) > 10;
      if (isGeoreferenced && geoSettings.autoCenterOrigin && geoSettings.alignmentAnchor !== 'ORIGIN') {
        const rawX = Number(center.x.toFixed(4));
        const rawY = Number((-center.z).toFixed(4)); // WebGL -Z maps to Northing (+Y) in map space

        setGeoSettings((prev) => {
          if (Math.abs(prev.originX - rawX) > 0.01 || Math.abs(prev.originY - rawY) > 0.01) {
            console.log(`Auto-detected georeferenced model origin: E=${rawX}, N=${rawY}`);
            return {
              ...prev,
              originX: rawX,
              originY: rawY,
            };
          }
          return prev;
        });
      }
    } else {
      setCurrentSceneData(null);
    }
  }, [activeId, parsedScenes, geoSettings.autoCenterOrigin]);

  // Bulk File Upload handler
  const handleUpload = (files: FileList) => {
    const newItems: GLTFQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = crypto.randomUUID();
      const objectUrl = URL.createObjectURL(file);
      objectUrlsMap.current.set(id, objectUrl);

      newItems.push({
        id,
        file,
        name: file.name,
        sizeBytes: file.size,
        status: 'pending',
        progress: 0,
      });
    }

    setQueue((prev) => {
      const updated = [...prev, ...newItems];
      if (!activeId && updated.length > 0) {
        setActiveId(updated[0].id);
      }
      return updated;
    });

    newItems.forEach((item) => {
      analyzeQueueItem(item.id, item.file);
    });
  };

  // Background analysis of geometry bounding boxes and texturing parameters
  const analyzeQueueItem = async (id: string, file: File) => {
    setLoadingPreview(true);
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'loading', progress: 5 } : item))
    );

    try {
      const parseResult = await loadAndParseGLTF(file, (progressVal) => {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, progress: Math.min(progressVal, 95) } : item
          )
        );
      });

      const processedTextures: ExtractedTexture[] = [];
      for (let i = 0; i < parseResult.textures.length; i++) {
        const tex = parseResult.textures[i];
        const blob = await canvasToBlob(tex.canvas);
        const blobUrl = URL.createObjectURL(blob);
        processedTextures.push({
          id: `tex_${i}_${crypto.randomUUID().slice(0, 6)}`,
          name: tex.name,
          width: tex.canvas.width,
          height: tex.canvas.height,
          format: tex.format,
          blobUrl,
          blob,
          sizeBytes: blob.size,
        });
      }

      setParsedScenes((prev) => {
        const clone = new Map(prev);
        clone.set(id, parseResult.scene);
        return clone;
      });

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'completed',
                progress: 100,
                dimensions: parseResult.dimensions,
                verticesCount: parseResult.verticesCount,
                trianglesCount: parseResult.trianglesCount,
                materialCount: parseResult.materialCount,
                textures: processedTextures,
                modelCenter: parseResult.modelCenter,
              }
            : item
        )
      );

      setActiveId((currentId) => {
        if (currentId === id) {
          setCurrentSceneData(parseResult.scene);
        }
        return currentId;
      });

    } catch (err: any) {
      console.error(err);
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'failed',
                errorMessage: err.message || 'Mesh geometry parsing failed',
              }
            : item
        )
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSelectDirectory = async () => {
    const anyWindow = window as any;
    if (!anyWindow.showDirectoryPicker) {
      setDirectoryError({
        title: "Browser API Not Supported",
        message: "Direct local folder writing is only supported in Chromium-based desktop browsers (Google Chrome, Microsoft Edge, Opera). In Safari, Firefox, or mobile devices, you can always batch export and download everything as a single ZIP with one click!",
        isSandbox: false
      });
      return;
    }

    try {
      const handle = await anyWindow.showDirectoryPicker();
      setLocalDirHandle(handle);
      setSelectedDirName(handle.name);
      setDirectoryError(null);
    } catch (err: any) {
      console.warn("User cancelled folder picker or permission rejected: ", err);
      if (err.name === 'AbortError') {
        // User closed the window picker without selecting, no need to show error
        return;
      }
      
      setDirectoryError({
        title: "Security & Sandbox Restriction",
        message: "Your browser blocked direct folder-writing inside this preview iframe. To choose a local folder, please open this application in its own tab where full filesystem access is allowed. Rest assured, you can still download everything as a ZIP instantly without selecting any local folder!",
        isSandbox: true
      });
    }
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeId === id) {
        setActiveId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });

    const url = objectUrlsMap.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsMap.current.delete(id);
    }

    const item = queue.find((q) => q.id === id);
    if (item && item.textures) {
      item.textures.forEach((t) => URL.revokeObjectURL(t.blobUrl));
    }

    setParsedScenes((prev) => {
      const clone = new Map(prev);
      clone.delete(id);
      return clone;
    });
  };

  const handleProcessBatch = async () => {
    if (queue.length === 0) return;
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: queue.length, phase: 'Initializing shaders...' });

    const zip = new JSZip();
    const width = renderingSettings.resolutionWidth;
    const height = renderingSettings.resolutionHeight;
    const transparent = renderingSettings.transparentBackground;
    const padding = renderingSettings.paddingRatio;
    const isLocalWriting = localDirHandle !== null;

    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setProcessingProgress({
          current: i + 1,
          total: queue.length,
          phase: `Rendering orthos: ${item.name}...`,
        });

        let scene = parsedScenes.get(item.id);
        let dimensions = item.dimensions;
        let textures = item.textures || [];
        let modelCenter = item.modelCenter;

        if (!scene || !dimensions) {
          try {
            const parseResult = await loadAndParseGLTF(item.file);
            scene = parseResult.scene;
            dimensions = parseResult.dimensions;
            modelCenter = parseResult.modelCenter;
            const tempTextures: ExtractedTexture[] = [];
            for (let t = 0; t < parseResult.textures.length; t++) {
              const tex = parseResult.textures[t];
              const blob = await canvasToBlob(tex.canvas);
              const blobUrl = URL.createObjectURL(blob);
              tempTextures.push({
                id: `tex_${t}`,
                name: tex.name,
                width: tex.canvas.width,
                height: tex.canvas.height,
                format: tex.format,
                blobUrl,
                blob,
                sizeBytes: blob.size,
              });
            }
            textures = tempTextures;
            
            setParsedScenes((prev) => {
              const m = new Map(prev);
              m.set(item.id, parseResult.scene);
              return m;
            });
          } catch (err) {
            console.error("Failed to parse asset during batch process: ", err);
          }
        }

        if (!scene || !dimensions) {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'failed', errorMessage: 'Could not load asset' } : q))
          );
          continue;
        }

        const baseName = item.name.replace(/\.[^/.]+$/, "");
        const subFolder = isLocalWriting ? null : zip.folder(baseName);

        const activeViews = renderingSettings.views.filter((v) => v.enabled);
        const renderedResults: RenderedView[] = [];

        for (const view of activeViews) {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'rendering', progress: 40 } : q))
          );

          // Calculate grid convergence for top-down raster maps to guarantee pixel-for-pixel alignment in standard projections (UTM)
          let rotationAngleRad = 0;
          if (view.alignment === 'TOP_DOWN' && geoSettings.coordinateSystem === 'CUSTOM_TM' && geoSettings.customTM) {
            const orgLon = geoSettings.customTM.centralMeridian;
            const orgLat = geoSettings.customTM.latitudeOfOrigin;

            if (outputGeoSettings.coordinateSystem === 'WGS84_UTM' || outputGeoSettings.coordinateSystem === 'ARC1960_UTM') {
              const zone = outputGeoSettings.utmZone || 36;
              const cm = zone * 6 - 183;
              const dLonRad = ((orgLon - cm) * Math.PI) / 180;
              const latRad = (orgLat * Math.PI) / 180;
              rotationAngleRad = Math.atan(Math.tan(dLonRad) * Math.sin(latRad));
            }
          }

          const imgBlob = await renderOrthoView(
            scene,
            view.alignment,
            dimensions,
            width,
            height,
            transparent,
            padding,
            rotationAngleRad
          );

          const georefResult = generateGeoreference(
            dimensions,
            geoSettings,
            outputGeoSettings,
            width,
            height,
            view.alignment,
            padding,
            modelCenter,
            rotationAngleRad
          );

          const imageFileName = `${baseName}${view.suffix}.png`;
          const worldFileName = `${baseName}${view.suffix}.pgw`;
          const prjFileName = `${baseName}${view.suffix}.prj`;

          const prjContent = generatePRJContent(outputGeoSettings);

          if (isLocalWriting) {
            try {
              const fileHandleImg = await localDirHandle.getFileHandle(imageFileName, { create: true });
              const writableImg = await fileHandleImg.createWritable();
              await writableImg.write(imgBlob);
              await writableImg.close();

              const fileHandleWld = await localDirHandle.getFileHandle(worldFileName, { create: true });
              const writableWld = await fileHandleWld.createWritable();
              await writableWld.write(new Blob([georefResult.worldFileContent], { type: 'text/plain' }));
              await writableWld.close();

              const fileHandlePrj = await localDirHandle.getFileHandle(prjFileName, { create: true });
              const writablePrj = await fileHandlePrj.createWritable();
              await writablePrj.write(new Blob([prjContent], { type: 'text/plain' }));
              await writablePrj.close();
            } catch (err) {
              console.error("Failed to write to local directory handle: ", err);
            }
          } else if (subFolder) {
            subFolder.file(imageFileName, imgBlob);
            subFolder.file(worldFileName, georefResult.worldFileContent);
            subFolder.file(prjFileName, prjContent);
          }

          renderedResults.push({
            alignment: view.alignment,
            label: view.label,
            suffix: view.suffix,
            imageUrl: URL.createObjectURL(imgBlob),
            imageBlob: imgBlob,
            worldFileContent: georefResult.worldFileContent,
            worldFileName,
            imageName: imageFileName,
            geoBounds: georefResult.bounds,
          });
        }

        if (renderingSettings.extractTextures && textures.length > 0) {
          const texturesFolder = isLocalWriting ? null : subFolder?.folder("embedded_textures");

          for (const tex of textures) {
            const textureName = `${tex.name}.png`;
            if (isLocalWriting) {
              try {
                const fileHandleTex = await localDirHandle.getFileHandle(`texture_${baseName}_${textureName}`, { create: true });
                const writableTex = await fileHandleTex.createWritable();
                await writableTex.write(tex.blob);
                await writableTex.close();
              } catch (err) {
                console.error("Failed to write textures local: ", err);
              }
            } else if (texturesFolder) {
              texturesFolder.file(textureName, tex.blob);
            }
          }
        }

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'completed',
                  progress: 100,
                  renderedViews: renderedResults,
                }
              : q
          )
        );
      }

      if (!isLocalWriting) {
        setProcessingProgress((prev) => ({ ...prev, phase: 'Generating bulk ZIP package download...' }));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        const finalName = outputFileName.trim() || 'PROME_GIS_Georeferenced_Orthos';
        link.download = `${finalName}_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(`Successfully processed and extracted all orthos! Files are saved directly in your Windows folder: ${selectedDirName}`);
      }

    } catch (err: any) {
      console.error(err);
      alert(`Asset bulk processing encountered an error: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const activeItem = queue.find((q) => q.id === activeId) || null;

  return (
    <div className="text-slate-800 flex flex-col font-sans selection:bg-[#0B2240]/15 selection:text-[#0B2240] antialiased w-full min-h-full pb-10 bg-gradient-to-br from-slate-50 to-slate-200/50" id="application-root">
      
      {/* PROME Corporate Spatial GIS Header Banner */}
      

      {/* Primary Dashboard Workspace split */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full pt-6">

        {/* Premium Page Header */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">3D Model Image Extractor</h1>
              <p className="text-base text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                PROME Geotechnical & GIS Engineering
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">v2.4</span>
              </p>
            </div>
          </div>
        </div>

        
        {/* LEFT COLUMN: Queue Uploader + Geographic Alignment Structure */}
        <div className="lg:col-span-5 flex flex-col gap-6 animate-fadeIn" id="left-sidebar-controls">
          
          {/* Section: Queue Processor */}
          <section className="panel-3d p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-orange-500" />
                <h3 className="text-sm font-bold text-[#0B2240] uppercase tracking-wider">Extraction Queue</h3>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-gray-50 px-2 py-0.5 rounded font-bold uppercase transition">
                {queue.length} files loaded
              </span>
            </div>
            
            <ModelQueue
              queue={queue}
              activeId={activeId}
              onSelectActive={setActiveId}
              onRemoveItem={handleRemoveItem}
              onUpload={handleUpload}
            />
          </section>

           {/* Section: Geographic Alignment Settings */}
          <section>
            <SettingsPanel
              geoSettings={geoSettings}
              setGeoSettings={setGeoSettings}
              outputGeoSettings={outputGeoSettings}
              setOutputGeoSettings={setOutputGeoSettings}
              renderingSettings={renderingSettings}
              setRenderingSettings={setRenderingSettings}
              localDirectoryAvailable={!!(window as any).showDirectoryPicker}
              onSelectLocalDirectory={handleSelectDirectory}
              selectedDirectoryName={selectedDirName}
              directoryError={directoryError}
              setDirectoryError={setDirectoryError}
            />
          </section>
        </div>

        {/* RIGHT COLUMN: Active interactive preview, HUD stats, and Spatial feedback */}
        <div className="lg:col-span-7 flex flex-col gap-6 animate-fadeIn">
          {/* Main Renderer frame viewport */}
          <div className="h-[430px] flex-none">
            <ThreeCanvas
              activeFile={activeItem}
              sceneData={currentSceneData}
              loading={loadingPreview}
              geoSettings={geoSettings}
            />
          </div>

          {/* Map Preview & World file structure */}
          <div className="flex-1">
            <GeorefMapPreview
              activeFile={activeItem}
              geoSettings={geoSettings}
              outputGeoSettings={outputGeoSettings}
            />
          </div>
        </div>

        {/* BOTTOM FULL-WIDTH: Output Destination Settings & Launcher Dashboard */}
        <div className="lg:col-span-12 mt-2 pb-6 flex flex-col gap-6" id="image-extraction-launcher-dashboard">
          
          {/* Output Destination Settings */}
          <div className="card-3d p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2 border-b border-gray-100 pb-4">
              <FolderOpen className="w-6 h-6 text-orange-500" />
              <h3 className="text-base font-black text-[#0B2240] uppercase tracking-wider font-sans opacity-95">Output Destination Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Output File Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Output File/Package Name</label>
                <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                  Provide a base name for the output files. If downloading as ZIP, this will be the zip archive name. If saving directly to a local folder, files will be prefixed with this name.
                </p>
                <div className="relative w-full">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    className="w-full input-3d pl-10 pr-4 py-3 text-sm text-[#0B2240] font-bold focus:ring-2 focus:ring-orange-500/50 transition-all bg-white"
                    placeholder="PROME_GIS_Georeferenced_Orthos"
                  />
                </div>
              </div>

              {/* Automated Output Folder */}
              <div className="flex flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-8 pt-6 md:pt-0">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Automated Output Folder</label>
                <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                  Extracted images and PGW world files can be saved **automatically** directly into a designated local folder using modern browser filesystem APIs!
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectDirectory}
                    className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wider rounded border transition cursor-pointer ${
                      selectedDirName
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-[#0B2240] hover:bg-[#123866] text-white border-transparent'
                    }`}
                  >
                    {selectedDirName ? 'Change Local Folder' : 'Select Local Location'}
                  </button>
                </div>
                
                {directoryError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 animate-fadeIn" id="dir-error-msg">
                    <div className="flex items-center gap-2.5 font-bold mb-1">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <span>{directoryError.title}</span>
                    </div>
                    <p className="leading-relaxed text-xs text-red-650">
                      {directoryError.message}
                    </p>
                    {directoryError.isSandbox && (
                      <div className="mt-3 flex items-center gap-2">
                        <a 
                          href={window.location.origin + window.location.pathname}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0B2240] hover:bg-[#123866] text-white font-extrabold text-xs uppercase tracking-wider rounded transition"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                          Open standalone tab
                        </a>
                        <button
                          onClick={() => setDirectoryError(null)}
                          className="text-xs text-red-500 hover:text-red-700 uppercase font-black tracking-wider transition ml-auto"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    {!directoryError.isSandbox && (
                      <div className="mt-2 flex">
                        <button
                          onClick={() => setDirectoryError(null)}
                          className="text-xs text-red-500 hover:text-red-700 uppercase font-black tracking-wider transition ml-auto"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedDirName && (
                  <div className="mt-2 px-3 py-2 bg-emerald-50/50 rounded border border-emerald-200 text-sm font-mono text-emerald-700 break-all flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span>OS Path: {selectedDirName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Launcher Dashboard */}
          <div className="panel-3d p-6 flex flex-col sm:flex-row bg-white/60 text-slate-800 backdrop-blur-md shadow-2xl items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden">
            
            {/* Left branding */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-white shadow-inner border border-slate-200 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Raster Deployment System</h3>
                <div className="mt-1">
                  {queue.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase font-sans">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Queue is empty</span>
                    </div>
                  ) : renderingSettings.views.filter(v => v.enabled).length === 0 ? (
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase font-sans">
                      <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                      <span>No views enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-green-400 font-bold text-xs uppercase font-sans">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                      <span>System Ready for Deployment</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Stack */}
            <button
              id="begin-image-extraction-btn"
              onClick={handleProcessBatch}
              disabled={isProcessing || queue.length === 0 || renderingSettings.views.filter(v => v.enabled).length === 0}
              className={`w-full sm:w-auto h-14 px-10 text-sm font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shrink-0 ${
                isProcessing
                  ? 'bg-orange-700 text-white cursor-not-allowed animate-pulse shadow-none rounded-xl'
                  : queue.length === 0
                  ? 'bg-slate-700 border border-slate-600 text-slate-400 cursor-not-allowed shadow-none rounded-xl'
                  : renderingSettings.views.filter(v => v.enabled).length === 0
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed hover:bg-amber-200 rounded-xl'
                  : 'btn-3d-orange'
              }`}
            >
              <Sparkles className={`w-5 h-5 ${isProcessing ? 'animate-spin text-white' : 'text-white'}`} />
              <span>{isProcessing ? 'Processing Engine...' : 'Extract Images'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Floating Processing Banner */}
      {isProcessing && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-white px-5 py-4 rounded border border-orange-200 shadow-2xl z-50 flex flex-col gap-3 font-sans animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center border border-orange-200 shrink-0">
              <Sparkles className="w-4 h-4 text-orange-500 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-white">Raster Geoprocess Active</h4>
              <p className="text-xs text-slate-300 truncate mt-0.5">{processingProgress.phase}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Overall progress</span>
              <span className="text-orange-600 font-bold">
                {processingProgress.current} of {processingProgress.total} Files
              </span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Corporate Footer */}
      
    </div>
  );
}
