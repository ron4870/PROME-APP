import sys

with open('src/pages/divisions/PEDImageExtractor/components/SettingsPanel.tsx', 'r') as f:
    content = f.read()

# 1. Change the wrapper and start the first inset panel
old_wrapper = """        {/* Selected Coordinate Reference System (CRS) */}
        <div className="mb-4">
          <label className="block text-gray-400 font-bold uppercase tracking-wide text-[9px] mb-1.5 font-sans">Input Projection System (CRS)</label>"""

new_wrapper = """        {/* Selected Coordinate Reference System (CRS) */}
        <div className="mb-4 flex flex-col gap-4">
          <div className="inset-panel-3d p-5">
            <label className="block text-gray-500 font-bold uppercase tracking-wide text-[10px] mb-3 font-sans border-b border-gray-200/50 pb-2">Input Projection System (CRS)</label>"""

content = content.replace(old_wrapper, new_wrapper)

# 2. Close the first inset panel, and update the RoadRunner block
old_roadrunner = """            </button>
          </div>

          {/* Dynamic Interactive RoadRunner Custom Projection Generator */}
          <div className="mt-3.5 bg-slate-50 border border-slate-200 rounded p-3.5 text-[11px] text-slate-700 animate-fadeIn shadow-inner">
            <div className="flex items-center justify-between mb-4">"""

new_roadrunner = """            </button>
          </div>
          </div>

          {/* Dynamic Interactive RoadRunner Custom Projection Generator */}
          <div className="inset-panel-3d p-5 text-[11px] text-slate-700 animate-fadeIn">
            <div className="flex items-center justify-between mb-4 border-b border-gray-200/50 pb-2">"""

content = content.replace(old_roadrunner, new_roadrunner)

with open('src/pages/divisions/PEDImageExtractor/components/SettingsPanel.tsx', 'w') as f:
    f.write(content)
