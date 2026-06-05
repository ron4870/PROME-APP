/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// import React from 'react';
import type { GLTFQueueItem, GeoSettings, OutputGeoSettings,  } from '../types';
import { generateGeoreference, convertCoordinates } from '../utils/geoUtils';
import { Map, Compass, Info, Globe, Code } from 'lucide-react';

interface GeorefMapPreviewProps {
  activeFile: GLTFQueueItem | null;
  geoSettings: GeoSettings;
  outputGeoSettings: OutputGeoSettings;
}

export default function GeorefMapPreview({ activeFile, geoSettings, outputGeoSettings }: GeorefMapPreviewProps) {
  let mockGeoref = null;
  let convertedX = geoSettings.originX;
  let convertedY = geoSettings.originY;
  
  if (activeFile && activeFile.dimensions) {
    mockGeoref = generateGeoreference(
      activeFile.dimensions,
      geoSettings,
      outputGeoSettings,
      1024, // arbitrary render size for preview calculation
      1024,
      'TOP_DOWN',
      0.05,
      activeFile.modelCenter
    );

    const converted = convertCoordinates(
      geoSettings.originX,
      geoSettings.originY,
      geoSettings.coordinateSystem,
      outputGeoSettings.coordinateSystem,
      geoSettings,
      outputGeoSettings
    );
    convertedX = converted.x;
    convertedY = converted.y;
  }

  const { coordinateSystem, utmZone, utmHemisphere, customTM } = outputGeoSettings;
  const unit = coordinateSystem === 'WGS84' ? '°' : 'm';
  const inputUnit = geoSettings.coordinateSystem === 'WGS84' ? '°' : 'm';

  let projectionLabel: string = coordinateSystem;
  if (coordinateSystem === 'WGS84') {
    projectionLabel = 'WGS 84 GCS';
  } else if (coordinateSystem === 'WGS84_UTM') {
    projectionLabel = `WGS 84 UTM Zone ${utmZone || 36}${utmHemisphere || 'N'}`;
  } else if (coordinateSystem === 'ARC1960_UTM') {
    projectionLabel = `Arc 1960 UTM Zone ${utmZone || 36}${utmHemisphere || 'N'}`;
  } else if (coordinateSystem === 'CUSTOM_TM') {
    projectionLabel = `Custom TM (CM: ${customTM?.centralMeridian || 33}° / Datum: ${customTM?.datumName || 'Arc 1960'})`;
  } else if (coordinateSystem === 'WEB_MERCATOR') {
    projectionLabel = 'Web Mercator (EPSG:3857)';
  } else if (coordinateSystem === 'CUSTOM_METERS') {
    projectionLabel = outputGeoSettings.loadedPrjName ? `PRJ: ${outputGeoSettings.loadedPrjName}` : 'Custom Planar Ground';
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-5 flex flex-col gap-5 h-full" id="georef-spatial-preview-panel">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-[#cc0000]" />
          <h3 className="text-sm font-bold text-[#0B2240] uppercase tracking-wider">Spatial GIS Footprint Preview</h3>
        </div>
        <span className="text-sm font-mono bg-red-50 px-2 py-0.5 rounded border border-red-200 text-orange-700 font-bold uppercase tracking-wider">
          {projectionLabel}
        </span>
      </div>

      {activeFile && activeFile.dimensions && mockGeoref ? (
        <div className="flex flex-col gap-6 flex-1">
          {/* Conceptual Footprint Map Visualiser */}
          <div className="relative w-full aspect-video bg-gray-50 rounded border border-gray-200 overflow-hidden flex items-center justify-center p-6">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-100"></div>

            {/* Simulated GIS Layers Axes */}
            <div className="absolute left-6 right-6 top-6 bottom-6 border-l border-b border-gray-300 pointer-events-none flex flex-col justify-end">
              <span className="absolute bottom-1 right-1 text-[8px] font-mono text-gray-400 uppercase">Easting (X)</span>
              <span className="absolute top-1 left-2 text-[8px] font-mono text-gray-400 uppercase">Northing (Y)</span>
            </div>

            {/* Bounding box representation */}
            <div className="z-10 bg-red-50/30 border-2 border-dashed border-[#cc0000]/85 rounded flex flex-col items-center justify-center p-6 shadow-sm transition-all duration-300" 
              style={{ width: '60%', height: '65%' }}
            >
              {/* Center Anchor Point */}
              <div className="absolute w-2 h-2 rounded-full bg-[#cc0000]">
                <div className="absolute -inset-1.5 rounded-full border border-orange-400 animate-ping"></div>
              </div>

              <div className="text-sm font-bold text-orange-700 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-red-200 mb-1 shadow-sm">
                GLTF Footprint
              </div>
              <div className="text-[9px] font-mono text-gray-500 text-center font-bold">
                Ref: {activeFile.dimensions.width.toFixed(1)}m × {activeFile.dimensions.depth.toFixed(1)}m
              </div>

              {/* Geo Coordinate Callouts */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded px-2 py-0.5 text-[9px] font-mono text-gray-600 shadow-xs">
                N_Max: {mockGeoref.bounds.maxY.toFixed(4)}{unit}
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded px-2 py-0.5 text-[9px] font-mono text-gray-600 shadow-xs">
                S_Min: {mockGeoref.bounds.minY.toFixed(4)}{unit}
              </div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded px-2 py-0.5 text-[9px] font-mono text-gray-600 shadow-xs">
                W_Min: {mockGeoref.bounds.minX.toFixed(4)}{unit}
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded px-2 py-0.5 text-[9px] font-mono text-gray-600 shadow-xs">
                E_Max: {mockGeoref.bounds.maxX.toFixed(4)}{unit}
              </div>
            </div>

            {/* True Origin Anchor pin */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-white p-2 rounded border border-gray-200 z-10 shadow-sm min-w-[170px]">
              <div className="flex items-center gap-1 select-none">
                <Globe className="w-3 h-3 text-[#cc0000]" />
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[7.5px]">World Anchor Center:</span>
              </div>
              <div className="flex flex-col gap-0.5 text-[8px] font-mono leading-none border-t border-gray-100 pt-1">
                <div className="flex justify-between gap-2 py-0.5">
                  <span className="text-gray-400 font-bold uppercase">Source:</span>
                  <span className="text-[#0B2240] font-bold">{typeof geoSettings.originX === 'number' ? geoSettings.originX.toFixed(geoSettings.coordinateSystem === 'WGS84' ? 5 : 2) : geoSettings.originX}{inputUnit}, {typeof geoSettings.originY === 'number' ? geoSettings.originY.toFixed(geoSettings.coordinateSystem === 'WGS84' ? 5 : 2) : geoSettings.originY}{inputUnit}</span>
                </div>
                {geoSettings.coordinateSystem !== coordinateSystem && (
                  <div className="flex justify-between gap-2 border-t border-dotted border-gray-150 pt-1 pb-0.5">
                    <span className="text-[#cc0000] font-black uppercase">Output:</span>
                    <span className="text-[#cc0000] font-black">{convertedX.toFixed(coordinateSystem === 'WGS84' ? 5 : 2)}{unit}, {convertedY.toFixed(coordinateSystem === 'WGS84' ? 5 : 2)}{unit}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* World File Live Formula Template */}
          <div className="flex flex-col gap-1.5 flex-1 select-none">
            <div className="flex items-center gap-1.5 text-sm text-[#0B2240] font-bold mb-1">
              <Code className="w-4 h-4 text-[#cc0000]" />
              <span>Accompanying World File Output (*.pgw)</span>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 p-6 rounded font-mono text-[11px] text-gray-650 overflow-x-auto relative flex flex-col select-all">
              {mockGeoref.worldFileContent.trim().split('\n').map((line, index) => {
                let formulaDesc = "";
                switch (index) {
                  case 0: formulaDesc = "Pixel Size X (easting resolution)"; break;
                  case 1: formulaDesc = "Y-Rotation Term (standard 0)"; break;
                  case 2: formulaDesc = "X-Rotation Term (standard 0)"; break;
                  case 3: formulaDesc = "Pixel Size Y (northing resolution, negative)"; break;
                  case 4: formulaDesc = "X of Center of top-left pixel"; break;
                  case 5: formulaDesc = "Y of Center of top-left pixel"; break;
                }
                return (
                  <div key={index} className="flex justify-between items-center py-0.5 border-b border-gray-200 gap-8">
                    <span className="text-[#0B2240] font-bold">{line}</span>
                    <span className="text-[9px] text-gray-400 italic text-right shrink-0">{formulaDesc}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 items-start mt-1">
              <Info className="w-3.5 h-3.5 text-[#cc0000] shrink-0 mt-0.5 animate-pulse" />
              <p className="text-sm text-gray-400 leading-normal">
                When opened in GIS softwares like QGIS, ArcGIS, or Global Mapper along with the PNG, 
                this world file defines the exact scaling, coordinate offset, and location dynamically!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 rounded border border-dashed border-gray-300 p-8 text-center min-h-[220px]">
          <Compass className="w-6 h-6 text-gray-300 mb-2 animate-spin-slow" />
          <p className="text-sm">
            Select an active GLTF/GLB model from the processing uploader queue list to calculate georeferenced bounding envelopes and view the live structure of its world file template.
          </p>
        </div>
      )}
    </div>
  );
}
