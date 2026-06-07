with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "r") as f:
    content = f.read()

old_dash = """        {/* BOTTOM FULL-WIDTH: Image Extraction Launcher Dashboard */}
        <div className="lg:col-span-12 mt-2 pb-6" id="image-extraction-launcher-dashboard">
          <div className="panel-3d p-6 flex flex-col xl:flex-row bg-[#0B2240] text-white shadow-2xl items-center justify-between gap-8 transition-all duration-300 relative overflow-hidden">
            
            {/* Left branding */}
            <div className="flex items-center gap-4 xl:w-1/4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-white shadow-inner border border-slate-200 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Raster Generation</h3>
                <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-0.5">Deployment System</p>
              </div>
            </div>

            {/* Center Info Grid */}
            <div className="flex-1 w-full flex items-center justify-center">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                <div className="bg-[#112D52] border border-slate-700/50 rounded-xl shadow-inner p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">Queue</span>
                  <span className="text-lg font-black text-white">{queue.length} <span className="text-xs text-slate-400 font-medium tracking-normal">models</span></span>
                </div>
                <div className="bg-[#112D52] border border-slate-700/50 rounded-xl shadow-inner p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">Resolution</span>
                  <span className="text-sm font-black text-orange-600">{renderingSettings.resolutionWidth}<span className="text-slate-400 mx-0.5 font-normal">x</span>{renderingSettings.resolutionHeight}</span>
                </div>
                <div className="bg-[#112D52] border border-slate-700/50 rounded-xl shadow-inner p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">Grid Target</span>
                  <span className="text-xs font-black text-white">{geoSettings.coordinateSystem === 'WGS84_UTM' ? `UTM ${geoSettings.utmZone || 36}${geoSettings.utmHemisphere || 'N'}` : 'Custom'}</span>
                </div>
                <div className="bg-[#112D52] border border-slate-700/50 rounded-xl shadow-inner p-3 flex flex-col items-center justify-center text-center bg-[#15345E] border-orange-500/30 border">
                  <span className="text-xs text-orange-300 font-bold uppercase tracking-wider mb-1">Destination</span>
                  <span className="text-xs font-black text-orange-200 truncate w-full px-2" title={selectedDirName ? selectedDirName : 'Bulk ZIP Archive'}>{selectedDirName ? `Dir: ${selectedDirName}` : 'Bulk ZIP Archive'}</span>
                </div>
              </div>
            </div>

            {/* Right Action Stack */}
            <div className="xl:w-1/3 w-full flex flex-col items-end gap-3 border-t xl:border-t-0 xl:border-l border-slate-700 pt-4 xl:pt-0 xl:pl-8">
              
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Output Package Name</label>
                <div className="relative w-full">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    className="w-full input-3d pl-9 pr-3 py-2.5 text-xs text-white font-bold focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="PROME_GIS_Georeferenced_Orthos"
                  />
                </div>
              </div>

              <button
                id="begin-image-extraction-btn"
                onClick={handleProcessBatch}
                disabled={isProcessing || queue.length === 0 || renderingSettings.views.filter(v => v.enabled).length === 0}
                className={`w-full h-12 mt-1 px-6 text-sm font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 ${
                  isProcessing
                    ? 'bg-orange-700 text-white cursor-not-allowed animate-pulse shadow-none rounded-xl'
                    : queue.length === 0
                    ? 'bg-gray-100 border border-gray-200 text-slate-400 cursor-not-allowed shadow-none rounded-xl'
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
                  <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                    <span>System Ready for Deployment</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>"""

new_dash = """        {/* BOTTOM FULL-WIDTH: Image Extraction Launcher Dashboard */}
        <div className="lg:col-span-12 mt-2 pb-6" id="image-extraction-launcher-dashboard">
          <div className="panel-3d p-6 flex flex-col md:flex-row bg-[#0B2240] text-white shadow-2xl items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden">
            
            {/* Left branding */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-white shadow-inner border border-slate-200 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-orange-500 fill-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Raster Deployment System</h3>
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
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
              
              <div className="w-full sm:w-64 flex flex-col gap-1.5">
                <div className="relative w-full">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={outputFileName}
                    onChange={(e) => setOutputFileName(e.target.value)}
                    className="w-full input-3d pl-9 pr-3 py-3 text-sm text-[#0B2240] font-bold focus:ring-2 focus:ring-orange-500/50 transition-all bg-white"
                    placeholder="Output File Name"
                  />
                </div>
              </div>

              <button
                id="begin-image-extraction-btn"
                onClick={handleProcessBatch}
                disabled={isProcessing || queue.length === 0 || renderingSettings.views.filter(v => v.enabled).length === 0}
                className={`w-full sm:w-auto h-12 px-8 text-sm font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 shrink-0 ${
                  isProcessing
                    ? 'bg-orange-700 text-white cursor-not-allowed animate-pulse shadow-none rounded-xl'
                    : queue.length === 0
                    ? 'bg-slate-700 border border-slate-600 text-slate-400 cursor-not-allowed shadow-none rounded-xl'
                    : renderingSettings.views.filter(v => v.enabled).length === 0
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed hover:bg-amber-200 rounded-xl'
                    : 'btn-3d-orange'
                }`}
              >
                <Sparkles className={`w-4.5 h-4.5 ${isProcessing ? 'animate-spin text-white' : 'text-white'}`} />
                <span>{isProcessing ? 'Processing Engine...' : 'Extract Images'}</span>
              </button>

            </div>
          </div>
        </div>"""

if old_dash in content:
    content = content.replace(old_dash, new_dash)
    with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "w") as f:
        f.write(content)
    print("Dashboard simplified successfully.")
else:
    print("Could not find the old dashboard block.")
