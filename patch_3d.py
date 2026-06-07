import re

def update_file(filename, replacements):
    with open(filename, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filename, 'w') as f:
        f.write(content)

# PEDImageExtractorApp.tsx
app_reps = [
    # Premium left sidebar panels
    ('className="bg-white border border-gray-200 rounded p-5 shadow-sm flex flex-col gap-4"', 'className="panel-3d p-6 flex flex-col gap-5"'),
    
    # Premium bottom dashboard
    ('className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden ring-1 ring-black/5"', 'className="panel-3d p-6 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden"'),
    
    # Status pills
    ('className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 rounded px-2.5 py-1 text-gray-700 shadow-3xs uppercase"', 'className="flex items-center gap-2 pill-3d px-3 py-1.5 text-gray-700 uppercase"'),
    ('className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 rounded px-2.5 py-1 text-gray-700 shadow-3xs uppercase text-orange-700 bg-orange-50/45 border-orange-100"', 'className="flex items-center gap-2 pill-3d px-3 py-1.5 uppercase text-orange-700 bg-orange-50/45 border-orange-200"'),
    
    # The big run extraction button
    ("className={`w-full lg:w-auto h-12 px-8 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 shadow-lg cursor-pointer flex items-center justify-center gap-2.5 ${", "className={`w-full lg:w-auto h-12 px-8 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 ${"),
    ("'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-orange-500/25 active:scale-98'", "'btn-3d-orange'")
]
update_file("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", app_reps)

# ModelQueue.tsx
queue_reps = [
    # Drag zone
    ('className="border-2 border-dashed border-gray-250 hover:border-orange-500 bg-white p-6 rounded flex flex-col items-center justify-center cursor-pointer transition text-center shadow-xs group"', 'className="inset-panel-3d p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group border-2 border-dashed hover:border-orange-500 hover:bg-orange-50/30"'),
    # No items
    ('className="bg-white border border-gray-200 rounded p-8 text-center text-gray-500 text-xs"', 'className="inset-panel-3d p-8 text-center text-gray-500 text-xs"'),
    # Item row
    ("className={`p-3.5 rounded border transition cursor-pointer flex flex-col gap-2 relative group/item overflow-hidden ${", "className={`card-3d p-4 transition cursor-pointer flex flex-col gap-2 relative group/item overflow-hidden ${"),
    ("? 'bg-orange-50/15 border-orange-500 shadow-sm'", "? 'border-orange-400 bg-orange-50/30'"),
    (": 'bg-white border-gray-200 hover:bg-gray-50/50'", ": ''"),
    # Processing Badge
    ('className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBg}`}', 'className={`px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-inner ${statusBg}`}')
]
update_file("src/pages/divisions/PEDImageExtractor/components/ModelQueue.tsx", queue_reps)

# SettingsPanel.tsx
settings_reps = [
    ('className="bg-white border border-gray-200 rounded p-5 shadow-sm flex flex-col gap-5"', 'className="panel-3d p-6 flex flex-col gap-5"'),
    ('className="bg-gray-50 rounded border border-gray-200 p-4 flex flex-col gap-4"', 'className="inset-panel-3d p-5 flex flex-col gap-4"'),
    ('className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-[#0B2240] focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"', 'className="w-full input-3d px-3 py-2 text-xs text-[#0B2240]"'),
    ('className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-orange-500 transition"', 'className="w-full input-3d px-2.5 py-2 text-xs text-gray-800"'),
    ('className="h-8 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 hover:border-gray-300"', 'className="h-9 px-4 text-xs font-bold flex items-center justify-center gap-2 btn-3d-gray"'),
    ('className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"', 'className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 shadow-inner"'),
    ('className="w-full flex items-center justify-center gap-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded py-2 text-xs font-bold transition cursor-pointer"', 'className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold btn-3d-orange"')
]
update_file("src/pages/divisions/PEDImageExtractor/components/SettingsPanel.tsx", settings_reps)

# GeorefMapPreview.tsx
preview_reps = [
    ('className="bg-white border border-gray-200 rounded p-5 shadow-sm h-[320px] flex flex-col"', 'className="panel-3d p-6 h-[320px] flex flex-col"'),
    ('className="flex-1 bg-slate-100 border border-slate-200 rounded mt-3 relative overflow-hidden flex items-center justify-center"', 'className="flex-1 inset-panel-3d mt-4 relative overflow-hidden flex items-center justify-center"'),
    ('className="bg-white border border-gray-200 rounded p-5 shadow-sm flex-1 flex flex-col relative"', 'className="panel-3d p-6 flex-1 flex flex-col relative"'),
    ('className="bg-slate-50 border border-slate-200 rounded overflow-auto mt-3 flex-1 text-[10px] p-3 text-slate-700 font-mono leading-relaxed whitespace-pre font-medium"', 'className="inset-panel-3d overflow-auto mt-4 flex-1 text-[10px] p-4 text-slate-700 font-mono leading-relaxed whitespace-pre font-medium"')
]
update_file("src/pages/divisions/PEDImageExtractor/components/GeorefMapPreview.tsx", preview_reps)

# ThreeCanvas.tsx
canvas_reps = [
    ('className="w-full h-full bg-slate-900 rounded border border-slate-800 relative overflow-hidden flex flex-col shadow-inner"', 'className="w-full h-full bg-[#0B2240] rounded-2xl border-4 border-white/20 relative overflow-hidden flex flex-col shadow-[inset_0_4px_20px_rgba(0,0,0,0.5),0_10px_30px_rgba(11,34,64,0.15)] ring-1 ring-slate-900/50"'),
    ('className="absolute top-3 left-3 flex gap-1 z-10"', 'className="absolute top-4 left-4 flex gap-1.5 z-10"'),
    ('className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider backdrop-blur-sm border transition ${', 'className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider backdrop-blur-md border transition shadow-lg ${'),
    ('className="absolute bottom-3 right-3 z-10 bg-black/50 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-mono border border-white/10"', 'className="absolute bottom-4 right-4 z-10 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-[10px] font-mono border border-white/10 shadow-lg"'),
    ('className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur text-white px-2.5 py-1.5 rounded flex items-center gap-2 border border-white/10 text-[10px] font-bold uppercase tracking-wider"', 'className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-md text-white px-3.5 py-2 rounded-lg flex items-center gap-2.5 border border-white/10 text-[10px] font-bold uppercase tracking-wider shadow-lg"')
]
update_file("src/pages/divisions/PEDImageExtractor/components/ThreeCanvas.tsx", canvas_reps)

