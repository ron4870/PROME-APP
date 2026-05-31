import re

with open('public/PROMEHydrology/index.html', 'r') as f:
    content = f.read()

# 1. Add dropdowns for Alignment
alignment_dropdowns = """                  <div class="dropzone-prompt">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p class="primary-text">Import Alignment</p>
                    <p class="secondary-text">LandXML / Shapefile</p>
                  </div>
                </div>
                <div class="import-options" style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                  <label style="font-size: 11px; color: var(--text-secondary);">Coord Order:</label>
                  <select id="alignment-coord-order" style="padding: 4px; border-radius: 4px; background: rgba(255,255,255,0.8); border: 1px solid var(--border-color); font-size: 11px;">
                    <option value="NE">Northing-Easting</option>
                    <option value="EN">Easting-Northing</option>
                  </select>
                  <label style="font-size: 11px; color: var(--text-secondary);">Coord System:</label>
                  <select id="alignment-crs" style="padding: 4px; border-radius: 4px; background: rgba(255,255,255,0.8); border: 1px solid var(--border-color); font-size: 11px;"></select>
                </div>"""

content = re.sub(r"""                  <div class="dropzone-prompt">.*?<p class="secondary-text">LandXML / Shapefile</p>\s*</div>\s*</div>""", alignment_dropdowns, content, flags=re.DOTALL)

# 2. Add dropdown for Surface
surface_dropdowns = """                  <div class="dropzone-prompt">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p class="primary-text">Import Surface</p>
                    <p class="secondary-text">LandXML / GeoTIFF</p>
                  </div>
                </div>
                <div class="import-options" style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                  <label style="font-size: 11px; color: var(--text-secondary);">Coord System:</label>
                  <select id="surface-crs" style="padding: 4px; border-radius: 4px; background: rgba(255,255,255,0.8); border: 1px solid var(--border-color); font-size: 11px;"></select>
                </div>"""

content = re.sub(r"""                  <div class="dropzone-prompt">.*?<p class="secondary-text">LandXML / GeoTIFF</p>\s*</div>\s*</div>""", surface_dropdowns, content, flags=re.DOTALL)

with open('public/PROMEHydrology/index.html', 'w') as f:
    f.write(content)
