import re

with open('public/PROMEHydrology/app.js', 'r') as f:
    content = f.read()

# Replace DOM elements
old_dom = """const xmlDropzone = document.getElementById('xml-dropzone');
const xmlFileInput = document.getElementById('xml-file-input');
const fileStatus = document.getElementById('file-status');
const selectedFileName = document.getElementById('selected-file-name');
const selectedFileSize = document.getElementById('selected-file-size');
const removeFileBtn = document.getElementById('remove-file-btn');"""

new_dom = """const alignmentDropzone = document.getElementById('alignment-dropzone');
const alignmentFileInput = document.getElementById('alignment-file-input');
const alignmentFileStatus = document.getElementById('alignment-file-status');
const alignmentFileName = document.getElementById('alignment-file-name');
const removeAlignmentBtn = document.getElementById('remove-alignment-btn');

const surfaceDropzone = document.getElementById('surface-dropzone');
const surfaceFileInput = document.getElementById('surface-file-input');
const surfaceFileStatus = document.getElementById('surface-file-status');
const surfaceFileName = document.getElementById('surface-file-name');
const removeSurfaceBtn = document.getElementById('remove-surface-btn');"""

content = content.replace(old_dom, new_dom)

# Replace event listeners
old_listeners = """xmlDropzone.addEventListener('click', () => xmlFileInput.click());
xmlDropzone.addEventListener('dragover', (e) => { e.preventDefault(); xmlDropzone.classList.add('dragover'); });
xmlDropzone.addEventListener('dragleave', () => { xmlDropzone.classList.remove('dragover'); });
xmlDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  xmlDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
xmlFileInput.addEventListener('change', () => {
  if (xmlFileInput.files.length > 0) handleFile(xmlFileInput.files[0]);
});
removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetFileState();
});"""

new_listeners = """// Alignment
alignmentDropzone.addEventListener('click', () => alignmentFileInput.click());
alignmentDropzone.addEventListener('dragover', (e) => { e.preventDefault(); alignmentDropzone.classList.add('dragover'); });
alignmentDropzone.addEventListener('dragleave', () => { alignmentDropzone.classList.remove('dragover'); });
alignmentDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  alignmentDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], 'alignment');
});
alignmentFileInput.addEventListener('change', () => {
  if (alignmentFileInput.files.length > 0) handleFile(alignmentFileInput.files[0], 'alignment');
});
removeAlignmentBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.alignments = [];
  alignmentFileStatus.style.display = 'none';
  alignmentDropzone.style.display = 'flex';
  alignmentFileInput.value = '';
  drawAlignment();
});

// Surface
surfaceDropzone.addEventListener('click', () => surfaceFileInput.click());
surfaceDropzone.addEventListener('dragover', (e) => { e.preventDefault(); surfaceDropzone.classList.add('dragover'); });
surfaceDropzone.addEventListener('dragleave', () => { surfaceDropzone.classList.remove('dragover'); });
surfaceDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  surfaceDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0], 'surface');
});
surfaceFileInput.addEventListener('change', () => {
  if (surfaceFileInput.files.length > 0) handleFile(surfaceFileInput.files[0], 'surface');
});
removeSurfaceBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.surfaces = [];
  surfaceFileStatus.style.display = 'none';
  surfaceDropzone.style.display = 'flex';
  surfaceFileInput.value = '';
  drawAlignment();
});"""

content = content.replace(old_listeners, new_listeners)

# Update resetFileState to be specific, or just remove it if unused
content = content.replace("""function resetFileState() {
  xmlFileInput.value = '';
  fileStatus.style.display = 'none';
  xmlDropzone.style.display = 'flex';
  state.alignments = [];
  state.surfaces = [];
  state.activeAlignmentIndex = 0;
  
  if (typeof drawAlignment === 'function') {
    const canvas = document.getElementById('alignment-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.panX = 0; state.panY = 0; state.zoom = 1;
  }
}""", "")

# Update handleFile signature
old_handle = """async function handleFile(file) {"""
new_handle = """async function handleFile(file, importType) {"""
content = content.replace(old_handle, new_handle)

# Update handleFile to update the right UI
old_status_update = """  xmlDropzone.style.display = 'none';
  fileStatus.style.display = 'flex';
  selectedFileName.textContent = file.name;
  selectedFileSize.textContent = formatBytes(file.size);"""

new_status_update = """  if (importType === 'alignment') {
    alignmentDropzone.style.display = 'none';
    alignmentFileStatus.style.display = 'flex';
    alignmentFileName.textContent = file.name;
    state.alignments = [];
  } else {
    surfaceDropzone.style.display = 'none';
    surfaceFileStatus.style.display = 'flex';
    surfaceFileName.textContent = file.name;
    state.surfaces = [];
  }"""
content = content.replace(old_status_update, new_status_update)

with open('public/PROMEHydrology/app.js', 'w') as f:
    f.write(content)

