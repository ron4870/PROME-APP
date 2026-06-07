import os
import re

def rep(file, old, new):
    with open(file, 'r') as f:
        c = f.read()
    c = c.replace(old, new)
    with open(file, 'w') as f:
        f.write(c)

base = "src/pages/divisions/PEDImageExtractor/"

rep(base + "components/GeorefMapPreview.tsx", "import React, {", "import {")
rep(base + "components/GeorefMapPreview.tsx", "ViewAlignment", "")

rep(base + "components/SettingsPanel.tsx", "_localDirectoryAvailable,", "localDirectoryAvailable: _localDirectoryAvailable,")

rep(base + "components/ThreeCanvas.tsx", "import React, {", "import {")

rep(base + "utils/gltfProcessor.ts", "GeoSettings", "")

# The previous dimensions patch didn't match exactly maybe.
# "const dimensions = {"
with open(base + "utils/gltfProcessor.ts", 'r') as f:
    c = f.read()
c = re.sub(r'const dimensions = \{', '// const dimensions = {', c)
with open(base + "utils/gltfProcessor.ts", 'w') as f:
    f.write(c)

