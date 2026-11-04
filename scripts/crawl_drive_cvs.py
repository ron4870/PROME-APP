import urllib.request
import ssl
import re
import json
import time
import sys
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def clean_candidate_name(filename):
    name = filename
    # Remove extension
    name = re.sub(r'\.(pdf|docx?|odt|xlsx?)$', '', name, flags=re.IGNORECASE)
    # Remove common prefixes
    name = re.sub(r'^(CV\s*[-_:]*|CURRICULUM\s*VITAE\s*[-_:]*|UPDATED\s*CV\s*[-_:]*|RESUME\s*[-_:]*)', '', name, flags=re.IGNORECASE)
    # Remove trailing dates, versions, timestamps e.g. _240328_092659, - OCT 23, 2024, 2025, v1, etc.
    name = re.sub(r'[-_]\d{4,8}(_\d{4,8})?$', '', name)
    name = re.sub(r'[-_\s]+(new|v\d+|\d{4}|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|sept)\b.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[-_]+', ' ', name).strip()
    name = re.sub(r'\s+', ' ', name)
    # If still empty, fall back to base filename without extension
    if not name or len(name) < 2:
        name = os.path.splitext(filename)[0]
    return name.title()

def fetch_folder_items(folder_id):
    url = f"https://drive.google.com/drive/folders/{folder_id}?usp=sharing"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        html = urllib.request.urlopen(req, context=ctx, timeout=25).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error requesting folder {folder_id}: {e}", file=sys.stderr)
        return []

    m = re.search(r"key:\s*'ds:3'.*?data:(\[.*?\]),\s*sideChannel:", html, re.DOTALL)
    if not m:
        m = re.search(r"key:\s*'ds:3'.*?data:(\[.*\])\s*\}\);", html, re.DOTALL)
    if not m:
        return []

    try:
        data = json.loads(m.group(1))
        items_container = data[27][7][0][0]
    except Exception as e:
        return []

    results = []
    for item in items_container:
        def collect(x):
            r = []
            if isinstance(x, str): r.append(x)
            elif isinstance(x, list):
                for s in x: r.extend(collect(s))
            return r
        strs = collect(item)
        if not strs: continue
        item_id = strs[0]
        mime = strs[1] if len(strs) > 1 else ''
        is_folder = (mime == 'application/vnd.google-apps.folder')
        
        name = ''
        if is_folder:
            for s in strs:
                if s not in [item_id, mime, 'Shared folder', '1', 'Download', 'More actions'] and not s.startswith('http') and len(s) > 1:
                    name = s
                    break
        else:
            for s in strs:
                if any(s.lower().endswith(ext) for ext in ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.odt']):
                    name = s
                    break
            if not name:
                for s in strs:
                    if s not in [item_id, mime, '1', 'Download', 'More actions'] and not s.startswith('http') and not s.startswith('Size') and not s.startswith('Modified') and len(s) > 2:
                        name = s
                        break

        size = ''
        for s in strs:
            if re.search(r'\d+\s*(KB|MB|GB|B)', s, re.IGNORECASE):
                size = s.split('\n')[0].replace('Size: ', '').strip()
                break

        date = ''
        for s in strs:
            if re.search(r'\d{1,2}\s+[A-Za-z]{3}\s+\d{4}', s):
                date = s
                break

        results.append({
            'id': item_id,
            'name': name or 'Untitled',
            'mime': mime,
            'isFolder': is_folder,
            'size': size,
            'date': date
        })
    return results

def main():
    root_id = "11XG-K2r3Y_xyQkmPbbSj5an7vIBYYbpX"
    print(f"Fetching root folder: {root_id}...")
    root_items = fetch_folder_items(root_id)
    print(f"Root items found: {len(root_items)}")

    all_files = []
    all_folders = []

    # Process items in root
    for item in root_items:
        if item['isFolder']:
            all_folders.append({
                'id': item['id'],
                'name': item['name'],
                'parent': 'Root'
            })
        else:
            ext = os.path.splitext(item['name'])[1].replace('.', '').upper() or 'PDF'
            all_files.append({
                'id': item['id'],
                'fileName': item['name'],
                'candidateName': clean_candidate_name(item['name']),
                'category': 'General',
                'fileType': ext,
                'fileSize': item['size'],
                'date': item['date'],
                'driveUrl': f"https://drive.google.com/file/d/{item['id']}/view",
                'downloadUrl': f"https://drive.google.com/uc?export=download&id={item['id']}"
            })

    # Now crawl each subfolder
    print(f"Crawling {len(all_folders)} subfolders...")
    for idx, folder in enumerate(all_folders):
        print(f"[{idx+1}/{len(all_folders)}] Crawling folder: {folder['name']} ({folder['id']})...")
        time.sleep(0.3)
        sub_items = fetch_folder_items(folder['id'])
        print(f"  Found {len(sub_items)} items in {folder['name']}")
        for sub in sub_items:
            if sub['isFolder']:
                # Nested subfolder
                print(f"    Sub-folder found: {sub['name']}")
                nested_items = fetch_folder_items(sub['id'])
                for n in nested_items:
                    if not n['isFolder']:
                        ext = os.path.splitext(n['name'])[1].replace('.', '').upper() or 'PDF'
                        all_files.append({
                            'id': n['id'],
                            'fileName': n['name'],
                            'candidateName': clean_candidate_name(n['name']),
                            'category': f"{folder['name']} - {sub['name']}",
                            'fileType': ext,
                            'fileSize': n['size'],
                            'date': n['date'],
                            'driveUrl': f"https://drive.google.com/file/d/{n['id']}/view",
                            'downloadUrl': f"https://drive.google.com/uc?export=download&id={n['id']}"
                        })
            else:
                ext = os.path.splitext(sub['name'])[1].replace('.', '').upper() or 'PDF'
                all_files.append({
                    'id': sub['id'],
                    'fileName': sub['name'],
                    'candidateName': clean_candidate_name(sub['name']),
                    'category': folder['name'],
                    'fileType': ext,
                    'fileSize': sub['size'],
                    'date': sub['date'],
                    'driveUrl': f"https://drive.google.com/file/d/{sub['id']}/view",
                    'downloadUrl': f"https://drive.google.com/uc?export=download&id={sub['id']}"
                })

    print(f"\nCrawling complete! Total files indexed: {len(all_files)}")

    output_path = os.path.join(os.path.dirname(__file__), '../server/src/data/drive_cvs_catalogue.json')
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_files, f, indent=2, ensure_ascii=False)

    print(f"Catalogue saved to {output_path}")

if __name__ == '__main__':
    main()
