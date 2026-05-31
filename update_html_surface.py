import re

with open('public/PROMEHydrology/index.html', 'r') as f:
    html = f.read()

# 1. Inject geotiff script
geotiff_script = '  <!-- GeoTIFF.js -->\n  <script src="https://cdn.jsdelivr.net/npm/geotiff"></script>'
if "geotiff.js" not in html and "geotiff" not in html.lower():
    html = html.replace('</head>', geotiff_script + '\n</head>')

# 2. Add Coordinate Dropdowns to Import Alignment
alignment_dropdowns = """
            <!-- Coordinate Format Details -->
            <div class="form-group" style="margin-top: 15px;">
              <label for="alignment-coord-order">Coordinate Order</label>
              <select id="alignment-coord-order">
                <option value="NE" selected>Northing, Easting (Y, X)</option>
                <option value="EN">Easting, Northing (X, Y)</option>
              </select>
            </div>
            <div class="form-group" style="margin-top: 15px;">
              <label for="alignment-crs">Alignment Coordinate System</label>
              <select id="alignment-crs">
                <!-- Populated dynamically -->
              </select>
            </div>
"""
if "alignment-crs" not in html:
    html = html.replace('<!-- Coordinate Format Details -->', '<!-- Coordinate Format Details Removed to replace with dynamic -->')
    html = re.sub(
        r'(<div class="file-status-container".*?</button>\s*</div>)',
        r'\1' + '\n' + alignment_dropdowns,
        html,
        flags=re.DOTALL
    )

# 3. Create Step 2 (Surface Dropzone)
surface_section = """
        <!-- Step 2: Import Surface Data -->
        <div class="glass-card" id="step-surface-card">
          <div class="card-header">
            <div class="step-badge">2</div>
            <h2>Import Surface File</h2>
          </div>
          <div class="card-body">
            <!-- Drag and Drop Dropzone -->
            <div id="surface-dropzone" class="dropzone">
              <input type="file" id="surface-file-input" accept=".tif,.tiff,.asc,.xml,.landxml" hidden>
              <div class="dropzone-prompt">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p class="primary-text">Drag & Drop GeoTIFF or LandXML</p>
                <p class="secondary-text">or <span class="browse-link" id="surface-browse">browse files</span></p>
              </div>
            </div>
            
            <div class="file-status-container" id="surface-file-status" style="display: none;">
              <div class="file-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div class="file-details">
                <div class="file-name" id="surface-selected-file-name">filename.tif</div>
                <div class="file-size" id="surface-selected-file-size">0 KB</div>
              </div>
              <button id="surface-remove-file-btn" class="circle-btn danger" title="Clear file">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Coordinate System -->
            <div class="form-group" style="margin-top: 15px;">
              <label for="surface-crs">Surface Coordinate System</label>
              <select id="surface-crs">
                <!-- Populated dynamically -->
              </select>
            </div>
          </div>
        </div>
"""
if "step-surface-card" not in html:
    html = html.replace('<!-- Step 2: Coordinate Transformation System -->', surface_section + '\n        <!-- Step 3: Coordinate Transformation System -->')
    html = html.replace('<div class="step-badge">2</div>', '<div class="step-badge">3</div>', 1)

with open('public/PROMEHydrology/index.html', 'w') as f:
    f.write(html)

print("Updated index.html successfully.")
