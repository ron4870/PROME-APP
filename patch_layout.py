import re

with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "r") as f:
    content = f.read()

# 1. Remove the standalone header (from <header ...> to </header>)
content = re.sub(r'<header.*?</header>', '', content, flags=re.DOTALL)

# 2. Remove the standalone footer (from <footer ...> to </footer>)
content = re.sub(r'<footer.*?</footer>', '', content, flags=re.DOTALL)

# 3. Modify the root div wrapper
content = re.sub(
    r'<div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-\[#0B2240\]/15 selection:text-\[#0B2240\] antialiased" id="application-root">',
    '<div className="text-slate-800 flex flex-col font-sans selection:bg-[#0B2240]/15 selection:text-[#0B2240] antialiased w-full h-full pb-10" id="application-root">',
    content
)

# 4. Add a premium page header inside the <main>
premium_header = """
        {/* Premium Page Header */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">3D Model Image Extractor</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                PROME Geotechnical & GIS Engineering
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">v2.4</span>
              </p>
            </div>
          </div>
        </div>
"""
content = re.sub(
    r'<main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-\[1600px\] w-full mx-auto">',
    '<main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mx-auto">\n' + premium_header,
    content
)

# 5. Make the bottom dashboard look premium glassmorphism
content = content.replace(
    '<div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300">',
    '<div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden ring-1 ring-black/5">'
)
content = content.replace(
    'class="absolute bottom-6 right-6 max-w-sm w-full bg-white px-5 py-4 rounded border border-orange-200 shadow-2xl z-50 flex flex-col gap-3 font-sans animate-slideUp"',
    'class="fixed bottom-6 right-6 max-w-sm w-full bg-white/95 backdrop-blur-lg px-5 py-4 rounded-xl border border-orange-200/50 shadow-[0_20px_50px_-12px_rgba(234,88,12,0.25)] z-50 flex flex-col gap-3 font-sans animate-slideUp ring-1 ring-black/5"'
)

with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "w") as f:
    f.write(content)
