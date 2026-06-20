# Melita Profumi — Wholesale Fragrance Atelier

A professional, modern B2B website for wholesale perfume ordering, serving trade
customers in **Malta and Italy**. It is aimed at **first-time entrepreneurs and
small retailers** who want to start a fragrance business without managing
international suppliers, authentication, storage or shipping themselves.

The site is a self-contained static website (HTML/CSS/vanilla JS) — no build
step, no framework, no backend required. It can be hosted on GitHub Pages,
Netlify, Vercel, or any static host.

## Highlights

- **385 references across 25 brands** loaded from the supplier price list.
- **Wholesale pricing** = supplier cost **× 1.65** (a 65% markup). The raw cost
  prices are never shipped to the browser.
- **Order rules enforced in the UI:** minimum **7 units per reference** and a
  **€1,500 minimum goods value**, with live validation and a progress bar.
- **Delivery is calculated separately** (quoted per order by destination, volume
  and weight) — the order total shown is for goods only.
- **3–5 week production lead time** communicated throughout.

### Tools built for retailers
- **Catalogue** with search (name / brand / EAN), filters (gender,
  concentration, brand, size, price range, in-stock-only), sorting, grid/list
  views, product detail modal and lazy "load more".
- **Order sheet / cart** with quantity steppers, line totals, persistent state
  (localStorage), and export by **email**, **WhatsApp**, **CSV download** or
  **print**.
- **Quick add by EAN** — paste a list of barcodes to add them in bulk.
- **Budget Planner** — enter a budget (default €1,500) and get three ready-made,
  rule-compliant starter packs:
  - *Volume Starter* — the most bottles for the money.
  - *Bestseller Boutique* — a balanced, diversified mix (recommended).
  - *Luxury Edit* — the most premium references the budget allows.
  It also answers "how many bottles can I buy with €1,500?" for the most
  affordable reference.
- **Margin calculator** — profit per unit, margin %, markup % and total profit
  at a chosen retail price.
- **Services / "the bridge"** — sourcing, authentication, storage and delivery
  presented as the value proposition for new importers, plus a getting-started
  playbook, trade terms and FAQ.

## Project structure

```
index.html                 Single-page site (all sections)
assets/css/styles.css      Design system & layout
assets/js/data.js          Auto-generated catalogue + store config (loaded first)
assets/js/app.js           Catalogue, filters, cart, planner, calculator logic
data/products.json         Catalogue as portable JSON (no cost prices)
tools/build_catalogue.py   Regenerates the data files from a supplier .xlsx
```

## Updating prices / stock

When you receive a new price list from the supplier (same column layout:
`Brand | Title | EAN | Available | Price`, where Price is your **cost**):

```bash
python3 tools/build_catalogue.py "Price_List.xlsx"
```

This regenerates `data/products.json` and `assets/js/data.js` with the 65%
markup applied. Adjust `MARKUP`, `MIN_UNITS_PER_ITEM`, `MIN_ORDER_VALUE` or
`LEAD_TIME_WEEKS` at the top of the script if your terms change. (No Python
packages are required — the spreadsheet is parsed directly.)

## Running locally

It's just static files — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Before going live

Confirm the contact details in `assets/js/app.js`:

```js
const TRADE_EMAIL    = "trade@melitaprofumi.com";   // update to your real inbox
const TRADE_WHATSAPP = "35677590566";               // +356 7759 0566, digits only
const TRADE_PHONE    = "+356 7759 0566";
```

The WhatsApp/phone number (+356 7759 0566) is live. The email address is a
sensible default based on the business name — point it at your real inbox (and
register the matching domain) before launch.

> Designer/house brand names are listed only to identify genuine stock and
> remain the property of their respective owners.
