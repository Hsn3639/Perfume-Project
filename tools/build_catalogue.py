#!/usr/bin/env python3
"""
Build the wholesale catalogue data files from a supplier price-list .xlsx.

The supplier sheet is expected to have the columns:
    Brand | Title | EAN | Available | Price
where `Price` is the SUPPLIER COST per unit. The wholesale price published on
the website is the cost multiplied by MARKUP (default 1.65 = +65%).

Usage:
    python3 tools/build_catalogue.py "Price_List.xlsx"

Outputs:
    data/products.json        – pretty JSON (cost NOT included)
    assets/js/data.js         – window.CATALOGUE + window.STORE_CONFIG

No third-party dependencies: the .xlsx is parsed directly as a zip of XML.
"""
import sys, os, re, json, zipfile
import xml.etree.ElementTree as ET

MARKUP = 1.65            # +65% on supplier cost
MIN_UNITS_PER_ITEM = 7   # minimum units per reference
MIN_ORDER_VALUE = 1500   # minimum order value (EUR)
LEAD_TIME_WEEKS = "3–5"

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def col_of(ref):
    return re.match(r"[A-Z]+", ref).group()


def read_rows(path):
    with zipfile.ZipFile(path) as z:
        shared = ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings = ["".join(t.text or "" for t in si.iter(NS + "t")) for si in shared]
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in sheet.iter(NS + "row"):
        cells = {}
        for c in row.findall(NS + "c"):
            t, v = c.get("t"), c.find(NS + "v")
            if v is None:
                continue
            val = strings[int(v.text)] if t == "s" else v.text
            cells[col_of(c.get("r"))] = val
        rows.append(cells)
    return rows


def gender(t):
    tl = t.lower()
    if "unisex" in tl: return "Unisex"
    if "women" in tl or "woman" in tl or "for her" in tl or " her " in tl: return "Women"
    if "men" in tl or "for him" in tl or " him " in tl: return "Men"
    return "Unisex"


def conc(t):
    tl = t.lower()
    if "extrait" in tl: return "Extrait de Parfum"
    if "parfum intense" in tl or tl.endswith("parfum"): return "Parfum"
    if "edp" in tl: return "Eau de Parfum"
    if "edt" in tl: return "Eau de Toilette"
    if "cologne" in tl or " edc" in tl: return "Cologne"
    if "deodorant" in tl or "body spray" in tl or "body mist" in tl or "hair mist" in tl: return "Body & Mist"
    return "Eau de Parfum"


def size(t):
    m = re.search(r"(\d+)\s*ml", t.lower())
    return int(m.group(1)) if m else None


def ptype(t):
    tl = t.lower()
    if "tester" in tl: return "Tester"
    if "discovery set" in tl or "gift set" in tl or tl.endswith("set") or " set " in tl: return "Set"
    if "vial" in tl: return "Vial"
    if "deodorant" in tl or "body" in tl or "hair mist" in tl: return "Body & Mist"
    return "Fragrance"


def stock(avail):
    if avail.endswith("+"): return 360, True, "high"
    try: n = int(avail)
    except ValueError: return 0, False, "out"
    if n <= 0: return 0, False, "out"
    if n < 24: return n, False, "low"
    if n < 120: return n, False, "medium"
    return n, False, "high"


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python3 tools/build_catalogue.py <price_list.xlsx>")
    rows = read_rows(sys.argv[1])
    products, pid = [], 0
    for r in rows[1:]:  # skip header
        brand = (r.get("A") or "").strip()
        title = (r.get("B") or "").strip()
        if not title:
            continue
        pid += 1
        qty, plus, status = stock((r.get("D") or "").strip())
        try: cost = float((r.get("E") or "0").strip())
        except ValueError: cost = 0.0
        products.append({
            "id": pid, "brand": brand, "title": title,
            "ean": (r.get("C") or "").strip(),
            "price": round(cost * MARKUP, 2),
            "stock": qty, "stockPlus": plus, "stockStatus": status,
            "gender": gender(title), "concentration": conc(title),
            "size": size(title), "type": ptype(title),
        })

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "assets/js"), exist_ok=True)
    with open(os.path.join(ROOT, "data/products.json"), "w") as f:
        json.dump(products, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "assets/js/data.js"), "w") as f:
        nbrands = len({p["brand"] for p in products})
        f.write("// Auto-generated wholesale catalogue. Wholesale price = supplier cost x %.2f.\n" % MARKUP)
        f.write("// %d products / %d brands. Cost prices are NOT included in this file.\n" % (len(products), nbrands))
        f.write("window.CATALOGUE = ")
        json.dump(products, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
        f.write('window.STORE_CONFIG = {currency:"EUR",currencySymbol:"\\u20ac",'
                'minUnitsPerItem:%d,minOrderValue:%d,leadTimeWeeks:"%s"};\n'
                % (MIN_UNITS_PER_ITEM, MIN_ORDER_VALUE, LEAD_TIME_WEEKS))
    print("Wrote %d products across %d brands." % (len(products), nbrands))


if __name__ == "__main__":
    main()
