/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { GeoSettings, OutputGeoSettings, RenderingSettings, CoordinateSystemType, ViewAlignment } from '../types';
import { Settings, Globe, Layers, Sliders, Image, Sparkles } from 'lucide-react';
import { validateCoordinate, parsePRJ, convertCoordinates } from '../utils/geoUtils';

interface SettingsPanelProps {
  geoSettings: GeoSettings;
  setGeoSettings: React.Dispatch<React.SetStateAction<GeoSettings>>;
  outputGeoSettings: OutputGeoSettings;
  setOutputGeoSettings: React.Dispatch<React.SetStateAction<OutputGeoSettings>>;
  renderingSettings: RenderingSettings;
  setRenderingSettings: React.Dispatch<React.SetStateAction<RenderingSettings>>;
  localDirectoryAvailable: boolean;
  onSelectLocalDirectory: () => void;
  selectedDirectoryName: string | null;
  directoryError: { title: string; message: string; isSandbox: boolean } | null;
  setDirectoryError: React.Dispatch<React.SetStateAction<{ title: string; message: string; isSandbox: boolean } | null>>;
}

export default function SettingsPanel({
  geoSettings,
  setGeoSettings,
  outputGeoSettings,
  setOutputGeoSettings,
  renderingSettings,
  setRenderingSettings,
  localDirectoryAvailable: _localDirectoryAvailable,
  
  
  
  
}: SettingsPanelProps) {
  const [latLonErrors, setLatLonErrors] = useState<{ originX?: string; originY?: string }>({});
  const [rrLatInput, setRrLatInput] = useState<string>('0.314209260523411');
  const [rrLonInput, setRrLonInput] = useState<string>('32.5784197109788');

  const handleDownloadCustomPrj = () => {
    const latVal = parseFloat(rrLatInput) || 0.314209260523411;
    const lonVal = parseFloat(rrLonInput) || 32.5784197109788;
    const wkt = `COMPD_CS["CompoundCS",PROJCS["unnamed",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",${latVal}],PARAMETER["central_meridian",${lonVal}],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["Easting",EAST],AXIS["Northing",NORTH]],VERT_CS["EGM96 height",VERT_DATUM["EGM96 geoid",2005,AUTHORITY["EPSG","5171"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Gravity-related height",UP],AUTHORITY["EPSG","5773"]]]`;
    const blob = new Blob([wkt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadrunner_compound_anchor_${latVal.toFixed(4)}_${lonVal.toFixed(4)}.prj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGeoChange = (key: keyof GeoSettings, value: any) => {
    if (key === 'originX' || key === 'originY') {
      const axis = key === 'originX' ? 'X' : 'Y';
      const result = validateCoordinate(String(value), geoSettings.coordinateSystem, axis);
      if (!result.isValid) {
        setLatLonErrors((prev) => ({ ...prev, [key]: result.message }));
      } else {
        setLatLonErrors((prev) => {
          const clone = { ...prev };
          delete clone[key];
          return clone;
        });
      }
    }

    setGeoSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const [prjSuccessMsg, setPrjSuccessMsg] = useState<string | null>(null);
  const [prjErrorMsg, setPrjErrorMsg] = useState<string | null>(null);

  const handlePrjFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const parsed = parsePRJ(file.name, text);
        
        setPrjErrorMsg(null);
        setPrjSuccessMsg(`Loaded projection: "${parsed.prjName}" from ${file.name}`);

        // Convert the existing origin coordinates from old system to parsed projection system
        let convertedX = geoSettings.originX;
        let convertedY = geoSettings.originY;
        
        // Skip conversion if the origin is tied to a georeferenced 3D model
        // where vertices inside the file have fixed coordinate values (e.g. UTM Easting/Northing > 1000)
        const isModelGeoreferenced = Math.abs(geoSettings.originX) > 1000 || Math.abs(geoSettings.originY) > 1000;
        
        if (!isModelGeoreferenced) {
          try {
            const converted = convertCoordinates(
              geoSettings.originX,
              geoSettings.originY,
              geoSettings.coordinateSystem,
              parsed.coordinateSystem,
              geoSettings,
              parsed
            );
            convertedX = converted.x;
            convertedY = converted.y;
          } catch (convErr) {
            console.warn("Failed to convert origin coordinates during PRJ load:", convErr);
          }
        } else {
          console.log("Keeping raw coordinates from model boundary, skipping datum shift conversion to prevent 200m offset");
        }

        setGeoSettings((prev) => {
          const updated: GeoSettings = {
            ...prev,
            originX: convertedX,
            originY: convertedY,
            coordinateSystem: parsed.coordinateSystem,
            loadedPrjWkt: text,
            loadedPrjName: file.name,
          };
          if (parsed.utmZone !== undefined) {
            updated.utmZone = parsed.utmZone;
          }
          if (parsed.utmHemisphere !== undefined) {
            updated.utmHemisphere = parsed.utmHemisphere;
          }
          if (parsed.customTM) {
            updated.customTM = parsed.customTM;
          }
          return updated;
        });

        setOutputGeoSettings((prev) => {
          const updated: OutputGeoSettings = {
            ...prev,
            coordinateSystem: parsed.coordinateSystem,
            loadedPrjWkt: text,
            loadedPrjName: file.name,
          };
          if (parsed.utmZone !== undefined) {
            updated.utmZone = parsed.utmZone;
          }
          if (parsed.utmHemisphere !== undefined) {
            updated.utmHemisphere = parsed.utmHemisphere;
          }
          if (parsed.customTM) {
            updated.customTM = parsed.customTM;
          }
          return updated;
        });

        setTimeout(() => setPrjSuccessMsg(null), 8000);
      } catch (err) {
        console.error("Failed to parse loaded projection file", err);
        setPrjSuccessMsg(null);
        setPrjErrorMsg("Failed to parse .prj file. Ensure it contains a valid WKT description.");
      }
    };
    reader.readAsText(file);
  };

  const handleCoordinateSystemChange = (system: CoordinateSystemType) => {
    let defX = 453200; // Kampala Easting (UTM Zone 36S)
    let defY = 38450;  // Kampala Northing (UTM Zone 36S)
    
    if (system === 'WGS84') {
      defX = 32.5825; // Kampala Longitude in Dec Deg
      defY = 0.3476;  // Kampala Latitude in Dec Deg
    } else if (system === 'WEB_MERCATOR') {
      defX = 3627100;
      defY = 38700;
    } else if (system === 'CUSTOM_METERS') {
      defX = 1000;
      defY = 1000;
    } else if (system === 'CUSTOM_TM') {
      defX = 500000;
      defY = 10000000; // Standard South equatorial TM offset
    }

    setLatLonErrors({});
    setGeoSettings((prev) => {
      const updated: GeoSettings = {
        ...prev,
        coordinateSystem: system,
        originX: defX,
        originY: defY,
        utmZone: prev.utmZone || 36,
        utmHemisphere: prev.utmHemisphere || 'N',
        loadedPrjWkt: undefined,
        loadedPrjName: undefined,
      };
      
      if (!prev.customTM) {
        updated.customTM = {
          centralMeridian: 33.0,
          latitudeOfOrigin: 0.0,
          scaleFactor: 0.9996,
          falseEasting: 500000,
          falseNorthing: 0,
          datumName: 'WGS 84',
        };
      }
      return updated;
    });
  };

  const handleOutputCoordinateSystemChange = (system: CoordinateSystemType) => {
    setOutputGeoSettings((prev) => {
      const updated: OutputGeoSettings = {
        ...prev,
        coordinateSystem: system,
        utmZone: prev.utmZone || 36,
        utmHemisphere: prev.utmHemisphere || 'N',
        loadedPrjWkt: undefined,
        loadedPrjName: undefined,
      };
      
      if (!prev.customTM) {
        updated.customTM = {
          centralMeridian: 33.0,
          latitudeOfOrigin: 0.0,
          scaleFactor: 0.9996,
          falseEasting: 500000,
          falseNorthing: 0,
          datumName: 'WGS 84',
        };
      }
      return updated;
    });
  };

  const isMatchingInput = 
    outputGeoSettings.coordinateSystem === geoSettings.coordinateSystem &&
    outputGeoSettings.loadedPrjWkt === geoSettings.loadedPrjWkt && (
      geoSettings.coordinateSystem !== 'WGS84_UTM' || (
        outputGeoSettings.utmZone === geoSettings.utmZone &&
        outputGeoSettings.utmHemisphere === geoSettings.utmHemisphere
      )
    ) && (
      geoSettings.coordinateSystem !== 'CUSTOM_TM' || (
        outputGeoSettings.customTM?.centralMeridian === geoSettings.customTM?.centralMeridian &&
        outputGeoSettings.customTM?.latitudeOfOrigin === geoSettings.customTM?.latitudeOfOrigin &&
        outputGeoSettings.customTM?.scaleFactor === geoSettings.customTM?.scaleFactor &&
        outputGeoSettings.customTM?.falseEasting === geoSettings.customTM?.falseEasting &&
        outputGeoSettings.customTM?.falseNorthing === geoSettings.customTM?.falseNorthing &&
        outputGeoSettings.customTM?.datumName === geoSettings.customTM?.datumName
      )
    );

  const handleMatchInputCRS = () => {
    setOutputGeoSettings((prev) => ({
      ...prev,
      coordinateSystem: geoSettings.coordinateSystem,
      utmZone: geoSettings.utmZone,
      utmHemisphere: geoSettings.utmHemisphere,
      customTM: geoSettings.customTM ? { ...geoSettings.customTM } : undefined,
      loadedPrjWkt: geoSettings.loadedPrjWkt,
      loadedPrjName: geoSettings.loadedPrjName,
    }));
  };

  React.useEffect(() => {
    if (outputGeoSettings.loadedPrjWkt === geoSettings.loadedPrjWkt && 
        outputGeoSettings.coordinateSystem === geoSettings.coordinateSystem) {
      setOutputGeoSettings((prev) => {
        if (
          prev.coordinateSystem !== geoSettings.coordinateSystem ||
          prev.utmZone !== geoSettings.utmZone ||
          prev.utmHemisphere !== geoSettings.utmHemisphere ||
          prev.loadedPrjWkt !== geoSettings.loadedPrjWkt ||
          prev.loadedPrjName !== geoSettings.loadedPrjName ||
          JSON.stringify(prev.customTM) !== JSON.stringify(geoSettings.customTM)
        ) {
          return {
            ...prev,
            coordinateSystem: geoSettings.coordinateSystem,
            utmZone: geoSettings.utmZone,
            utmHemisphere: geoSettings.utmHemisphere,
            loadedPrjWkt: geoSettings.loadedPrjWkt,
            loadedPrjName: geoSettings.loadedPrjName,
            customTM: geoSettings.customTM ? { ...geoSettings.customTM } : undefined,
          };
        }
        return prev;
      });
    }
  }, [geoSettings, setOutputGeoSettings, outputGeoSettings.coordinateSystem, outputGeoSettings.loadedPrjWkt]);

  const handleOutputGeoChange = (key: keyof OutputGeoSettings, value: any) => {
    setOutputGeoSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleView = (alignment: ViewAlignment) => {
    setRenderingSettings((prev) => ({
      ...prev,
      views: prev.views.map((v) =>
        v.alignment === alignment ? { ...v, enabled: !v.enabled } : v
      ),
    }));
  };

  const handleResWidthChange = (val: number) => {
    setRenderingSettings((prev) => ({
      ...prev,
      resolutionWidth: val,
      resolutionHeight: val,
    }));
  };

  return (
    <div className="flex flex-col gap-6" id="gltf-settings-panel-root">

      {/* 2. SPECIFY LOADED FILE origin LOCATION (INPUT COORDINATE SYSTEM) */}
      <div className="card-3d p-8 !bg-red-50/60 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-3">
          <Globe className="w-6 h-6 text-orange-500 shrink-0" />
          <div>
            <h3 className="text-base font-black text-[#0B2240] uppercase tracking-wider font-sans leading-none">Loaded File Coordinate Frame & Origin</h3>
          </div>
        </div>

        {/* Selected Coordinate Reference System (CRS) */}
        <div className="mb-4 flex flex-col gap-4">
          <div className="inset-panel-3d p-5">
            <label className="block text-gray-500 font-bold uppercase tracking-wide text-[10px] mb-3 font-sans border-b border-gray-200/50 pb-2">Input Projection System (CRS)</label>
          
          {prjSuccessMsg && (
            <div className="mb-2.5 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px] rounded font-medium animate-fadeIn">
              ✅ {prjSuccessMsg}
            </div>
          )}
          {prjErrorMsg && (
            <div className="mb-2.5 p-2 bg-red-50 border border-red-200 text-red-800 text-[10.5px] rounded font-medium animate-fadeIn">
              ❌ {prjErrorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {(['WGS84', 'WGS84_UTM', 'CUSTOM_METERS'] as CoordinateSystemType[]).map((sys) => {
              if (sys === 'CUSTOM_METERS') {
                return (
                  <div key={sys} className="relative">
                    <input
                      type="file"
                      id="prj-file-loader"
                      accept=".prj,.txt"
                      className="hidden"
                      onChange={handlePrjFileLoad}
                      onClick={(e) => {
                        // Reset target value to allow uploading same file again
                        (e.target as HTMLInputElement).value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('prj-file-loader')?.click()}
                      className={`w-full h-full py-2 px-3 text-left rounded text-sm transition cursor-pointer border flex flex-col justify-center leading-snug ${
                        geoSettings.loadedPrjName
                          ? 'bg-emerald-50/70 border-emerald-500 text-emerald-700 font-bold'
                          : geoSettings.coordinateSystem === 'CUSTOM_METERS'
                          ? 'bg-orange-50/70 border-orange-500 text-orange-600 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-sans">Load Projection File</span>
                      {geoSettings.loadedPrjName ? (
                        <span className="text-[9px] text-emerald-600 font-mono truncate max-w-full block font-semibold mt-0.5">
                          📄 {geoSettings.loadedPrjName}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400 truncate max-w-full block mt-0.5">
                          Drag / Select .prj
                        </span>
                      )}
                    </button>
                  </div>
                );
              }

              const isSelected = geoSettings.coordinateSystem === sys && !geoSettings.loadedPrjName;

              return (
                <button
                  key={sys}
                  type="button"
                  onClick={() => handleCoordinateSystemChange(sys)}
                  className={`py-2 px-3 text-left rounded text-sm transition cursor-pointer border ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-500 text-orange-600 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {sys === 'WGS84' && 'WGS 84 GCS (Deg)'}
                  {sys === 'WGS84_UTM' && 'WGS 84 UTM Grid'}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <button
              type="button"
              id="roadrunner-ltm-calibrate-btn"
              onClick={() => {
                if (geoSettings.coordinateSystem === 'CUSTOM_TM') {
                  // Restore standard grid system (e.g., standard UTM)
                  handleCoordinateSystemChange('WGS84_UTM');
                } else {
                  // Toggle on RoadRunner Local TM calibration!
                  setLatLonErrors({});
                  // Convert previous coordinates to WGS84 first to keep the exact same position!
                  const converted = convertCoordinates(
                    geoSettings.originX,
                    geoSettings.originY,
                    geoSettings.coordinateSystem,
                    'WGS84',
                    geoSettings
                  );
                  const currentLon = !isNaN(converted.x) ? converted.x : 32.5825;
                  const currentLat = !isNaN(converted.y) ? converted.y : 0.3476;

                  setGeoSettings((prev) => {
                    return {
                      ...prev,
                      coordinateSystem: 'CUSTOM_TM',
                      originX: 0,
                      originY: 0,
                      alignmentAnchor: 'ORIGIN', // Lock origin at (0,0) of LTM projection
                      customTM: {
                        centralMeridian: currentLon,
                        latitudeOfOrigin: currentLat,
                        scaleFactor: 1.0, // Precision local scale factor of 1.0 (no reduction)
                        falseEasting: 0,
                        falseNorthing: 0,
                        datumName: 'WGS 84',
                      },
                    };
                  });

                  // Automatically update output UTM zone and Hemisphere to match
                  const targetZone = Math.min(60, Math.max(1, Math.floor((currentLon + 180) / 6) + 1));
                  const targetHemisphere = currentLat >= 0 ? 'N' : 'S';

                  setOutputGeoSettings((outPrev) => ({
                    ...outPrev,
                    utmZone: targetZone,
                    utmHemisphere: targetHemisphere,
                  }));
                }
              }}
              className={`w-full py-2.5 px-3 rounded text-sm transition cursor-pointer border flex items-center justify-between font-bold leading-snug shadow-sm ${
                geoSettings.coordinateSystem === 'CUSTOM_TM'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🚗</span>
                <div className="text-left">
                  <span className="block font-black text-[10.5px] uppercase tracking-wide font-sans">MathWorks RoadRunner Calibration</span>
                  <span className="block text-[9px] font-medium text-slate-500 font-sans leading-tight mt-0.5">
                    {geoSettings.coordinateSystem === 'CUSTOM_TM'
                      ? 'Local LTM calibration active (Zero-Rotation). Click to reset.'
                      : 'Zero-Rotation LTM calibration for local high-fidelity road designs.'}
                  </span>
                </div>
              </div>
              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-wide ${
                geoSettings.coordinateSystem === 'CUSTOM_TM'
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-indigo-600 text-white'
              }`}>
                {geoSettings.coordinateSystem === 'CUSTOM_TM' ? 'ACTIVE' : 'CALIBRATE'}
              </span>
            </button>
          </div>
          </div>

          {/* Dynamic Interactive RoadRunner Custom Projection Generator */}
          <div className="inset-panel-3d p-5 text-[11px] text-slate-700 animate-fadeIn">
            <div className="flex items-center justify-between mb-4 border-b border-gray-200/50 pb-2">
              <span className="font-bold text-[#0B2240] uppercase tracking-wider text-[10px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                RoadRunner Custom CS Anchor
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded uppercase">
                Compound CS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wider mb-1">
                  Anchor Lat (°N)
                </label>
                <input
                  type="number"
                  step="any"
                  value={rrLatInput}
                  onChange={(e) => setRrLatInput(e.target.value)}
                  placeholder="e.g. 0.314209"
                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm text-slate-800 font-mono focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wider mb-1">
                  Anchor Lon (°E)
                </label>
                <input
                  type="number"
                  step="any"
                  value={rrLonInput}
                  onChange={(e) => setRrLonInput(e.target.value)}
                  placeholder="e.g. 32.578420"
                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm text-slate-800 font-mono focus:outline-none focus:border-[#0B2240]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const latVal = parseFloat(rrLatInput);
                  const lonVal = parseFloat(rrLonInput);
                  
                  if (isNaN(latVal) || isNaN(lonVal)) {
                    setPrjErrorMsg("Please provide valid coordinates.");
                    return;
                  }
                  if (latVal < -90 || latVal > 90) {
                    setPrjErrorMsg("Latitude must be between -90 and +90 degrees.");
                    return;
                  }
                  if (lonVal < -180 || lonVal > 180) {
                    setPrjErrorMsg("Longitude must be between -180 and +180 degrees.");
                    return;
                  }

                  const wkt = `COMPD_CS["CompoundCS",PROJCS["unnamed",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",${latVal}],PARAMETER["central_meridian",${lonVal}],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["Easting",EAST],AXIS["Northing",NORTH]],VERT_CS["EGM96 height",VERT_DATUM["EGM96 geoid",2005,AUTHORITY["EPSG","5171"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Gravity-related height",UP],AUTHORITY["EPSG","5773"]]]`;
                  const parsed = parsePRJ('roadrunner_custom_compound.prj', wkt);
                  
                  setPrjErrorMsg(null);
                  setPrjSuccessMsg(`Generated Compound CS PRJ at (${latVal.toFixed(6)}°N, ${lonVal.toFixed(6)}°E)`);

                  setGeoSettings((prev) => ({
                    ...prev,
                    coordinateSystem: parsed.coordinateSystem,
                    utmZone: parsed.utmZone,
                    utmHemisphere: parsed.utmHemisphere,
                    customTM: parsed.customTM,
                    loadedPrjWkt: wkt,
                    loadedPrjName: `rr_compound_anchor_${latVal.toFixed(4)}_${lonVal.toFixed(4)}.prj`,
                    originX: 0,
                    originY: 0,
                  }));

                  setOutputGeoSettings((outPrev) => ({
                    ...outPrev,
                    coordinateSystem: 'CUSTOM_METERS',
                    loadedPrjWkt: undefined,
                    loadedPrjName: undefined,
                    utmZone: Math.min(60, Math.max(1, Math.floor((lonVal + 180) / 6) + 1)),
                    utmHemisphere: latVal >= 0 ? 'N' : 'S',
                  }));
                }}
                className="flex-1 bg-[#0B2240] hover:bg-[#15345c] text-white py-1.5 px-2 rounded font-black text-[9.5px] uppercase text-center transition shadow-xs cursor-pointer"
              >
                Generate & Apply
              </button>
              <button
                type="button"
                onClick={handleDownloadCustomPrj}
                className="flex-1 bg-white hover:bg-gray-50 text-slate-700 border border-gray-300 py-1.5 px-2 rounded font-bold text-[9.5px] text-center transition shadow-xs cursor-pointer"
              >
                📥 Download .prj
              </button>
            </div>
          </div>
        </div>

        {/* UTM zone and hemisphere settings */}
        {(geoSettings.coordinateSystem === 'WGS84_UTM') && (
          <div className="mb-4 bg-gray-50/75 p-3.5 rounded border border-gray-200 flex flex-col gap-3 animate-fadeIn">
            <div className="text-sm font-black text-[#0B2240] uppercase tracking-widest border-b border-gray-200 pb-1.5">
              WGS 84 UTM Grid Zone
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-1.5">UTM Zone (1-60)</label>
                <select
                  value={geoSettings.utmZone || 36}
                  onChange={(e) => handleGeoChange('utmZone', parseInt(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-850 focus:outline-none focus:border-[#0B2240] font-mono transition shadow-sm"
                >
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((z) => (
                    <option key={z} value={z}>
                      Zone {z} {z === 36 ? '(Uganda/Kenya)' : z === 37 ? '(East Kenya)' : z === 35 ? '(West Uganda)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-1.5">Hemisphere</label>
                <div className="flex gap-2.5">
                  {(['N', 'S'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleGeoChange('utmHemisphere', h)}
                      className={`flex-1 py-1.5 rounded text-sm font-black transition cursor-pointer border ${
                        geoSettings.utmHemisphere === h
                          ? 'bg-[#0B2240] border-transparent text-white'
                          : 'bg-white border-gray-200 text-slate-500 hover:text-gray-800'
                      }`}
                    >
                      {h === 'N' ? 'N' : 'S'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Transverse Mercator Parameters Panel */}
        {geoSettings.coordinateSystem === 'CUSTOM_TM' && geoSettings.customTM && (
          <div className="mb-4 bg-gray-50/75 p-3.5 rounded border border-gray-200 flex flex-col gap-3">
            <span className="text-sm font-black text-[#0B2240] uppercase tracking-widest block border-b border-gray-200 pb-1.5">
              Custom Transverse Mercator Properties (Input)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-extrabold text-[9px] uppercase tracking-wider mb-1">Central Meridian (λ₀)</label>
                <input
                  type="number"
                  step="0.1"
                  value={geoSettings.customTM.centralMeridian}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const lon = isNaN(val) ? 0 : val;
                    setGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, centralMeridian: lon } : undefined
                    }));
                    // Automatically update output UTM Zone to match
                    const targetZone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1));
                    setOutputGeoSettings((outPrev) => ({
                      ...outPrev,
                      utmZone: targetZone,
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-850 font-mono focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-extrabold text-[9px] uppercase tracking-wider mb-1">Latitude of Origin (φ₀)</label>
                <input
                  type="number"
                  step="0.1"
                  value={geoSettings.customTM.latitudeOfOrigin}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const lat = isNaN(val) ? 0 : val;
                    setGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, latitudeOfOrigin: lat } : undefined
                    }));
                    // Automatically update output UTM hemisphere
                    const targetHemisphere = lat >= 0 ? 'N' : 'S';
                    setOutputGeoSettings((outPrev) => ({
                      ...outPrev,
                      utmHemisphere: targetHemisphere,
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-850 font-mono focus:outline-none focus:border-[#0B2240]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wide mb-1 text-center font-sans">Scale Factor (k₀)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={geoSettings.customTM.scaleFactor}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, scaleFactor: isNaN(val) ? 1.0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-1.5 py-1.5 text-sm text-gray-855 font-mono text-center focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wide mb-1 text-center font-sans">Easting (m)</label>
                <input
                  type="number"
                  value={geoSettings.customTM.falseEasting}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, falseEasting: isNaN(val) ? 0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-1.5 py-1.5 text-sm text-gray-855 font-mono text-center focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wide mb-1 text-center font-sans font-semibold">Northing (m)</label>
                <input
                  type="number"
                  value={geoSettings.customTM.falseNorthing}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, falseNorthing: isNaN(val) ? 0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-1.5 py-1.5 text-sm text-gray-855 font-mono text-center focus:outline-none focus:border-[#0B2240]"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-1">Datum Ellipsoid</label>
              <select
                value={geoSettings.customTM.datumName}
                onChange={(e) => {
                  const val = e.target.value;
                  setGeoSettings(prev => ({
                    ...prev,
                    customTM: prev.customTM ? { ...prev.customTM, datumName: val } : undefined
                  }));
                }}
                className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-[#0B2240] font-mono shadow-sm"
              >
                <option value="WGS 84">WGS 84 (WGS 84 Ellipsoid)</option>
                <option value="Clarke 1880">Clarke 1880 (Cape Datum / local)</option>
                <option value="Adindan">Adindan (Ethiopia / Sudan)</option>
              </select>
            </div>
          </div>
        )}

        {/* Origin Coordinates Input mapping to (0,0,0) of the model */}
        {geoSettings.coordinateSystem === 'CUSTOM_TM' && geoSettings.customTM ? (
          <div className="grid grid-cols-2 gap-6 mb-4 p-3.5 bg-emerald-50/40 border border-emerald-200 rounded animate-fadeIn">
            <div>
              <label className="block text-emerald-900 font-extrabold text-sm uppercase tracking-wider mb-1 px-1">
                Design Origin Longitude (λ₀)
              </label>
              <input
                type="number"
                step="any"
                value={geoSettings.customTM.centralMeridian}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const lon = isNaN(val) ? 0 : val;
                  setGeoSettings((prev) => ({
                    ...prev,
                    customTM: prev.customTM ? { ...prev.customTM, centralMeridian: lon } : undefined
                  }));
                  // Automatically update output UTM Zone to match
                  const targetZone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1));
                  setOutputGeoSettings((outPrev) => ({
                    ...outPrev,
                    utmZone: targetZone,
                  }));
                }}
                className="w-full bg-white border border-emerald-300 rounded px-2.5 py-1.5 text-sm text-emerald-800 font-bold font-mono transition shadow-sm focus:outline-none focus:border-emerald-650"
              />
              <span className="text-[8.5px] text-emerald-600 mt-1 block px-1 leading-tight font-medium font-sans">Sets local TM Central Meridian.</span>
            </div>

            <div>
              <label className="block text-emerald-900 font-extrabold text-sm uppercase tracking-wider mb-1 px-1">
                Design Origin Latitude (φ₀)
              </label>
              <input
                type="number"
                step="any"
                value={geoSettings.customTM.latitudeOfOrigin}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const lat = isNaN(val) ? 0 : val;
                  setGeoSettings((prev) => ({
                    ...prev,
                    customTM: prev.customTM ? { ...prev.customTM, latitudeOfOrigin: lat } : undefined
                  }));
                  // Automatically update output UTM hemisphere
                  const targetHemisphere = lat >= 0 ? 'N' : 'S';
                  setOutputGeoSettings((outPrev) => ({
                    ...outPrev,
                    utmHemisphere: targetHemisphere,
                  }));
                }}
                className="w-full bg-white border border-emerald-300 rounded px-2.5 py-1.5 text-sm text-emerald-800 font-bold font-mono transition shadow-sm focus:outline-none focus:border-emerald-655"
              />
              <span className="text-[8.5px] text-emerald-600 mt-1 block px-1 leading-tight font-medium font-sans">Sets local TM Origin Latitude.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-[#0B2240] font-bold text-sm uppercase tracking-wider mb-1.5">
                {geoSettings.coordinateSystem === 'WGS84' ? 'Longitude (Origin X)' : 'Easting X (Meters)'}
              </label>
              <input
                type="text"
                value={geoSettings.originX}
                onChange={(e) => handleGeoChange('originX', e.target.value)}
                className="w-full bg-white border border-[#F97316]/50 rounded px-3 py-1.5 text-sm text-gray-800 font-semibold focus:outline-none focus:border-[#F97316] font-mono transition shadow-sm bg-orange-50/5"
              />
              {latLonErrors.originX && (
                <span className="text-sm text-red-500 mt-1 block font-semibold">{latLonErrors.originX}</span>
              )}
            </div>

            <div>
              <label className="block text-[#0B2240] font-bold text-sm uppercase tracking-wider mb-1.5">
                {geoSettings.coordinateSystem === 'WGS84' ? 'Latitude (Origin Y)' : 'Northing Y (Meters)'}
              </label>
              <input
                type="text"
                value={geoSettings.originY}
                onChange={(e) => handleGeoChange('originY', e.target.value)}
                className="w-full bg-white border border-[#F97316]/50 rounded px-3 py-1.5 text-sm text-gray-800 font-semibold focus:outline-none focus:border-[#F97316] font-mono transition shadow-sm bg-orange-50/5"
              />
              {latLonErrors.originY && (
                <span className="text-sm text-red-500 mt-1 block font-semibold">{latLonErrors.originY}</span>
              )}
            </div>
          </div>
        )}

        {/* Geographic Alignment Anchor selector */}
        <div className="pt-3 border-t border-gray-150 mb-3">
          <label className="block text-[#0B2240] font-bold text-sm uppercase tracking-wider mb-1.5 font-sans">
            Georeference Origin Anchor
          </label>
          {geoSettings.coordinateSystem === 'CUSTOM_TM' ? (
            <div className="p-3 bg-emerald-50/40 border border-emerald-200 text-[10.5px] text-emerald-850 rounded leading-relaxed animate-fadeIn font-medium">
              🔒 <strong className="font-bold text-emerald-950">Calibration Lock Active</strong>: The local design origin is anchored exactly to the model's coordinate center <code className="bg-emerald-100 px-1 py-0.5 rounded text-sm font-mono text-emerald-900">(0,0,0)</code>. This ensures zero-translation scale convergence and prevents physical shifts on the map.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleGeoChange('alignmentAnchor', 'ORIGIN')}
                className={`py-2 px-2 text-left rounded text-sm transition cursor-pointer border flex flex-col justify-between leading-snug h-22 ${
                  (geoSettings.alignmentAnchor || 'ORIGIN') === 'ORIGIN'
                    ? 'bg-orange-50/75 border-orange-500 text-orange-705 font-bold shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100'
                }`}
              >
                <span className="font-semibold block text-sm">Origin (0,0)</span>
                <span className="text-[8.5px] text-gray-400 font-normal leading-tight mt-1 mb-0.5 block">
                  Maps coordinate exactly to glTF internal (0,0,0).
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleGeoChange('alignmentAnchor', 'CUSTOM')}
                className={`py-2 px-2 text-left rounded text-sm transition cursor-pointer border flex flex-col justify-between leading-snug h-22 ${
                  geoSettings.alignmentAnchor === 'CUSTOM'
                    ? 'bg-orange-50/75 border-orange-500 text-orange-705 font-bold shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100'
                }`}
              >
                <span className="font-semibold block text-sm">Manual Entry</span>
                <span className="text-[8.5px] text-gray-400 font-normal leading-tight mt-1 mb-0.5 block">
                  Define a specific internal glb point.
                </span>
              </button>
            </div>
          )}
          
          {geoSettings.alignmentAnchor === 'CUSTOM' && (
            <div className="mt-3 grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <div>
                <label className="block text-[#0B2240] font-bold text-[9px] uppercase tracking-wider mb-1">Model X</label>
                <input
                  type="number"
                  step="any"
                  value={geoSettings.internalOriginX || 0}
                  onChange={(e) => handleGeoChange('internalOriginX', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[#0B2240] font-bold text-[9px] uppercase tracking-wider mb-1">Model Y</label>
                <input
                  type="number"
                  step="any"
                  value={geoSettings.internalOriginY || 0}
                  onChange={(e) => handleGeoChange('internalOriginY', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[#0B2240] font-bold text-[9px] uppercase tracking-wider mb-1">Model Z</label>
                <input
                  type="number"
                  step="any"
                  value={geoSettings.internalOriginZ || 0}
                  onChange={(e) => handleGeoChange('internalOriginZ', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Model Unit Scale Factor */}
        <div className="pt-3 border-t border-gray-150">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-gray-650 text-[11px] font-semibold">Model Scale Factor</label>
            <span className="text-sm font-mono text-orange-600 font-bold">{geoSettings.scaleFactor}x</span>
          </div>
          <p className="text-sm text-gray-400 mb-2 leading-relaxed">
            Multiplication factor converting your GLTF files unit dimension to real-world meters.
          </p>
          <input
            type="range"
            min="0.1"
            max="10.0"
            step="0.1"
            value={geoSettings.scaleFactor}
            onChange={(e) => handleGeoChange('scaleFactor', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      {/* 3. TARGET EXPORT COORDINATE SYSTEM (OUTPUT Projections) */}
      <div className="card-3d p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2.5">
          <Settings className="w-5 h-5 text-orange-400 shrink-0" />
          <div>
            <h3 className="text-sm font-black text-[#0B2240] uppercase tracking-wider font-sans leading-none">2. Extracted Output Coordinate Projection</h3>
            <p className="text-sm text-gray-400 mt-0.5 leading-none lowercase italic">Choose the final GIS projection of generated PNG & .pgw files.</p>
          </div>
        </div>

        {/* Selected Output Coordinate Reference System (CRS) */}
        <div className="mb-4">
          <label className="block text-gray-400 font-bold uppercase tracking-wide text-[9px] mb-1.5 font-sans">Output Map Projection (Target CRS)</label>
          <div className="grid grid-cols-2 gap-2">
            {(['WGS84', 'WGS84_UTM', 'CUSTOM_METERS'] as CoordinateSystemType[]).map((sys) => {
              const isSelected = outputGeoSettings.coordinateSystem === sys && !isMatchingInput;

              return (
                <button
                  key={sys}
                  type="button"
                  onClick={() => handleOutputCoordinateSystemChange(sys)}
                  className={`py-2 px-3 text-left rounded text-sm transition cursor-pointer border flex flex-col justify-center leading-snug ${
                    isSelected
                      ? 'bg-orange-50/75 border-orange-500 text-orange-705 font-bold shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {sys === 'WGS84' && <span>WGS 84 GCS (Deg)</span>}
                  {sys === 'WGS84_UTM' && <span>WGS 84 UTM Grid</span>}
                  {sys === 'CUSTOM_METERS' && (
                    <>
                      <span>{outputGeoSettings.loadedPrjName ? 'Match Loaded PRJ' : 'Custom Planar (Meters)'}</span>
                      {outputGeoSettings.loadedPrjName ? (
                         <span className="text-[9px] text-[#F97316] font-mono truncate max-w-full block font-semibold mt-0.5">
                           📄 {outputGeoSettings.loadedPrjName}
                         </span>
                       ) : (
                         <span className="text-[9px] text-gray-400 truncate max-w-full block mt-0.5">
                           Relative planar m
                         </span>
                       )}
                     </>
                   )}
                 </button>
               );
             })}
           </div>
         </div>

         {/* Same as Input CRS matching option */}
          <button
            type="button"
            onClick={handleMatchInputCRS}
            className={`mt-2 w-full py-2 px-3.5 text-left rounded text-sm transition border flex items-center justify-between cursor-pointer leading-snug ${
              isMatchingInput
                ? 'bg-indigo-50/75 border-indigo-500 text-indigo-805 font-bold shadow-sm ring-1 ring-indigo-500/10'
                : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 animate-pulse" />
              <div>
                <span className="text-indigo-950 font-black text-[9.5px] uppercase tracking-wider block">Same as Input CRS</span>
                <span className="text-[8px] text-gray-400 font-normal block leading-none">Keeps target output projection synced to input configuration</span>
              </div>
            </div>
            <span className="text-[9px] text-indigo-700 font-bold font-mono bg-white border border-indigo-150 px-2.5 py-0.5 rounded shadow-xs animate-fadeIn">
              {geoSettings.loadedPrjName ? (
                `📄 ${geoSettings.loadedPrjName}`
              ) : geoSettings.coordinateSystem === 'WGS84_UTM' ? (
                `UTM Zone ${geoSettings.utmZone || 36}${geoSettings.utmHemisphere || 'N'}`
              ) : geoSettings.coordinateSystem === 'CUSTOM_TM' && geoSettings.customTM ? (
                `Custom TM (${geoSettings.customTM.centralMeridian}°)`
              ) : geoSettings.coordinateSystem === 'WGS84' ? (
                'WGS 84 GCS'
              ) : (
                'Custom Planar'
              )}
            </span>
          </button>

          {/* Output UTM zone and hemisphere settings */}
         {(outputGeoSettings.coordinateSystem === 'WGS84_UTM') && (
           <div className="mb-4 bg-gray-50/75 p-3.5 rounded border border-gray-200 flex flex-col gap-3 animate-fadeIn">
             <div className="text-sm font-black text-[#0B2240] uppercase tracking-widest border-b border-gray-200 pb-1.5 bg-white px-2 py-1 rounded">
               Output WGS 84 UTM Zone Selection
             </div>
             <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-1.5">UTM Zone (1-60)</label>
                <select
                  value={outputGeoSettings.utmZone || 36}
                  onChange={(e) => handleOutputGeoChange('utmZone', parseInt(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-[#0B2240] font-mono transition shadow-sm"
                >
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((z) => (
                    <option key={z} value={z}>
                      Zone {z} {z === 36 ? '(Uganda/Kenya)' : z === 37 ? '(East Kenya)' : z === 35 ? '(West Uganda)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-1.5">Hemisphere</label>
                <div className="flex gap-2.5">
                  {(['N', 'S'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleOutputGeoChange('utmHemisphere', h)}
                      className={`flex-1 py-1.5 rounded text-sm font-black transition cursor-pointer border ${
                        outputGeoSettings.utmHemisphere === h
                          ? 'bg-[#0B2240] border-transparent text-white'
                          : 'bg-white border-gray-200 text-slate-500 hover:text-gray-800'
                      }`}
                    >
                      {h === 'N' ? 'N' : 'S'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Output Custom Transverse Mercator Params */}
        {outputGeoSettings.coordinateSystem === 'CUSTOM_TM' && outputGeoSettings.customTM && (
          <div className="mb-4 bg-gray-50/75 p-3.5 rounded border border-gray-200 flex flex-col gap-3">
            <span className="text-sm font-black text-[#0B2240] uppercase tracking-widest block border-b border-gray-200 pb-1.5">
              Custom Transverse Mercator Properties (Output)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-extrabold text-[9px] uppercase tracking-wider mb-1">Central Meridian (λ₀)</label>
                <input
                  type="number"
                  step="0.1"
                  value={outputGeoSettings.customTM.centralMeridian}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOutputGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, centralMeridian: isNaN(val) ? 0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-850 font-mono focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-extrabold text-[9px] uppercase tracking-wider mb-1">Latitude of Origin (φ₀)</label>
                <input
                  type="number"
                  step="0.1"
                  value={outputGeoSettings.customTM.latitudeOfOrigin}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOutputGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, latitudeOfOrigin: isNaN(val) ? 0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-855 font-mono focus:outline-none focus:border-[#0B2240]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wide mb-1 text-center font-sans">Scale (k₀)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={outputGeoSettings.customTM.scaleFactor}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOutputGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, scaleFactor: isNaN(val) ? 1.0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-1.5 py-1.5 text-sm text-gray-855 font-mono text-center focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wide mb-1 text-center font-sans">Easting (m)</label>
                <input
                  type="number"
                  value={outputGeoSettings.customTM.falseEasting}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOutputGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, falseEasting: isNaN(val) ? 0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-200 rounded px-1.5 py-1.5 text-sm text-gray-855 font-mono text-center focus:outline-none focus:border-[#0B2240]"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-bold text-[8.5px] uppercase tracking-wide mb-1 text-center font-sans font-semibold">Northing (m)</label>
                <input
                  type="number"
                  value={outputGeoSettings.customTM.falseNorthing}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOutputGeoSettings(prev => ({
                      ...prev,
                      customTM: prev.customTM ? { ...prev.customTM, falseNorthing: isNaN(val) ? 0 : val } : undefined
                    }));
                  }}
                  className="w-full bg-white border border-gray-205 rounded px-1.5 py-1.5 text-sm text-gray-855 font-mono text-center focus:outline-none focus:border-[#0B2240]"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 font-bold text-[9px] uppercase tracking-wider mb-1">Datum Ellipsoid</label>
              <select
                value={outputGeoSettings.customTM.datumName}
                onChange={(e) => {
                  const val = e.target.value;
                  setOutputGeoSettings(prev => ({
                    ...prev,
                    customTM: prev.customTM ? { ...prev.customTM, datumName: val } : undefined
                  }));
                }}
                className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-[#0B2240] font-mono shadow-sm"
              >
                <option value="WGS 84">WGS 84 (WGS 84 Ellipsoid)</option>
                <option value="Clarke 1880">Clarke 1880 (Cape Datum / local)</option>
                <option value="Adindan">Adindan (Ethiopia / Sudan)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. High-LOD Image Extraction Settings */}
      <div className="card-3d p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-[#0B2240] uppercase tracking-wider">Image Render Resolution</h3>
        </div>

        {/* Adjustable Resolution Setting */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-650 text-[11px] font-semibold">Export Pixel Dimensions</label>
            <span className="text-sm font-mono text-orange-600 font-bold">
              {renderingSettings.resolutionWidth} × {renderingSettings.resolutionHeight} px
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2.5 mb-2">
            {[4096, 8192, 16384, 32768].map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => handleResWidthChange(res)}
                className={`py-1 px-1 text-center rounded text-sm font-mono transition cursor-pointer border ${
                  renderingSettings.resolutionWidth === res
                    ? 'bg-[#0B2240] text-white border-transparent'
                    : 'bg-gray-50 border-gray-200 text-slate-500 hover:bg-gray-100'
                }`}
              >
                {res >= 1024 ? `${res / 1024}K` : `${res}px`}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Resolutions represent highly detailed GIS orthophotos. Available options are calibrated for maximum compatibility and GPU resource availability to prevent web context crashes while yielding exceptionally crisp aerial maps.
          </p>
        </div>

        {/* Transparent Background */}
        <div className="flex items-center justify-between mb-4 bg-gray-50 p-2.5 rounded border border-gray-200/80">
          <div>
            <label className="text-sm text-gray-800 font-bold block">Alpha Transparency</label>
            <span className="text-sm text-gray-450">Enable transparent background for GIS overlay.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={renderingSettings.transparentBackground}
              onChange={(e) =>
                setRenderingSettings((prev) => ({
                  ...prev,
                  transparentBackground: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B2240]"></div>
          </label>
        </div>

        {/* Padding Margin Slider */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-gray-650 text-[11px] font-semibold">Ortho framing Padding</label>
            <span className="text-sm font-mono text-orange-600 font-bold">
              {(renderingSettings.paddingRatio * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-2 leading-relaxed">
            Adds a safe boundary buffer around the model boundary so vertical details are safe in orthographic bounds.
          </p>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.05"
            value={renderingSettings.paddingRatio}
            onChange={(e) =>
              setRenderingSettings((prev) => ({
                ...prev,
                paddingRatio: parseFloat(e.target.value),
              }))
            }
            className="w-full h-1 bg-gray-200 rounded appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      {/* 5. Select Perspectives & Texture Exports */}
      <div className="card-3d p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-bold text-[#0B2240] uppercase tracking-wider">Extraction Pipelines</h3>
        </div>

        <div className="space-y-2.5">
          <div className="text-sm tracking-widest uppercase font-extrabold text-[#0B2240] mb-2 border-b border-gray-100 pb-1">PERSPECTIVE MAPPINGS:</div>
          {renderingSettings.views.map((v) => (
            <label
              key={v.alignment}
              className="flex items-center justify-between p-2.5 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100/55 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v.enabled}
                  onChange={() => toggleView(v.alignment)}
                  className="rounded border-gray-350 text-orange-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-orange-500"
                />
                <span className="text-sm text-slate-700 font-semibold">{v.label}</span>
              </div>
              <span className="text-sm text-gray-400 font-mono">*{v.suffix} file</span>
            </label>
          ))}

          <div className="text-sm tracking-widest uppercase font-extrabold text-[#0B2240] pt-3 border-t border-gray-150 mb-2">RAW EMBEDDED TEXTURES:</div>
          <label className="flex items-center justify-between p-2.5 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100/55 transition cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={renderingSettings.extractTextures}
                onChange={(e) =>
                  setRenderingSettings((prev) => ({
                    ...prev,
                    extractTextures: e.target.checked,
                  }))
                }
                className="rounded border-gray-350 text-orange-400 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-orange-500"
              />
              <span className="text-sm text-slate-700 font-semibold">Extract Internal Maps</span>
            </div>
            <Image className="w-3.5 h-3.5 text-orange-500" />
          </label>
        </div>
      </div>
    </div>
  );
}
