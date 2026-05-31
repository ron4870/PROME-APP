with open('public/PROMEHydrology/app.js', 'r') as f:
    content = f.read()

content = content.replace("function handleFile(file) {", "function handleFile(file, importType) {")

old_ui_update = """  if (importType === 'alignment') {
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

if old_ui_update not in content:
    # It failed before because the old_status_update didn't match perfectly.
    # Let's use regex.
    import re
    content = re.sub(
        r"  xmlDropzone\.style\.display = 'none';\n  fileStatus\.style\.display = 'flex';\n  selectedFileName\.textContent = file\.name;\n  selectedFileSize\.textContent = formatBytes\(file\.size\);",
        old_ui_update,
        content
    )

with open('public/PROMEHydrology/app.js', 'w') as f:
    f.write(content)
