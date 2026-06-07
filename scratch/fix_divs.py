with open("/Users/ronaldkibuuka/antigravity/PROME-GLFT/GLB-IMAGE-EXTRACTOR/src/components/SettingsPanel.tsx", "r") as f:
    lines = f.readlines()

out_lines = []
for i, line in enumerate(lines):
    # Around line 424, we have:
    # 423:           </div>
    # 424:         </div>
    # 425: 
    # 426: <div className="mt-3">
    # We want to remove line 424! Because the `rr_block` ends with the closing `</div>` for the `mb-4` div.
    # Let's check for this specific pattern to remove the extra </div>
    if i == 423 and line.strip() == "</div>":
        # Check if line 425 contains `<div className="mt-3">`
        if "<div className=\"mt-3\">" in lines[425]:
            # Skip this line 423!
            continue
    out_lines.append(line)

with open("/Users/ronaldkibuuka/antigravity/PROME-GLFT/GLB-IMAGE-EXTRACTOR/src/components/SettingsPanel.tsx", "w") as f:
    f.writelines(out_lines)
print("Fixed divs")
