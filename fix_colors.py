with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "r") as f:
    content = f.read()

# Restore the dark color for text in the main layout (lines 500+ usually)
# The "Extraction Queue" header
content = content.replace(
    '<h3 className="text-sm font-bold text-white uppercase tracking-wider">Extraction Queue</h3>',
    '<h3 className="text-sm font-bold text-[#0B2240] uppercase tracking-wider">Extraction Queue</h3>'
)

# Any other accidental text-white replacements in the main grid
content = content.replace('selection:text-white', 'selection:text-[#0B2240]')

# The dashboard at the bottom should keep text-white
# Let's just make sure the top title isn't affected:
# <h1 className="text-3xl font-black text-slate-800 tracking-tight">3D Model Image Extractor</h1> (This used text-slate-800 so it was safe)

with open("src/pages/divisions/PEDImageExtractor/PEDImageExtractorApp.tsx", "w") as f:
    f.write(content)
