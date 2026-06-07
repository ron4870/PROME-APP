import os
import re

def rep(file, old, new):
    with open(file, 'r') as f:
        c = f.read()
    c = c.replace(old, new)
    with open(file, 'w') as f:
        f.write(c)

base = "src/pages/divisions/PEDImageExtractor/"

rep(base + "components/GeorefMapPreview.tsx", "import React, { useEffect, useState, useRef } from 'react';", "import { useEffect, useState, useRef } from 'react';")
rep(base + "components/GeorefMapPreview.tsx", "ViewAlignment, ", "")

rep(base + "components/SettingsPanel.tsx", "Shield, ", "")
rep(base + "components/SettingsPanel.tsx", "RefreshCw, ", "")
# localDirectoryAvailable is a prop, we can prefix with _
rep(base + "components/SettingsPanel.tsx", "localDirectoryAvailable,", "_localDirectoryAvailable,")

rep(base + "components/ThreeCanvas.tsx", "import React, { useEffect, useRef, useState } from 'react';", "import { useEffect, useRef, useState } from 'react';")
rep(base + "components/ThreeCanvas.tsx", "RotateCcw, ", "")
rep(base + "components/ThreeCanvas.tsx", "const [viewMode, setViewMode]", "const [viewMode]")
rep(base + "components/ThreeCanvas.tsx", "const tileMeters = ", "// const tileMeters = ")

rep(base + "PEDImageExtractorApp.tsx", "HardDrive, ", "")
rep(base + "PEDImageExtractorApp.tsx", "HelpCircle ", "")
rep(base + "PEDImageExtractorApp.tsx", "Sparkles, }", "Sparkles }")

rep(base + "utils/geoUtils.ts", "RenderedView, ", "")

rep(base + "utils/gltfProcessor.ts", "ExtractedTexture, ", "")
rep(base + "utils/gltfProcessor.ts", "RenderedView, ", "")
rep(base + "utils/gltfProcessor.ts", "GeoSettings, ", "")
rep(base + "utils/gltfProcessor.ts", "import { generateGeoreference } from './geoUtils';", "")
rep(base + "utils/gltfProcessor.ts", "scene.traverse((child) => {", "scene.traverse((child: any) => {")
rep(base + "utils/gltfProcessor.ts", "const dimensions = {", "// const dimensions = {")
