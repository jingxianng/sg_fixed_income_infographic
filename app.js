/* Our Bond Plan — all logic. Plain JS, no dependencies. */

// Update these with prices from the bank
var ASSUMPTIONS = {
  LOT: 250000,                 // one block on the page = S$250,000
  CPF_AMOUNT: 881600,          // two people x 2026 Enhanced Retirement Sum of S$440,800
  CPF_YIELD: 0.040,
  CPF_BASIS: "CPF Retirement Account interest, guaranteed by the Government",

  // Applied to the portfolio input (CPF is separate and fixed). Yields are
  // September 2026 working estimates until the bank quotes real prices.
  TIERS: [
    { id: 2, name: "Singapore Government bonds (SGS)", share: 0.12, yield: 0.023,
      basis: "SGS 2 to 7 year yields, about 2.0 to 2.5%" },
    { id: 3, name: "Senior bonds from large foreign banks", share: 0.43, yield: 0.031,
      basis: "5-year SGD swap + ~1.0%" },
    { id: 4, name: "Local bank Tier 2 bonds (DBS, OCBC, UOB)", share: 0.25, yield: 0.032,
      basis: "5-year SGD swap + ~1.1%" },
    { id: 5, name: "Bank perpetual bonds (AT1)", share: 0.20, yield: 0.045,
      basis: "5-year SGD swap + ~2.4%; existing TD bond pays 5.70%" }
  ],
  REMAINDER_TIER: 3,           // whole-lot rounding remainder goes here

  TD_COUPON: 5.70,             // % a year on face value
  TD_YIELD_TO_CALL: null,      // % a year on the price actually paid; null = not yet known

  PROJECTION_YEARS: 10,
  PERSON: "JX"
};

// ---------- formatting ----------

function fmtSGD(n) {
  n = Math.round(n);
  return "S$" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtPct(fraction) {
  return (fraction * 100).toFixed(1) + "%";
}

function fmtInt(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ---------- allocation ----------

// Splits the portfolio into whole S$250k lots per tier. Rounding remainder goes
// to ASSUMPTIONS.REMAINDER_TIER. CPF is added as a fixed amount.
function allocate(portfolio, a) {
  a = a || ASSUMPTIONS;
  var totalLots = Math.round(portfolio / a.LOT);
  var rows = a.TIERS.map(function (t) {
    return { id: t.id, name: t.name, yield: t.yield, share: t.share, basis: t.basis, lots: 0, amount: 0 };
  });
  var used = 0;
  rows.forEach(function (r) {
    if (r.id === a.REMAINDER_TIER) return;
    r.lots = Math.round(r.share * totalLots);
    used += r.lots;
  });
  rows.forEach(function (r) {
    if (r.id === a.REMAINDER_TIER) r.lots = Math.max(0, totalLots - used);
    r.amount = r.lots * a.LOT;
    r.coupons = r.amount * r.yield;
  });
  var cpf = { id: 1, name: "CPF Retirement Account", yield: a.CPF_YIELD, basis: a.CPF_BASIS,
    lots: a.CPF_AMOUNT / a.LOT, amount: a.CPF_AMOUNT, coupons: a.CPF_AMOUNT * a.CPF_YIELD };
  var all = [cpf].concat(rows);
  var total = all.reduce(function (s, r) { return s + r.amount; }, 0);
  var income = all.reduce(function (s, r) { return s + r.coupons; }, 0);
  return { tiers: all, total: total, income: income, yield: total > 0 ? income / total : 0 };
}

// ---------- ten-year projection ----------

// inputs: { portfolio, col, spending }   assumptions: ASSUMPTIONS
// Returns an array of 10 rows: { year, start, income, spending, end, real }
function projectTenYears(inputs, assumptions) {
  var a = assumptions || ASSUMPTIONS;
  var alloc = allocate(inputs.portfolio, a);
  var w = alloc.total;
  var y = alloc.yield;
  var g = inputs.col;
  var rows = [];
  for (var t = 1; t <= a.PROJECTION_YEARS; t++) {
    var income = w * y;
    var spending = inputs.spending * Math.pow(1 + g, t - 1);
    var end = Math.max(0, w + income - spending);
    rows.push({ year: t, start: w, income: income, spending: spending, end: end,
      real: end / Math.pow(1 + g, t) });
    w = end;
  }
  return rows;
}

function summariseProjection(rows, startWealth) {
  var last = rows[rows.length - 1];
  var firstDeficit = null, runsOut = null;
  rows.forEach(function (r) {
    if (firstDeficit === null && r.spending > r.income) firstDeficit = r.year;
    if (runsOut === null && r.end <= 0) runsOut = r.year;
  });
  return { real: last.real, share: startWealth > 0 ? last.real / startWealth : 0,
    firstDeficit: firstDeficit, runsOut: runsOut };
}

// ---------- rendering ----------

function svgIcon(id) {
  var icons = {
    1: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z" fill="currentColor"/><path d="M16 24l6 6 10-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    2: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 20L24 8l18 12H6z" fill="currentColor"/><rect x="10" y="22" width="5" height="14" fill="currentColor"/><rect x="21.5" y="22" width="5" height="14" fill="currentColor"/><rect x="33" y="22" width="5" height="14" fill="currentColor"/><rect x="6" y="38" width="36" height="5" fill="currentColor"/></svg>',
    3: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="6" width="32" height="36" rx="3" fill="currentColor"/><rect x="14" y="12" width="6" height="6" fill="#fff"/><rect x="28" y="12" width="6" height="6" fill="#fff"/><rect x="14" y="22" width="6" height="6" fill="#fff"/><rect x="28" y="22" width="6" height="6" fill="#fff"/><rect x="20" y="32" width="8" height="10" fill="#fff"/></svg>',
    4: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="36" height="28" rx="4" fill="currentColor"/><rect x="6" y="17" width="36" height="5" fill="#fff"/><rect x="12" y="27" width="10" height="4" fill="#fff"/></svg>',
    5: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="currentColor"/><path d="M24 14v20M18 20h9a4 4 0 010 8h-6a4 4 0 000 8h9" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>'
  };
  return icons[id] || "";
}

function renderBlocks(tier, lot) {
  var full = Math.floor(tier.lots + 1e-9);
  var frac = tier.lots - full;
  var html = "";
  for (var i = 0; i < full; i++) html += '<div class="block"><span>S$250k</span></div>';
  if (frac > 0.005) {
    html += '<div class="block partial"><div class="fill" style="width:' + (frac * 100).toFixed(1) + '%"></div><span>' +
      "S$" + Math.round(frac * lot / 1000) + "k" + '</span></div>';
  }
  if (!html) html = '<div class="blocks-empty">No lots at this portfolio size</div>';
  return html;
}

function renderTier(tier) {
  var el = document.getElementById("tier-" + tier.id);
  if (!el) return;
  var ic = el.querySelector(".tier-icon");
  if (ic && !ic.innerHTML) ic.innerHTML = svgIcon(tier.id);
  el.querySelector(".blocks").innerHTML = renderBlocks(tier, ASSUMPTIONS.LOT);
  var lotText;
  if (tier.id === 1) lotText = "Fixed amount: " + fmtSGD(tier.amount) + " (about " + tier.lots.toFixed(1) + " lots)";
  else lotText = tier.lots + (tier.lots === 1 ? " lot" : " lots") + " = " + fmtSGD(tier.amount) + " (" + fmtPct(tier.share) + " of your portfolio)";
  el.querySelector(".lot-line").textContent = lotText;
  el.querySelector(".yield").textContent = fmtPct(tier.yield);
  el.querySelector(".coupons").textContent = fmtSGD(tier.coupons) + " a year";
}

function renderSparkline(rows, startWealth, g) {
  var svg = document.getElementById("sparkline");
  if (!svg) return;
  var W = 260, H = 70, pad = 6;
  var pts = [startWealth].concat(rows.map(function (r) { return r.real; }));
  var max = Math.max.apply(null, pts);
  var min = Math.min.apply(null, pts);
  var room = (max - min) * 0.15 || max * 0.05 || 1;
  max += room; min = Math.max(0, min - room);
  var span = max - min || 1;
  function x(i) { return pad + (i / (pts.length - 1)) * (W - 2 * pad); }
  function y(v) { return H - pad - ((v - min) / span) * (H - 2 * pad); }
  var d = pts.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
  var y0 = y(startWealth).toFixed(1);
  svg.innerHTML =
    '<line x1="' + pad + '" y1="' + y0 + '" x2="' + (W - pad) + '" y2="' + y0 + '" stroke="#4d5966" stroke-width="1.5" stroke-dasharray="3 4"/>' +
    '<path d="' + d + '" fill="none" stroke="#4a7a15" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
}

function readInputs() {
  var portfolio = Number(document.getElementById("portfolio").value);
  var col = Number(document.getElementById("col").value);
  var spendEl = document.getElementById("spending");
  var spending = Number(spendEl.getAttribute("data-value") || 0);
  return { portfolio: portfolio, col: col, spending: spending };
}

function render() {
  var inputs = readInputs();
  var alloc = allocate(inputs.portfolio);
  var a = ASSUMPTIONS;

  // Headline card
  document.getElementById("income").textContent = fmtSGD(alloc.income);
  document.getElementById("yield").textContent = "(" + fmtPct(alloc.yield) + " yield)";
  var future = inputs.spending * Math.pow(1 + inputs.col, a.PROJECTION_YEARS);
  document.getElementById("future-spend").textContent = fmtSGD(future);

  // Ten-year card
  var rows = projectTenYears(inputs, a);
  var s = summariseProjection(rows, alloc.total);
  document.getElementById("real").textContent = fmtSGD(s.real);
  document.getElementById("real-share").textContent = "(" + fmtPct(s.share) + " of what you have now)";
  var card = document.getElementById("ten-year-card");
  var verdict = document.getElementById("verdict");
  card.classList.remove("danger");
  if (s.runsOut !== null) {
    card.classList.add("danger");
    verdict.textContent = "At this level of spending, the money runs out in year " + s.runsOut + ". Talk to " + a.PERSON + ".";
  } else if (s.firstDeficit !== null) {
    verdict.textContent = "From year " + s.firstDeficit + " your spending will be more than your income. That is fine — it comes out of bonds as they are repaid.";
  } else {
    verdict.textContent = "You are spending less than you earn. Your money grows even after cost-of-living increases.";
  }
  renderSparkline(rows, alloc.total, inputs.col);

  // Waterfall
  alloc.tiers.forEach(renderTier);

  // Assumptions panel
  var list = document.getElementById("assumption-yields");
  if (list) {
    list.innerHTML = alloc.tiers.map(function (t) {
      return "<li>Tier " + t.id + ": " + fmtPct(t.yield) + " — " + t.basis + "</li>";
    }).join("");
  }
  var td = document.getElementById("td-yield-line");
  if (td) {
    td.textContent = a.TD_YIELD_TO_CALL === null
      ? a.PERSON + " will fill this in from your contract note."
      : "Because you bought it after it was issued, your actual return depends on the price you paid: about " +
        Number(a.TD_YIELD_TO_CALL).toFixed(1) + "% a year.";
  }
}

// Spending input: format with thousands separators as the user types.
// Non-numeric input is rejected silently and the last valid value kept.
function wireSpending() {
  var el = document.getElementById("spending");
  el.addEventListener("input", function () {
    var raw = el.value.replace(/,/g, "").trim();
    if (raw === "") { el.setAttribute("data-value", "0"); render(); return; }
    if (!/^\d+$/.test(raw)) {
      el.value = fmtInt(Number(el.getAttribute("data-value") || 0));
      return;
    }
    var n = Math.max(0, Number(raw));
    el.setAttribute("data-value", String(n));
    el.value = fmtInt(n);
    render();
  });
  el.addEventListener("blur", function () {
    el.value = fmtInt(Number(el.getAttribute("data-value") || 0));
  });
}

function init() {
  var sel = document.getElementById("portfolio");
  if (sel && !sel.options.length) {
    for (var v = 1000000; v <= 8000000; v += 250000) {
      var o = document.createElement("option");
      o.value = String(v);
      o.textContent = fmtSGD(v);
      if (v === 4250000) o.selected = true;
      sel.appendChild(o);
    }
  }
  document.getElementById("portfolio").addEventListener("change", render);
  document.getElementById("col").addEventListener("change", render);
  wireSpending();
  render();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ASSUMPTIONS: ASSUMPTIONS, allocate: allocate, projectTenYears: projectTenYears,
    summariseProjection: summariseProjection, svgIcon: svgIcon, fmtSGD: fmtSGD, fmtPct: fmtPct };
}
