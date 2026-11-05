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

def clean_name(filename, folder_name=''):
    name = re.sub(r'\.(pdf|docx?|odt|xlsx?)$', '', filename, flags=re.IGNORECASE)
    # Strip parenthetical annotations like (june CV), (ADB), (CV)
    name = re.sub(r'\([^\)]*\)', ' ', name)
    name = re.sub(r'^[\[\(\"\'\s]+|[\]\)\"\'\s]+$', '', name)
    name = re.sub(r'^\d+[\s._-]+', '', name)
    name = re.sub(r'^(cv|curriculum vitae|resume|updated? cv|new cv|profile)[\s:_.-]*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^(for|of)\s+', '', name, flags=re.IGNORECASE)
    name = re.sub(r'^(eng\.?|mr\.?|ms\.?|mrs\.?|dr\.?|prof\.?)\s+', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\s:_.-]+(cv|curriculum vitae|resume|profile)$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b\d{1,2}(st|nd|rd|th)?[\s_-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s_-]*\d{0,4}\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s_-]*\d{2,4}\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[-_]\d{4,8}(_\d{4,8})?', '', name)
    name = re.sub(r'\b(19\d\d|20\d\d)\b', '', name)
    name = re.sub(r'\b(new|final|rev\d*|draft|copy|format|certs?|certificates?|qualification|papers?|academic documents?|submission|supporting documents?|testimonial|partial)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[\s_-]+\d+$', '', name)
    name = re.sub(r'[-_.,()[\]{}]+', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    
    if (not name or len(name) < 3 or name.lower() in ['degree', 'certificate', 'contracts', 'prome jr engs']) and folder_name:
        sub = re.sub(r'\b(certs?|contracts?|cv|sekota)\b', '', folder_name, flags=re.IGNORECASE).strip()
        if len(sub) > 2:
            name = sub

    return name.title() if name else filename

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
    except Exception:
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
                    if s not in [item_id, mime, '1', 'Download', 'More actions', 'Shared folder', 'Microsoft Word', 'PDF'] and not s.startswith('http') and not s.startswith('Size') and not s.startswith('Modified') and len(s) > 2:
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
    junior_folder_id = "1bA0fHzT-VtB7V6CGCNtILmT1srrcv_ci"
    catalogue_path = os.path.join(os.path.dirname(__file__), '../server/src/data/drive_cvs_catalogue.json')
    catalogue_path = os.path.abspath(catalogue_path)
    
    with open(catalogue_path, 'r', encoding='utf-8') as f:
        existing_items = json.load(f)

    existing_ids = set(x['id'] for x in existing_items if 'id' in x)
    print(f"Loaded existing catalogue with {len(existing_items)} items.")

    print(f"Fetching Junior Engs root folder ({junior_folder_id})...")
    root_items = fetch_folder_items(junior_folder_id)
    print(f"Found {len(root_items)} items in Junior Engs root.")

    new_items = []
    subfolders_to_crawl = []

    for item in root_items:
        if item['isFolder']:
            subfolders_to_crawl.append(item)
        else:
            if item['id'] not in existing_ids:
                ext = os.path.splitext(item['name'])[1].replace('.', '').upper() or 'DOCX'
                cand_name = clean_name(item['name'], 'CVS PROME JUNIOR ENGS')
                entry = {
                    'id': item['id'],
                    'fileName': item['name'],
                    'candidateName': cand_name,
                    'category': 'PROME JUNIOR ENGINEERS',
                    'fileType': ext,
                    'fileSize': item['size'],
                    'date': item['date'],
                    'driveUrl': f"https://drive.google.com/file/d/{item['id']}/view",
                    'downloadUrl': f"https://drive.google.com/uc?export=download&id={item['id']}"
                }
                new_items.append(entry)
                existing_ids.add(item['id'])

    print(f"Crawling {len(subfolders_to_crawl)} subfolders in Junior Engs...")
    for idx, folder in enumerate(subfolders_to_crawl):
        print(f"[{idx+1}/{len(subfolders_to_crawl)}] Crawling: {folder['name']} ({folder['id']})...")
        time.sleep(0.3)
        sub_items = fetch_folder_items(folder['id'])
        print(f"  Found {len(sub_items)} items in {folder['name']}")
        
        for sub in sub_items:
            if not sub['isFolder'] and sub['id'] not in existing_ids:
                ext = os.path.splitext(sub['name'])[1].replace('.', '').upper() or 'PDF'
                cand_name = clean_name(sub['name'], folder['name'])
                entry = {
                    'id': sub['id'],
                    'fileName': sub['name'],
                    'candidateName': cand_name,
                    'category': f"PROME JUNIOR ENGINEERS - {folder['name']}",
                    'fileType': ext,
                    'fileSize': sub['size'],
                    'date': sub['date'],
                    'driveUrl': f"https://drive.google.com/file/d/{sub['id']}/view",
                    'downloadUrl': f"https://drive.google.com/uc?export=download&id={sub['id']}"
                }
                new_items.append(entry)
                existing_ids.add(sub['id'])

    print(f"\nTotal new junior engineers' files to incorporate: {len(new_items)}")
    
    # Merge new items
    merged_catalogue = existing_items + new_items
    print(f"Total merged catalogue items: {len(merged_catalogue)}")

    # Save to server/src/data and server/dist/data
    with open(catalogue_path, 'w', encoding='utf-8') as f:
        json.dump(merged_catalogue, f, indent=2, ensure_ascii=False)
    print(f"Updated catalogue saved to {catalogue_path}")

    dist_catalogue_path = os.path.join(os.path.dirname(__file__), '../server/dist/data/drive_cvs_catalogue.json')
    dist_catalogue_path = os.path.abspath(dist_catalogue_path)
    os.makedirs(os.path.dirname(dist_catalogue_path), exist_ok=True)
    with open(dist_catalogue_path, 'w', encoding='utf-8') as f:
        json.dump(merged_catalogue, f, indent=2, ensure_ascii=False)
    print(f"Updated catalogue copied to {dist_catalogue_path}")

if __name__ == '__main__':
    main()
