# Open tasks

## ⏳ Add product images (pending — waiting on supplier assets)

**Status:** parked on 2026-06-20 at the user's request — "I'll sort it and get
back to you." Remind me about this next time we work on the project.

**What's wanted:** real bottle photos for the 385 products on the site.

**Why it's not done yet:** there were no photos in the supplier price-list file,
this build environment has no internet, and the supplier portal
(`rneydistribution.com/wholesale`) blocks automated access (returns HTTP 403 —
it needs a logged-in wholesale session). So the images have to come out through
the user's authenticated access.

**Everything is already wired and waiting:**
- The site shows `images/<EAN>.jpg` for any product that has one, and falls back
  to the monogram tile when it doesn't. (See `assets/js/app.js` → `imgTag()`.)
- `tools/fetch_images.py` bulk-downloads images named by EAN from either a CSV
  (`--csv`, columns: ean, image_url) or a URL template (`--template`).
- Naming/sourcing guidance is in `images/README.md`.

**Next step when the user returns:** get one of these from RNEY (their supplier)
and we finish in minutes —
1. A CSV/data feed of EAN → image URL, then run `fetch_images.py --csv`.
2. A zip/folder of image files exported from the portal (upload here; we rename
   by EAN and commit).
3. The logged-in product-page HTML (upload here; we parse it for image URLs).

Confirm the image URLs are publicly reachable; if the images sit behind the
login too, ask the rep for a proper image pack/feed.
