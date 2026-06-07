import re

with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "r") as f:
    content = f.read()

# 1. Update the root wrapper for better gradient background
content = content.replace(
    '<div className="text-slate-800 flex flex-col font-sans selection:bg-[#0B2240]/15 selection:text-[#0B2240] antialiased w-full h-full pb-10" id="application-root">',
    '<div className="text-slate-800 flex flex-col font-sans selection:bg-[#0B2240]/15 selection:text-[#0B2240] antialiased w-full min-h-full pb-10 bg-gradient-to-br from-slate-50 to-slate-200/50" id="application-root">'
)

# 2. Redesign the bottom dashboard
old_dashboard = """        {/* BOTTOM FULL-WIDTH: Image Extraction Launcher Dashboard */}
        <div className="lg:col-span-12 mt-4" id="image-extraction-launcher-dashboard">
          <div className="panel-3d p-6 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden">
            {/* Left Info Column */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                  <Play className="w-5 h-5 text-orange-500 fill-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B2240] uppercase tracking-wider">Raster Geoprocessing Extraction Workspace</h3>
                  <p className="text-xs text-gray-500">Configure parameters, set local directories if supported, then deploy model geometry projections to GIS-ready imagery.</p>
                </div>
              </div>

              {/* Status pills group */}
              <div className="flex flex-wrap gap-2.5 text-[10.5px] font-mono font-bold leading-normal">
                {/* Queue status */}
                <div className="flex items-center gap-2 pill-3d px-3 py-1.5 text-gray-700 uppercase">
                  <Database className="w-3.5 h-3.5 text-gray-400" />
                  <span>Models Prepared: <strong className="text-orange-600 font-extrabold">{queue.length}</strong></span>
                </div>

                {/* Target Projection */}
                <span className="flex items-center gap-2 pill-3d px-3 py-1.5 text-gray-700 uppercase">
                  <Compass className="w-3.5 h-3.5 text-gray-400" />
                  <span>CRS Coordinate Grid: <strong className="text-[#0B2240] font-extrabold">{geoSettings.coordinateSystem === 'WGS84_UTM' ? `WGS84 UTM Zone ${geoSettings.utmZone || 36}${geoSettings.utmHemisphere || 'N'}` : geoSettings.coordinateSystem}</strong></span>
                </span>

                {/* Resolution */}
                <span className="flex items-center gap-2 pill-3d px-3 py-1.5 text-gray-700 uppercase">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span>Target Mesh Res: <strong className="text-orange-600 font-extrabold">{renderingSettings.resolutionWidth} × {renderingSettings.resolutionHeight}px</strong></span>
                </span>

                {/* Target Outputs */}
                <span className="flex items-center gap-2 pill-3d px-3 py-1.5 text-gray-700 uppercase">
                  <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                  <span>Enabled Views: <strong className="text-[#0B2240] font-extrabold">{renderingSettings.views.filter(v => v.enabled).length} alignment(s)</strong></span>
                </span>

                {/* Destination */}
                <span className="flex items-center gap-2 pill-3d px-3 py-1.5 uppercase text-orange-700 bg-orange-50/45 border-orange-200">
                  <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
                  <span>Destination Target: <strong className="text-orange-600 font-extrabold">{selectedDirName ? `Direct Folder [${selectedDirName}]` : 'Bulk ZIP Output Archive'}</strong></span>
                </span>
              </div>
            </div>

            {/* Right Button/Action segment */}
            <div className="shrink-0 w-full lg:w-auto flex flex-col items-center lg:items-end gap-3">
              <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 shadow-inner">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider shrink-0 pl-2">Output Name:</span>
                <input
                  type="text"
                  value={outputFileName}
                  onChange={(e) => setOutputFileName(e.target.value)}
                  className="w-full lg:w-48 input-3d px-3 py-1.5 text-xs text-[#0B2240] font-bold"
                  placeholder="PROME_GIS_Georeferenced_Orthos"
                />
              </div>
              <button
                id="begin-image-extraction-btn"
                onClick={handleProcessBatch}
                disabled={isProcessing || queue.length === 0 || renderingSettings.views.filter(v => v.enabled).length === 0}
                className={`w-full lg:w-auto h-12 px-8 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 ${
                  isProcessing
                    ? 'bg-orange-700 text-white cursor-not-allowed animate-pulse shadow-none'
                    : queue.length === 0
                    ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : renderingSettings.views.filter(v => v.enabled).length === 0
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed hover:bg-amber-200'
                    : 'btn-3d-orange'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin text-white' : 'text-white'}`} />
                <span>{isProcessing ? 'Processing Extractor Engine...' : 'Begin Image Extraction'}</span>
              </button>

              {/* Diagnostic messages/alerts below button */}
              {queue.length === 0 ? (
                <div className="flex items-center gap-1.5 text-red-500 font-bold text-[10px] uppercase font-sans">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Add 3D files to the queue above to unlock</span>
                </div>
              ) : renderingSettings.views.filter(v => v.enabled).length === 0 ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase font-sans">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  <span>Enable at least one perspective view mapping</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  <span>System fully configured & ready</span>
                </div>
              )}
            </div>
          </div>
        </div>"""

new_dashboard = """        {/* BOTTOM FULL-WIDTH: Image Extraction Launcher Dashboard */}
        <div className="lg:col-span-12 mt-2 pb-6" id="image-extraction-launcher-dashboard">
          <div className="panel-3d p-6 flex flex-col xl:flex-row items-center justify-between gap-8 transition-all duration-300 relative overflow-hidden">
            
            {/* Left branding */}
            <div className="flex items-center gap-4 xl:w-1/4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-white shadow-inner border border-slate-200 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-[#0B2240] uppercase tracking-wider">Raster Generation</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Deployment System</p>
              </div>
            </div>

            {/* Center Info Grid */}
            <div className="flex-1 w-full flex items-center justify-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                <div className="inset-panel-3d p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Queue</span>
                  <span className="text-lg font-black text-[#0B2240]">{queue.length} <span className="text-xs text-gray-400 font-medium tracking-normal">models</span></span>
                </div>
                <div className="inset-panel-3d p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Resolution</span>
                  <span className="text-sm font-black text-orange-600">{renderingSettings.resolutionWidth}<span className="text-gray-400 mx-0.5 font-normal">x</span>{renderingSettings.resolutionHeight}</span>
                </div>
                <div className="inset-panel-3d p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Grid Target</span>
                  <span className="text-xs font-black text-[#0B2240]">{geoSettings.coordinateSystem === 'WGS84_UTM' ? `UTM ${geoSettings.utmZone || 36}${geoSettings.utmHemisphere || 'N'}` : 'Custom'}</span>
                </div>
                <div className="inset-panel-3d p-3 flex flex-col items-center justify-center text-center bg-orange-50/50">
                  <span className="text-[10px] text-orange-600/70 font-bold uppercase tracking-wider mb-1">Destination</span>
                  <span className="text-[10px] font-black text-orange-700 truncate w-full px-2" title={selectedDirName ? selectedDirName : 'Bulk ZIP Archive'}>{selectedDirName ? `Dir: ${selectedDirName}` : 'Bulk ZIP Archive'}</span>
                </div>
              </div>
            </div>

            {/* Right Action Stack */}
            <div className="xl:w-1/3 w-full flex flex-col items-end gap-3 border-t xl:border-t-0 xl:border-l border-slate-200/60 pt-4 xl:pt-0 xl:pl-8">
              
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Output Package Name</label>
                <div className="relative w-full">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    className="w-full input-3d pl-9 pr-3 py-2.5 text-xs text-[#0B2240] font-bold focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="PROME_GIS_Georeferenced_Orthos"
                  />
                </div>
              </div>

              <button
                id="begin-image-extraction-btn"
                onClick={handleProcessBatch}
                disabled={isProcessing || queue.length === 0 || renderingSettings.views.filter(v => v.enabled).length === 0}
                className={`w-full h-12 mt-1 px-6 text-[13px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 ${
                  isProcessing
                    ? 'bg-orange-700 text-white cursor-not-allowed animate-pulse shadow-none rounded-xl'
                    : queue.length === 0
                    ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed shadow-none rounded-xl'
                    : renderingSettings.views.filter(v => v.enabled).length === 0
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed hover:bg-amber-200 rounded-xl'
                    : 'btn-3d-orange'
                }`}
              >
                <Sparkles className={`w-4.5 h-4.5 ${isProcessing ? 'animate-spin text-white' : 'text-white'}`} />
                <span>{isProcessing ? 'Processing Extractor Engine...' : 'Begin Image Extraction'}</span>
              </button>

              <div className="w-full flex justify-center mt-1">
                {queue.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-red-500 font-bold text-[10px] uppercase font-sans">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Queue is empty</span>
                  </div>
                ) : renderingSettings.views.filter(v => v.enabled).length === 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase font-sans">
                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                    <span>No views enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                    <span>System Ready for Deployment</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>"""

if old_dashboard in content:
    content = content.replace(old_dashboard, new_dashboard)
    with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "w") as f:
        f.write(content)
    print("Dashboard replaced successfully.")
else:
    print("Could not find the old dashboard block.")
