#!/usr/bin/env python3
"""
Download product images and save them named by EAN, into the images/ folder,
ready for the website (which looks for images/<EAN>.jpg).

Run this on a machine that CAN reach your supplier's images (e.g. your own
computer / browser network), since the website build sandbox has no internet.

No third-party packages required (uses the Python standard library only).

────────────────────────────────────────────────────────────────────────────
TWO WAYS TO USE IT
────────────────────────────────────────────────────────────────────────────

1) FROM A CSV of image links (recommended)
   Export or build a CSV with two columns: the EAN and the image URL.
   Accepted header names (case-insensitive): ean / barcode  and  image / url /
   image_url / src. Then run:

       python3 tools/fetch_images.py --csv my_images.csv

2) FROM A URL TEMPLATE (if the supplier serves images by EAN)
   If your supplier's images follow a predictable pattern, pass a template with
   {ean} where the barcode goes. The script tries it for every product in
   data/products.json:

       python3 tools/fetch_images.py --template "https://cdn.supplier.com/img/{ean}.jpg"

Options:
   --out images           output folder (default: images)
   --overwrite            re-download files that already exist
   --ext jpg              saved file extension (default: jpg)

Tip: if you have the images as files already (a folder or zip from your rep),
you don't need this script — just rename each file to <EAN>.jpg and drop them
in the images/ folder.
"""
import argparse, csv, json, os, sys, time
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (compatible; MelitaProfumi-image-fetch/1.0)"

EAN_KEYS = ("ean", "barcode", "code")
URL_KEYS = ("image", "url", "image_url", "imageurl", "src", "img")


def load_pairs_from_csv(path):
    pairs = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            sys.exit("CSV appears to be empty.")
        lower = {k.lower().strip(): k for k in reader.fieldnames}
        ean_col = next((lower[k] for k in EAN_KEYS if k in lower), None)
        url_col = next((lower[k] for k in URL_KEYS if k in lower), None)
        if not ean_col or not url_col:
            sys.exit(f"CSV needs an EAN column ({'/'.join(EAN_KEYS)}) and an "
                     f"image-URL column ({'/'.join(URL_KEYS)}). Found: {reader.fieldnames}")
        for row in reader:
            ean = (row.get(ean_col) or "").strip()
            url = (row.get(url_col) or "").strip()
            if ean and url:
                pairs.append((ean, url))
    return pairs


def load_pairs_from_template(template):
    data_path = os.path.join(ROOT, "data/products.json")
    products = json.load(open(data_path, encoding="utf-8"))
    return [(p["ean"], template.format(ean=p["ean"]))
            for p in products if p.get("ean")]


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    if len(data) < 512:  # almost certainly an error page, not an image
        raise ValueError("response too small to be an image")
    with open(dest, "wb") as f:
        f.write(data)


def main():
    ap = argparse.ArgumentParser(description="Download product images named by EAN.")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", help="CSV file with EAN and image-URL columns")
    src.add_argument("--template", help='URL template with {ean}, e.g. "https://.../{ean}.jpg"')
    ap.add_argument("--out", default="images", help="output folder (default: images)")
    ap.add_argument("--ext", default="jpg", help="saved extension (default: jpg)")
    ap.add_argument("--overwrite", action="store_true", help="re-download existing files")
    args = ap.parse_args()

    pairs = load_pairs_from_csv(args.csv) if args.csv else load_pairs_from_template(args.template)
    out_dir = os.path.join(ROOT, args.out)
    os.makedirs(out_dir, exist_ok=True)

    ok = skip = fail = 0
    for i, (ean, url) in enumerate(pairs, 1):
        dest = os.path.join(out_dir, f"{ean}.{args.ext}")
        if os.path.exists(dest) and not args.overwrite:
            skip += 1
            continue
        try:
            download(url, dest)
            ok += 1
            print(f"[{i}/{len(pairs)}] ✓ {ean}")
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, OSError) as e:
            fail += 1
            print(f"[{i}/{len(pairs)}] ✗ {ean} — {e}")
        time.sleep(0.15)  # be polite to the server

    print(f"\nDone. Saved {ok}, skipped {skip} (already present), failed {fail}.")
    print(f"Images are in: {out_dir}")
    if ok:
        print("Commit and push them, and they'll appear on the site automatically.")


if __name__ == "__main__":
    main()
