with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "r") as f:
    content = f.read()

old_dash = """        {/* BOTTOM FULL-WIDTH: Image Extraction Launcher Dashboard */}
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

new_dash = """        {/* BOTTOM FULL-WIDTH: Output Destination Settings & Launcher Dashboard */}
        <div className="lg:col-span-12 mt-2 pb-6 flex flex-col gap-6" id="image-extraction-launcher-dashboard">
          
          {/* Output Destination Settings */}
          <div className="panel-3d p-8 bg-white flex flex-col gap-4">
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
          <div className="panel-3d p-6 flex flex-col sm:flex-row bg-[#0B2240] text-white shadow-2xl items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden">
            
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
        </div>"""

if old_dash in content:
    content = content.replace(old_dash, new_dash)
    with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "w") as f:
        f.write(content)
    print("Re-arranged Destination settings successfully.")
else:
    print("Could not find the old dashboard block.")
