const test = require("node:test");
const assert = require("node:assert");
const { ASSUMPTIONS, allocate, projectTenYears, summariseProjection, fmtSGD, fmtPct } = require("../app.js");

test("allocation rounds to whole lots and remainder goes to Tier 3", () => {
  const a = allocate(4250000);
  const byId = Object.fromEntries(a.tiers.map(t => [t.id, t]));
  assert.equal(byId[2].lots, 2); assert.equal(byId[3].lots, 8);
  assert.equal(byId[4].lots, 4); assert.equal(byId[5].lots, 3);
  assert.equal(byId[2].lots + byId[3].lots + byId[4].lots + byId[5].lots, 17);
  assert.equal(a.total, 4250000 + ASSUMPTIONS.CPF_AMOUNT);
});

test("every portfolio size allocates all lots", () => {
  for (let p = 1000000; p <= 10000000; p += 250000) {
    const a = allocate(p);
    const lots = a.tiers.filter(t => t.id !== 1).reduce((s, t) => s + t.lots, 0);
    assert.equal(lots * ASSUMPTIONS.LOT, p, "portfolio " + p);
    assert.ok(a.tiers.every(t => t.lots >= 0));
  }
});

test("projectTenYears returns 10 rows following the recurrence", () => {
  const inputs = { portfolio: 4250000, col: 0.02, spending: 150000 };
  const rows = projectTenYears(inputs, ASSUMPTIONS);
  assert.equal(rows.length, 10);
  const a = allocate(4250000);
  let w = a.total;
  rows.forEach((r, i) => {
    const t = i + 1;
    const income = w * a.yield, spending = 150000 * Math.pow(1.02, t - 1);
    const end = Math.max(0, w + income - spending);
    assert.ok(Math.abs(r.end - end) < 1e-6);
    assert.ok(Math.abs(r.real - end / Math.pow(1.02, t)) < 1e-6);
    w = end;
  });
});

test("wealth is floored at zero and runs-out year is reported", () => {
  const rows = projectTenYears({ portfolio: 1000000, col: 0.04, spending: 600000 }, ASSUMPTIONS);
  const s = summariseProjection(rows, allocate(1000000).total);
  assert.ok(rows.every(r => r.end >= 0));
  assert.equal(s.runsOut, 4);
  assert.equal(s.firstDeficit, 1);
});

test("spending below income every year", () => {
  const rows = projectTenYears({ portfolio: 8000000, col: 0.01, spending: 100000 }, ASSUMPTIONS);
  const s = summariseProjection(rows, allocate(8000000).total);
  assert.equal(s.firstDeficit, null); assert.equal(s.runsOut, null);
});

test("formatting", () => {
  assert.equal(fmtSGD(1234567.6), "S$1,234,568");
  assert.equal(fmtPct(0.034), "3.4%");
});

test("verdict distinguishes growing and shrinking real value", () => {
  const { verdictText } = require("../app.js");
  assert.match(verdictText({ runsOut: 3, firstDeficit: 1, share: 0 }), /runs out in year 3\. Talk to JX/);
  assert.match(verdictText({ runsOut: null, firstDeficit: null, share: 1.1 }), /Your money grows/);
  assert.match(verdictText({ runsOut: null, firstDeficit: null, share: 0.9 }), /savings shrink slowly/);
  assert.match(verdictText({ runsOut: null, firstDeficit: 10, share: 0.84 }), /From year 10 .* shrink slowly/);
  assert.match(verdictText({ runsOut: null, firstDeficit: 9, share: 1.02 }), /From year 9 .* still keeps up/);
});

test("projection honours the years input", () => {
  const rows = projectTenYears({ portfolio: 4250000, col: 0.02, spending: 150000, years: 25 }, ASSUMPTIONS);
  assert.equal(rows.length, 25);
  assert.equal(rows[24].year, 25);
  assert.equal(projectTenYears({ portfolio: 4250000, col: 0.02, spending: 150000 }, ASSUMPTIONS).length, 10);
});
