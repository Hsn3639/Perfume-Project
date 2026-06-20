# Product images

Drop product photos in this folder and they appear on the site automatically —
no code changes needed.

## How it works

Each product on the site looks for a photo named after its **EAN barcode**:

    images/<EAN>.jpg

For example, the product with EAN `6290171002338` will use:

    images/6290171002338.jpg

If the file exists, it is shown on the product card and in the product detail
popup. If it does not exist, the site gracefully falls back to the elegant
monogram tile — so missing images never break the layout.

## Guidelines for good results

- **Format:** JPG (file name must end in `.jpg`). White or transparent
  background works best with the catalogue's light tiles.
- **Size:** roughly square, about 800 × 800 px is ideal. Keep each file under
  ~300 KB so pages stay fast.
- **Naming:** the file name must match the EAN exactly (digits only), e.g.
  `6291108731949.jpg`. You can find every product's EAN in `data/products.json`
  or on each product card.

## Where to get the images (legitimately)

- Ask your **supplier** for their product image feed / pack shots — most
  wholesale suppliers provide these keyed by EAN.
- Use **brand-supplied** marketing assets you are licensed to use.
- Shoot your **own** photography.

Avoid copying images from other retailers' websites without permission — they
are usually copyrighted.

## Tip: bulk file names

To list every EAN so you know which files to prepare:

    python3 -c "import json;[print(p['ean']+'.jpg') for p in json.load(open('data/products.json'))]"
