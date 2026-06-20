/* ============================================================
   Maison Olfactive — wholesale catalogue & ordering logic
   ============================================================ */
(function () {
  "use strict";

  const CATALOGUE = window.CATALOGUE || [];
  const CFG = window.STORE_CONFIG || { currencySymbol: "€", minUnitsPerItem: 7, minOrderValue: 1500, leadTimeWeeks: "3–5" };
  const MIN_UNITS = CFG.minUnitsPerItem;
  const MIN_ORDER = CFG.minOrderValue;
  const SYM = CFG.currencySymbol;
  const PAGE_SIZE = 24;

  // Trade desk contact (placeholders — update to real details)
  const TRADE_EMAIL = "trade@maisonolfactive.example";
  const TRADE_WHATSAPP = "000000000000"; // international format, digits only

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const money = (n) => SYM + n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const byId = (id) => CATALOGUE.find((p) => p.id === id);

  /* ---------- State ---------- */
  const state = {
    search: "",
    genders: new Set(),
    concs: new Set(),
    brands: new Set(),
    sizes: new Set(),
    priceMin: null,
    priceMax: null,
    inStockOnly: false,
    sort: "featured",
    view: "grid",
    shown: PAGE_SIZE,
  };

  let order = loadOrder(); // { [id]: qty }

  /* ---------- Persistence ---------- */
  function loadOrder() {
    try { return JSON.parse(localStorage.getItem("mo_order") || "{}"); }
    catch { return {}; }
  }
  function saveOrder() {
    try { localStorage.setItem("mo_order", JSON.stringify(order)); } catch {}
  }

  /* ---------- Derived option lists ---------- */
  const ALL_GENDERS = ["Women", "Men", "Unisex"];
  const ALL_CONCS = [...new Set(CATALOGUE.map((p) => p.concentration))].sort();
  const ALL_SIZES = [...new Set(CATALOGUE.map((p) => p.size).filter(Boolean))].sort((a, b) => a - b);
  const BRANDS = (() => {
    const m = {};
    CATALOGUE.forEach((p) => { m[p.brand] = (m[p.brand] || 0) + 1; });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  /* ---------- Filtering ---------- */
  function applyFilters() {
    const q = state.search.trim().toLowerCase();
    let list = CATALOGUE.filter((p) => {
      if (q) {
        const hay = (p.title + " " + p.brand + " " + p.ean).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (state.genders.size && !state.genders.has(p.gender)) return false;
      if (state.concs.size && !state.concs.has(p.concentration)) return false;
      if (state.brands.size && !state.brands.has(p.brand)) return false;
      if (state.sizes.size && !state.sizes.has(String(p.size))) return false;
      if (state.priceMin != null && p.price < state.priceMin) return false;
      if (state.priceMax != null && p.price > state.priceMax) return false;
      if (state.inStockOnly && p.stockStatus === "out") return false;
      return true;
    });

    switch (state.sort) {
      case "name-asc": list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "name-desc": list.sort((a, b) => b.title.localeCompare(a.title)); break;
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "brand": list.sort((a, b) => a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title)); break;
      case "stock-desc": list.sort((a, b) => b.stock - a.stock); break;
      default: break; // featured = source order
    }
    return list;
  }

  /* ---------- Rendering: catalogue ---------- */
  const grid = $("#productGrid");

  function initials(p) {
    const words = p.title.replace(/\b(EDP|EDT|EDC|Men|Women|Unisex|For|The|De|Parfum|Eau)\b/gi, " ")
      .split(/\s+/).filter(Boolean);
    const base = words.length ? words : p.brand.split(/\s+/);
    return (base.slice(0, 2).map((w) => w[0]).join("") || p.brand.slice(0, 2)).toUpperCase();
  }

  function stockLabel(p) {
    if (p.stockStatus === "out") return "Out of stock";
    if (p.stockStatus === "low") return p.stock + " left";
    if (p.stockPlus) return "In stock";
    return "In stock";
  }

  function cardHTML(p) {
    const inOrder = order[p.id] ? " in-order" : "";
    const qty = order[p.id] || MIN_UNITS;
    const typeBadge = p.type && p.type !== "Fragrance" ? `<span class="badge badge--type">${p.type}</span>` : "";
    return `
    <article class="card${inOrder}" data-id="${p.id}">
      <div class="card__media" data-detail="${p.id}">
        <div class="card__badges">
          <span class="badge badge--gender">${p.gender}</span>
          ${typeBadge}
        </div>
        <div class="card__bottle"><span class="mono">${initials(p)}</span><span class="sz">${p.size ? p.size + " ml" : p.concentration}</span></div>
        <span class="card__stock"><span class="dot dot--${p.stockStatus}"></span>${stockLabel(p)}</span>
      </div>
      <div class="card__body">
        <div class="card__main">
          <div class="card__brand">${p.brand}</div>
          <div class="card__title" data-detail="${p.id}">${p.title.replace(p.brand, "").trim() || p.title}</div>
          <div class="card__meta">
            <span>${p.concentration}</span>${p.size ? `<span>${p.size} ml</span>` : ""}
          </div>
          <div class="card__ean">EAN ${p.ean || "—"}</div>
        </div>
        <div class="card__foot">
          <div class="card__price"><b>${money(p.price)}</b><small>/ unit</small></div>
          <div class="qty" data-qty="${p.id}">
            <button data-step="-1" aria-label="Decrease">−</button>
            <input type="number" min="${MIN_UNITS}" step="1" value="${qty}" aria-label="Quantity" />
            <button data-step="1" aria-label="Increase">+</button>
          </div>
          <button class="btn btn--primary card__add" data-add="${p.id}">${order[p.id] ? "Update order" : "Add to order"}</button>
          <div class="card__minnote">Min. ${MIN_UNITS} units per reference</div>
        </div>
      </div>
    </article>`;
  }

  function renderCatalogue() {
    const list = applyFilters();
    $("#resultsCount").textContent = `${list.length} reference${list.length === 1 ? "" : "s"}`;
    const slice = list.slice(0, state.shown);
    grid.className = "product-grid" + (state.view === "list" ? " is-list" : "");
    grid.innerHTML = slice.map(cardHTML).join("");
    $("#emptyState").hidden = list.length !== 0;
    $("#loadMoreBtn").hidden = list.length <= state.shown;
    renderActiveFilters();
  }

  /* ---------- Active filter tags ---------- */
  function renderActiveFilters() {
    const container = $("#activeFilters");
    const parts = [];
    const mk = (label, onClear) => {
      const id = "af" + Math.random().toString(36).slice(2);
      parts.push({ id, label, onClear });
    };
    if (state.search) mk(`“${state.search}”`, () => { state.search = ""; $("#searchInput").value = ""; });
    state.genders.forEach((g) => mk(g, () => state.genders.delete(g)));
    state.concs.forEach((c) => mk(c, () => state.concs.delete(c)));
    state.brands.forEach((b) => mk(b, () => state.brands.delete(b)));
    state.sizes.forEach((s) => mk(s + " ml", () => state.sizes.delete(s)));
    if (state.priceMin != null) mk(`≥ ${SYM}${state.priceMin}`, () => { state.priceMin = null; $("#priceMin").value = ""; });
    if (state.priceMax != null) mk(`≤ ${SYM}${state.priceMax}`, () => { state.priceMax = null; $("#priceMax").value = ""; });
    if (state.inStockOnly) mk("In stock", () => { state.inStockOnly = false; $("#inStockOnly").checked = false; });

    container.innerHTML = parts.map((p) => `<span class="af-tag">${p.label}<button data-af="${p.id}">✕</button></span>`).join("");
    parts.forEach((p) => {
      const btn = container.querySelector(`[data-af="${p.id}"]`);
      if (btn) btn.addEventListener("click", () => { p.onClear(); state.shown = PAGE_SIZE; syncFilterUI(); renderCatalogue(); });
    });
  }

  /* ---------- Filter UI build ---------- */
  function buildChips(container, values, set) {
    container.innerHTML = values.map((v) => `<button class="chip" data-val="${v}">${v}${typeof v === "number" ? " ml" : ""}</button>`).join("");
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const val = btn.dataset.val;
      if (set.has(val)) set.delete(val); else set.add(val);
      state.shown = PAGE_SIZE;
      syncFilterUI();
      renderCatalogue();
    });
  }

  function buildBrandList() {
    const el = $("#brandList");
    el.innerHTML = BRANDS.map(([b, c]) =>
      `<label class="brand-check"><input type="checkbox" value="${b}" /> ${b} <span class="count">${c}</span></label>`).join("");
    el.addEventListener("change", (e) => {
      const cb = e.target;
      if (cb.checked) state.brands.add(cb.value); else state.brands.delete(cb.value);
      state.shown = PAGE_SIZE;
      updateBrandCount();
      renderCatalogue();
    });
  }

  function updateBrandCount() {
    $("#brandSelCount").textContent = state.brands.size ? `(${state.brands.size})` : "";
  }

  function syncFilterUI() {
    $$("#genderChips .chip").forEach((c) => c.classList.toggle("is-active", state.genders.has(c.dataset.val)));
    $$("#concChips .chip").forEach((c) => c.classList.toggle("is-active", state.concs.has(c.dataset.val)));
    $$("#sizeChips .chip").forEach((c) => c.classList.toggle("is-active", state.sizes.has(c.dataset.val)));
    $$("#brandList input").forEach((cb) => { cb.checked = state.brands.has(cb.value); });
    updateBrandCount();
  }

  /* ---------- Order / cart ---------- */
  function orderEntries() {
    return Object.keys(order).map((id) => ({ p: byId(Number(id)), qty: order[id] })).filter((e) => e.p);
  }
  function orderUnits() { return orderEntries().reduce((s, e) => s + e.qty, 0); }
  function orderTotal() { return orderEntries().reduce((s, e) => s + e.qty * e.p.price, 0); }
  function orderLines() { return orderEntries().length; }

  function updateCartCount() {
    const lines = orderLines();
    $("#cartCount").textContent = lines;
    $("#cartCount").style.display = lines ? "grid" : "grid";
  }

  function addToOrder(id, qty) {
    qty = Math.max(MIN_UNITS, Math.round(qty || MIN_UNITS));
    order[id] = qty;
    saveOrder();
    updateCartCount();
    renderCart();
    // reflect on card
    const card = grid.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      card.classList.add("in-order");
      const addBtn = card.querySelector("[data-add]");
      if (addBtn) addBtn.textContent = "Update order";
    }
  }

  function removeFromOrder(id) {
    delete order[id];
    saveOrder();
    updateCartCount();
    renderCart();
    const card = grid.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      card.classList.remove("in-order");
      const addBtn = card.querySelector("[data-add]");
      if (addBtn) addBtn.textContent = "Add to order";
    }
  }

  function renderCart() {
    const entries = orderEntries();
    const hasItems = entries.length > 0;
    $("#cartEmpty").style.display = hasItems ? "none" : "grid";
    $("#cartFoot").hidden = !hasItems;
    $("#cartItems").style.display = hasItems ? "block" : "none";

    $("#cartItems").innerHTML = entries.map(({ p, qty }) => {
      const under = qty < MIN_UNITS;
      return `
      <div class="line${under ? " line--under" : ""}" data-line="${p.id}">
        <div class="line__thumb">${initials(p)}</div>
        <div class="line__info">
          <div class="line__brand">${p.brand}</div>
          <div class="line__name">${p.title.replace(p.brand, "").trim() || p.title}</div>
          <div class="line__unit">${money(p.price)} × </div>
          <div class="line__qty" data-cqty="${p.id}">
            <button data-cstep="-1">−</button>
            <input type="number" min="${MIN_UNITS}" step="1" value="${qty}" />
            <button data-cstep="1">+</button>
          </div>
        </div>
        <div class="line__right">
          <div class="line__total">${money(qty * p.price)}</div>
          <button class="line__remove" data-remove="${p.id}">Remove</button>
        </div>
      </div>`;
    }).join("");

    const total = orderTotal();
    const units = orderUnits();
    $("#sumUnits").textContent = units;
    $("#sumLines").textContent = entries.length;
    $("#sumTotal").textContent = money(total);

    // minimum-order progress
    const pct = Math.min(100, (total / MIN_ORDER) * 100);
    $("#minProgressBar").style.width = pct + "%";
    const label = $("#minProgressLabel");
    if (total >= MIN_ORDER) {
      label.classList.add("ok");
      label.innerHTML = `Minimum order reached — <b>ready to submit</b>.`;
    } else {
      label.classList.remove("ok");
      label.innerHTML = `Add <b>${money(MIN_ORDER - total)}</b> to reach the ${money(MIN_ORDER)} minimum.`;
    }

    // validation / submit gating
    const underLines = entries.filter((e) => e.qty < MIN_UNITS).length;
    const warn = $("#minWarning");
    let msg = "";
    if (underLines) msg = `${underLines} line${underLines > 1 ? "s are" : " is"} below the ${MIN_UNITS}-unit minimum per reference.`;
    else if (total < MIN_ORDER) msg = `Order total is below the ${money(MIN_ORDER)} minimum.`;
    warn.hidden = !msg;
    warn.textContent = msg;

    const blocked = underLines > 0 || total < MIN_ORDER || !hasItems;
    ["#submitEmailBtn", "#submitWhatsappBtn"].forEach((s) => { $(s).disabled = blocked; });
  }

  /* ---------- Order export ---------- */
  function orderRows() {
    return orderEntries().map(({ p, qty }) => ({
      brand: p.brand, title: p.title, ean: p.ean, size: p.size ? p.size + "ml" : "",
      qty, unit: p.price, line: +(qty * p.price).toFixed(2),
    }));
  }

  function buildOrderText() {
    const rows = orderRows();
    let t = "MAISON OLFACTIVE — WHOLESALE ORDER REQUEST\n";
    t += "Date: " + new Date().toLocaleDateString("en-GB") + "\n";
    t += "Lead time: " + CFG.leadTimeWeeks + " weeks\n";
    t += "----------------------------------------\n";
    rows.forEach((r, i) => {
      t += `${i + 1}. ${r.title}\n   EAN ${r.ean} | ${r.qty} units × ${money(r.unit)} = ${money(r.line)}\n`;
    });
    t += "----------------------------------------\n";
    t += `Total units: ${orderUnits()}\n`;
    t += `References: ${orderLines()}\n`;
    t += `Order total (excl. VAT & freight): ${money(orderTotal())}\n`;
    return t;
  }

  function downloadCSV() {
    const rows = orderRows();
    const header = ["Brand", "Product", "EAN", "Size", "Qty", "Unit Price (EUR)", "Line Total (EUR)"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([r.brand, `"${r.title.replace(/"/g, '""')}"`, r.ean, r.size, r.qty, r.unit.toFixed(2), r.line.toFixed(2)].join(","));
    });
    lines.push("");
    lines.push(["", "", "", "TOTAL", orderUnits(), "", orderTotal().toFixed(2)].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maison-olfactive-order-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Order CSV downloaded");
  }

  function submitEmail() {
    const subject = encodeURIComponent("Wholesale order request — Maison Olfactive");
    const body = encodeURIComponent(buildOrderText() + "\n\nMy business details:\nCompany:\nVAT no.:\nDelivery address:\nContact:");
    window.location.href = `mailto:${TRADE_EMAIL}?subject=${subject}&body=${body}`;
  }
  function submitWhatsapp() {
    const text = encodeURIComponent(buildOrderText());
    window.open(`https://wa.me/${TRADE_WHATSAPP}?text=${text}`, "_blank");
  }

  /* ---------- Product detail modal ---------- */
  function openDetail(id) {
    const p = byId(id);
    if (!p) return;
    const qty = order[id] || MIN_UNITS;
    $("#productModalPanel").innerHTML = `
      <button class="icon-btn modal__close" id="pmClose" aria-label="Close">✕</button>
      <div class="pm">
        <div class="pm__media"><div class="pm__bottle"><span class="mono">${initials(p)}</span><span class="sz">${p.size ? p.size + " ml" : p.concentration}</span></div></div>
        <div class="pm__body">
          <div class="pm__brand">${p.brand}</div>
          <h3 class="pm__title">${p.title.replace(p.brand, "").trim() || p.title}</h3>
          <dl class="pm__specs">
            <div><dt>Gender</dt><dd>${p.gender}</dd></div>
            <div><dt>Concentration</dt><dd>${p.concentration}</dd></div>
            <div><dt>Size</dt><dd>${p.size ? p.size + " ml" : "—"}</dd></div>
            <div><dt>Type</dt><dd>${p.type}</dd></div>
            <div><dt>EAN</dt><dd>${p.ean || "—"}</dd></div>
            <div><dt>Availability</dt><dd><span class="dot dot--${p.stockStatus}"></span> ${stockLabel(p)}</dd></div>
          </dl>
          <div class="pm__price">${money(p.price)} <small>per unit · excl. VAT</small></div>
          <div class="pm__actions">
            <div class="qty" data-qty="${p.id}">
              <button data-step="-1">−</button>
              <input type="number" min="${MIN_UNITS}" step="1" value="${qty}" />
              <button data-step="1">+</button>
            </div>
            <button class="btn btn--primary" data-add="${p.id}">${order[id] ? "Update order" : "Add to order"}</button>
          </div>
          <p class="card__minnote" style="text-align:left;margin-top:.8rem">Minimum ${MIN_UNITS} units per reference · ${CFG.leadTimeWeeks} week lead time</p>
        </div>
      </div>`;
    $("#productModal").hidden = false;
    $("#pmClose").addEventListener("click", () => { $("#productModal").hidden = true; });
  }

  /* ---------- Quick add by EAN ---------- */
  function quickAdd() {
    const raw = $("#quickAddInput").value.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const res = [];
    let added = 0;
    raw.forEach((ean) => {
      const p = CATALOGUE.find((x) => x.ean === ean);
      if (p) { addToOrder(p.id, order[p.id] ? order[p.id] : MIN_UNITS); added++; res.push(`<div class="ok">✓ ${ean} — ${p.title}</div>`); }
      else res.push(`<div class="err">✕ ${ean} — not found</div>`);
    });
    $("#quickAddResult").innerHTML = res.join("") || `<div class="err">No EANs entered.</div>`;
    if (added) toast(`${added} reference${added > 1 ? "s" : ""} added`);
  }

  /* ---------- Budget planner ---------- */
  const plannerState = { focus: "all" };

  // Build a pack that costs AT LEAST `budget` (which is always >= the €1,500
  // minimum order). First lay down `MIN_UNITS` of distinct products without
  // exceeding the budget, then top up one chosen line in single units until
  // the budget is reached — so every pack is immediately orderable.
  function buildPack(sorted, budget, { topUp = "cheapest", maxLines = 999 } = {}) {
    const items = [];
    let cost = 0;
    for (const p of sorted) {
      if (items.length >= maxLines) break;
      if (cost + p.price * MIN_UNITS <= budget) {
        items.push({ p, qty: MIN_UNITS });
        cost += p.price * MIN_UNITS;
      }
    }
    if (!items.length) { // budget too small for even one line at MIN_UNITS
      items.push({ p: sorted[0], qty: MIN_UNITS });
      cost = sorted[0].price * MIN_UNITS;
    }
    // Top up a single line until we reach (and just cross) the budget.
    const line = topUp === "first"
      ? items[0]
      : items.reduce((a, b) => (a.p.price <= b.p.price ? a : b));
    while (cost < budget) { line.qty += 1; cost += line.p.price; }
    const units = items.reduce((s, i) => s + i.qty, 0);
    return { items, units, cost: +cost.toFixed(2) };
  }

  function plannerPool() {
    let pool = CATALOGUE.filter((p) => p.price > 0 && p.stockStatus !== "out");
    if (plannerState.focus !== "all") pool = pool.filter((p) => p.gender === plannerState.focus);
    return pool;
  }

  function buildPacks() {
    let budget = Math.max(MIN_ORDER, Math.round(+$("#budgetInput").value || MIN_ORDER));
    $("#budgetInput").value = budget;
    const pool = plannerPool();

    if (pool.length < 3) {
      $("#packsOutput").innerHTML = "";
      $("#budgetHint").innerHTML = "Not enough in-stock references for this selection — try a different focus.";
      return;
    }

    const cheapest = [...pool].sort((a, b) => a.price - b.price);
    const dearest = [...pool].sort((a, b) => b.price - a.price);

    // Volume: maximise number of bottles (assortment of cheapest + top-up)
    const volume = buildPack(cheapest, budget, { topUp: "cheapest", maxLines: 12 });
    // Premium: concentrate the budget on the most expensive references only
    const premium = buildPack(dearest.slice(0, 30), budget, { topUp: "first", maxLines: 3 });
    // Balanced: an even spread across the price range
    const step = Math.max(1, Math.floor(pool.length / 16));
    const spread = cheapest.filter((_, i) => i % step === 0);
    const balanced = buildPack(spread, budget, { topUp: "cheapest", maxLines: 14 });

    const minP = cheapest[0];
    const maxUnits = Math.floor(budget / minP.price);
    $("#budgetHint").innerHTML =
      `With <b>${money(budget)}</b> you could buy up to <b>${maxUnits} bottles</b> of the most affordable reference ` +
      `(${minP.brand} ${minP.title.replace(minP.brand, "").trim()} at ${money(minP.price)}), ` +
      `or a curated set of premium scents — see the packs below.`;

    const packs = [
      { tag: "Maximum quantity", name: "Volume Starter", desc: "The most bottles for your money — ideal for high-footfall kiosks and fast turnover.", data: volume, feature: false },
      { tag: "Balanced mix", name: "Bestseller Boutique", desc: "A diversified spread across price tiers and houses — our recommended first order.", data: balanced, feature: true },
      { tag: "Premium selection", name: "Luxury Edit", desc: "The most prestigious references your budget allows — higher ticket, higher margin.", data: premium, feature: false },
    ];

    $("#packsOutput").innerHTML = packs.map(packHTML).join("");
    $$("#packsOutput [data-addpack]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = +btn.dataset.addpack;
        packs[idx].data.items.forEach(({ p, qty }) => { order[p.id] = (order[p.id] || 0) + qty; });
        saveOrder(); updateCartCount(); renderCart(); renderCatalogue();
        toast(`<b>${packs[idx].name}</b> added — ${money(packs[idx].data.cost)}`);
        openDrawer();
      });
    });
  }

  function packHTML(pk, idx) {
    const d = pk.data;
    const reached = d.cost >= MIN_ORDER;
    return `
    <div class="pack${pk.feature ? " pack--feature" : ""}">
      <div class="pack__head">
        <div class="pack__tag">${pk.tag}</div>
        <h3 class="pack__name">${pk.name}</h3>
        <p class="pack__desc">${pk.desc}</p>
      </div>
      <div class="pack__stats">
        <dl class="pack__stat"><dt>${d.units}</dt><dd>Units</dd></dl>
        <dl class="pack__stat"><dt>${d.items.length}</dt><dd>References</dd></dl>
        <dl class="pack__stat"><dt>${money(d.cost).replace(".00", "")}</dt><dd>Total</dd></dl>
      </div>
      <div class="pack__items">
        ${d.items.map(({ p, qty }) => `
          <div class="pack__item">
            <span class="pack__item-name">${p.title.replace(p.brand, "").trim() || p.title}<small>${p.brand}${p.size ? " · " + p.size + "ml" : ""}</small></span>
            <span class="pack__item-qty">${qty} × ${money(p.price)}</span>
          </div>`).join("")}
      </div>
      <div class="pack__foot">
        <div class="pack__total"><span>Order total</span><b>${money(d.cost)}</b></div>
        <button class="btn btn--primary btn--block" data-addpack="${idx}" ${reached ? "" : "disabled"}>${reached ? "Add pack to order" : "Below minimum"}</button>
      </div>
    </div>`;
  }

  /* ---------- Margin calculator ---------- */
  function calcMargin() {
    const cost = +$("#mcCost").value || 0;
    const retail = +$("#mcRetail").value || 0;
    const units = +$("#mcUnits").value || 0;
    const profit = retail - cost;
    const margin = retail > 0 ? (profit / retail) * 100 : 0;
    const markup = cost > 0 ? (profit / cost) * 100 : 0;
    $("#mcProfit").textContent = money(profit);
    $("#mcMargin").textContent = margin.toFixed(0) + "%";
    $("#mcMarkup").textContent = markup.toFixed(0) + "%";
    $("#mcTotal").textContent = money(profit * units);
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.innerHTML = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => { t.hidden = true; }, 300);
    }, 2200);
  }

  /* ---------- Drawer ---------- */
  function openDrawer() {
    $("#cartDrawer").classList.add("is-open");
    $("#cartDrawer").setAttribute("aria-hidden", "false");
    $("#drawerOverlay").hidden = false;
    renderCart();
  }
  function closeDrawer() {
    $("#cartDrawer").classList.remove("is-open");
    $("#cartDrawer").setAttribute("aria-hidden", "true");
    $("#drawerOverlay").hidden = true;
  }

  /* ---------- Event wiring ---------- */
  function wire() {
    // search
    let st;
    $("#searchInput").addEventListener("input", (e) => {
      clearTimeout(st);
      st = setTimeout(() => { state.search = e.target.value; state.shown = PAGE_SIZE; renderCatalogue(); }, 160);
    });

    // price range
    $("#priceMin").addEventListener("input", (e) => { state.priceMin = e.target.value ? +e.target.value : null; state.shown = PAGE_SIZE; renderCatalogue(); });
    $("#priceMax").addEventListener("input", (e) => { state.priceMax = e.target.value ? +e.target.value : null; state.shown = PAGE_SIZE; renderCatalogue(); });
    $("#inStockOnly").addEventListener("change", (e) => { state.inStockOnly = e.target.checked; state.shown = PAGE_SIZE; renderCatalogue(); });

    // sort & view
    $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderCatalogue(); });
    $("#viewGrid").addEventListener("click", () => { state.view = "grid"; $("#viewGrid").classList.add("is-active"); $("#viewList").classList.remove("is-active"); renderCatalogue(); });
    $("#viewList").addEventListener("click", () => { state.view = "list"; $("#viewList").classList.add("is-active"); $("#viewGrid").classList.remove("is-active"); renderCatalogue(); });

    // clear filters
    const clearAll = () => {
      state.search = ""; $("#searchInput").value = "";
      state.genders.clear(); state.concs.clear(); state.brands.clear(); state.sizes.clear();
      state.priceMin = state.priceMax = null; $("#priceMin").value = ""; $("#priceMax").value = "";
      state.inStockOnly = false; $("#inStockOnly").checked = false;
      state.shown = PAGE_SIZE; syncFilterUI(); renderCatalogue();
    };
    $("#clearFilters").addEventListener("click", clearAll);
    $("#emptyReset").addEventListener("click", clearAll);

    // load more
    $("#loadMoreBtn").addEventListener("click", () => { state.shown += PAGE_SIZE; renderCatalogue(); });

    // grid interactions (delegated)
    grid.addEventListener("click", (e) => {
      const detail = e.target.closest("[data-detail]");
      if (detail) { openDetail(Number(detail.dataset.detail)); return; }
      const stepBtn = e.target.closest("[data-step]");
      if (stepBtn) {
        const wrap = stepBtn.closest("[data-qty]");
        const input = wrap.querySelector("input");
        let v = parseInt(input.value || MIN_UNITS, 10) + parseInt(stepBtn.dataset.step, 10);
        v = Math.max(MIN_UNITS, v);
        input.value = v;
        return;
      }
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        const id = Number(addBtn.dataset.add);
        const wrap = grid.querySelector(`[data-qty="${id}"]`);
        const qty = wrap ? parseInt(wrap.querySelector("input").value || MIN_UNITS, 10) : MIN_UNITS;
        addToOrder(id, qty);
        toast(`<b>${qty}</b> units added to your order`);
      }
    });
    grid.addEventListener("change", (e) => {
      const input = e.target.closest("[data-qty] input");
      if (input) {
        let v = Math.max(MIN_UNITS, Math.round(+input.value || MIN_UNITS));
        input.value = v;
      }
    });

    // product modal delegated add/step
    $("#productModalPanel").addEventListener("click", (e) => {
      const stepBtn = e.target.closest("[data-step]");
      if (stepBtn) {
        const input = stepBtn.closest("[data-qty]").querySelector("input");
        let v = Math.max(MIN_UNITS, parseInt(input.value || MIN_UNITS, 10) + parseInt(stepBtn.dataset.step, 10));
        input.value = v; return;
      }
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        const id = Number(addBtn.dataset.add);
        const qty = parseInt($("#productModalPanel [data-qty] input").value || MIN_UNITS, 10);
        addToOrder(id, qty);
        toast(`<b>${qty}</b> units added`);
        $("#productModal").hidden = true;
      }
    });
    $("#productModal").addEventListener("click", (e) => { if (e.target.id === "productModal") $("#productModal").hidden = true; });

    // cart drawer
    $("#openCartBtn").addEventListener("click", openDrawer);
    $("#closeCartBtn").addEventListener("click", closeDrawer);
    $("#drawerOverlay").addEventListener("click", closeDrawer);

    $("#cartItems").addEventListener("click", (e) => {
      const rm = e.target.closest("[data-remove]");
      if (rm) { removeFromOrder(Number(rm.dataset.remove)); return; }
      const step = e.target.closest("[data-cstep]");
      if (step) {
        const id = Number(step.closest("[data-cqty]").dataset.cqty);
        let v = Math.max(MIN_UNITS, (order[id] || MIN_UNITS) + parseInt(step.dataset.cstep, 10));
        addToOrder(id, v);
      }
    });
    $("#cartItems").addEventListener("change", (e) => {
      const input = e.target.closest("[data-cqty] input");
      if (input) {
        const id = Number(input.closest("[data-cqty]").dataset.cqty);
        addToOrder(id, Math.max(MIN_UNITS, Math.round(+input.value || MIN_UNITS)));
      }
    });

    $("#clearCartBtn").addEventListener("click", () => {
      if (confirm("Clear your entire order?")) { order = {}; saveOrder(); updateCartCount(); renderCart(); renderCatalogue(); }
    });
    $("#submitEmailBtn").addEventListener("click", submitEmail);
    $("#submitWhatsappBtn").addEventListener("click", submitWhatsapp);
    $("#downloadCsvBtn").addEventListener("click", downloadCSV);
    $("#printOrderBtn").addEventListener("click", () => window.print());

    // quick add modal
    $("#quickAddBtn").addEventListener("click", () => { $("#quickAddModal").hidden = false; $("#quickAddInput").focus(); });
    $("#quickAddClose").addEventListener("click", () => { $("#quickAddModal").hidden = true; });
    $("#quickAddModal").addEventListener("click", (e) => { if (e.target.id === "quickAddModal") $("#quickAddModal").hidden = true; });
    $("#quickAddSubmit").addEventListener("click", quickAdd);

    // mobile filters toggle
    $("#filtersToggle").addEventListener("click", () => $("#filters").classList.toggle("is-open"));

    // budget planner
    $("#buildPacksBtn").addEventListener("click", buildPacks);
    $("#budgetInput").addEventListener("keydown", (e) => { if (e.key === "Enter") buildPacks(); });
    $("#plannerFocus").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-focus]");
      if (!btn) return;
      plannerState.focus = btn.dataset.focus;
      $$("#plannerFocus .chip").forEach((c) => c.classList.toggle("is-active", c === btn));
      buildPacks();
    });

    // margin calculator
    ["#mcCost", "#mcRetail", "#mcUnits"].forEach((s) => $(s).addEventListener("input", calcMargin));

    // contact links
    $("#contactEmail").href = `mailto:${TRADE_EMAIL}?subject=${encodeURIComponent("Trade account enquiry")}`;
    $("#contactWhatsapp").href = `https://wa.me/${TRADE_WHATSAPP}`;
    $("#contactWhatsapp").target = "_blank";

    // escape closes overlays
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDrawer();
        $("#productModal").hidden = true;
        $("#quickAddModal").hidden = true;
        $("#filters").classList.remove("is-open");
      }
    });
  }

  /* ---------- Init ---------- */
  function init() {
    $("#statProducts").textContent = CATALOGUE.length;
    $("#statBrands").textContent = BRANDS.length;
    $("#year").textContent = new Date().getFullYear();

    buildChips($("#genderChips"), ALL_GENDERS, state.genders);
    buildChips($("#concChips"), ALL_CONCS, state.concs);
    buildChips($("#sizeChips"), ALL_SIZES.map(String), state.sizes);
    buildBrandList();

    wire();
    renderCatalogue();
    updateCartCount();
    renderCart();
    buildPacks();
    calcMargin();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
