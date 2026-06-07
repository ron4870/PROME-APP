import re

current_file = "/Users/ronaldkibuuka/antigravity/PROME-GLFT/GLB-IMAGE-EXTRACTOR/src/components/SettingsPanel.tsx"
original_file = "/tmp/SettingsPanel_original.tsx"

with open(current_file, "r") as f:
    current_content = f.read()

with open(original_file, "r") as f:
    original_content = f.read()

# 1. Extract the missing RoadRunner blocks from original
# From `<div className="mt-3">\n            <button\n              type="button"\n              id="roadrunner-ltm-calibrate-btn"`
# to the end of the `<div className="mb-4">` wrapper.
rr_start = original_content.find('<div className="mt-3">\n            <button\n              type="button"\n              id="roadrunner-ltm-calibrate-btn"')
rr_end_match = original_content.find('        {/* UTM zone and hemisphere settings */}', rr_start)
# The block ends just before `        {/* UTM zone and hemisphere settings */}`
# So we capture from rr_start to rr_end_match - 1
if rr_start != -1 and rr_end_match != -1:
    rr_block = original_content[rr_start:rr_end_match]
    # In current_content, we want to insert this right before `        {/* UTM zone and hemisphere settings */}`
    current_content = current_content.replace(
        '        {/* UTM zone and hemisphere settings */}',
        rr_block + '        {/* UTM zone and hemisphere settings */}'
    )
else:
    print("Could not find RoadRunner block in original")

# 2. Extract the missing "Same as Input CRS matching option" block from original
match_start = original_content.find('{/* Same as Input CRS matching option */}')
match_end = original_content.find('{/* Output UTM zone and hemisphere settings */}', match_start)
if match_start != -1 and match_end != -1:
    match_block = original_content[match_start:match_end]
    # In current_content, insert it right before `{/* Output UTM zone and hemisphere settings */}`
    current_content = current_content.replace(
        '        {/* Output UTM zone and hemisphere settings */}',
        '        ' + match_block.lstrip() + '        {/* Output UTM zone and hemisphere settings */}'
    )
else:
    print("Could not find Match CRS block in original")

with open(current_file, "w") as f:
    f.write(current_content)

print("Patch applied.")
