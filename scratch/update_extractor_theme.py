import os
import glob

replacements = {
    'panel-3d': 'panel-corporate',
    'card-3d': 'card-corporate',
    'btn-3d-orange': 'btn-prome-red',
    'btn-3d-gray': 'btn-corporate-gray',
    'input-3d': 'input-corporate',
    'inset-panel-3d': 'inset-panel-corporate',
    'bg-gradient-to-br from-slate-50 to-slate-200/50': 'bg-[#f5f5f5]',
    '!bg-emerald-50/60': 'bg-white',
    'from-orange-400 to-orange-600': 'from-[#cc0000] to-[#aa0000]',
    'text-orange-500': 'text-[#cc0000]',
    'text-orange-600': 'text-[#cc0000]',
    'bg-orange-500': 'bg-[#cc0000]',
    'bg-orange-600': 'bg-[#cc0000]',
    'bg-orange-700': 'bg-[#990000]',
    'bg-orange-50': 'bg-red-50',
    'border-orange-200': 'border-red-200',
    'border-orange-500': 'border-[#cc0000]',
    'ring-orange-500/50': 'ring-[#cc0000]/50',
    'shadow-orange-500/30': 'shadow-red-500/30',
    'fill-orange-500': 'fill-[#cc0000]',
    'text-emerald-700': 'text-[#cc0000]',
    'border-emerald-300': 'border-[#cc0000]',
    'bg-emerald-50': 'bg-red-50',
    'hover:bg-emerald-100': 'hover:bg-red-100',
    'bg-emerald-50/50': 'bg-red-50/50',
    'border-emerald-200': 'border-red-200',
    'bg-emerald-500': 'bg-[#cc0000]',
    'bg-blue-600': 'bg-[#cc0000]',
    'hover:bg-blue-700': 'hover:bg-[#aa0000]',
    'text-blue-600': 'text-[#cc0000]'
}

base_dir = 'src/pages/divisions/PEDImageExtractor'
files = glob.glob(f'{base_dir}/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if content != new_content:
        with open(file, 'w') as f:
            f.write(new_content)
        print(f"Updated {file}")

