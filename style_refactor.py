import re

def update_file(filename, replacements):
    with open(filename, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filename, 'w') as f:
        f.write(content)

# 1. PEDImageExtractorApp.tsx
app_reps = [
    # Top header
    ('text-2xl font-black', 'text-3xl font-black'),
    ('text-sm text-slate-500 font-medium', 'text-base text-slate-500 font-medium'),
    ('text-[10px]', 'text-xs'),
    
    # Left Column (Queue)
    ('text-xs font-bold text-[#0B2240] uppercase', 'text-sm font-bold text-[#0B2240] uppercase'),
    
    # Bottom Dashboard styling
    ('panel-3d p-6 flex flex-col xl:flex-row', 'panel-3d p-6 flex flex-col xl:flex-row bg-[#0B2240] text-white shadow-2xl'),
    ('text-[#0B2240]', 'text-white'), # for the text inside the dashboard
    ('text-orange-600/70', 'text-orange-300'),
    ('text-orange-700', 'text-orange-200'),
    ('text-gray-500', 'text-slate-300'),
    ('text-gray-400', 'text-slate-400'),
    ('bg-orange-50/50', 'bg-[#15345E] border-orange-500/30 border'),
    ('inset-panel-3d', 'bg-[#112D52] border border-slate-700/50 rounded-xl shadow-inner'),
    ('border-slate-200/60', 'border-slate-700'),
    ('text-[13px]', 'text-sm'),
]
update_file("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", app_reps)

# 2. ModelQueue.tsx
queue_reps = [
    ('text-[10px]', 'text-xs'),
    ('text-xs', 'text-sm'),
    ('p-3.5', 'p-5'),
    ('p-4', 'p-5'),
    ('p-8', 'p-10'),
    ('text-gray-500', 'text-slate-600'),
    ('font-medium text-gray-800', 'font-bold text-slate-800 text-base'),
]
update_file("src/pages/divisions/PEDImageExtractor/components/ModelQueue.tsx", queue_reps)

# 3. SettingsPanel.tsx
settings_reps = [
    ('text-[10px]', 'text-xs'),
    ('text-xs', 'text-sm'),
    ('p-4', 'p-6'),
    ('p-5', 'p-6'),
    ('h-9', 'h-11'),
    ('py-2 text-xs', 'py-3 text-sm'),
    ('text-gray-700', 'text-slate-700'),
    ('text-gray-500', 'text-slate-500'),
    ('text-[#0B2240] font-bold mb-3 uppercase tracking-wider', 'text-[#0B2240] font-black mb-4 uppercase tracking-wider text-base border-b border-slate-200 pb-2'),
    ('w-4 h-4', 'w-5 h-5'),
    ('gap-4', 'gap-6'),
    ('gap-5', 'gap-7'),
    ('gap-1', 'gap-2')
]
update_file("src/pages/divisions/PEDImageExtractor/components/SettingsPanel.tsx", settings_reps)

# 4. GeorefMapPreview.tsx
preview_reps = [
    ('text-[10px]', 'text-xs'),
    ('text-xs', 'text-sm'),
    ('h-[320px]', 'h-[360px]'),
    ('p-3', 'p-5'),
    ('p-4', 'p-6'),
    ('text-slate-700', 'text-slate-800'),
]
update_file("src/pages/divisions/PEDImageExtractor/components/GeorefMapPreview.tsx", preview_reps)

# 5. ThreeCanvas.tsx
canvas_reps = [
    ('text-[10px]', 'text-xs'),
    ('h-[430px]', 'h-[480px]'),
    ('px-3.5 py-2', 'px-4 py-2.5'),
    ('w-4 h-4', 'w-5 h-5'),
]
update_file("src/pages/divisions/PEDImageExtractor/components/ThreeCanvas.tsx", canvas_reps)

print("Styles refactored!")
