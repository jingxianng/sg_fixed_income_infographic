# Prompt for Claude Code — "Our Bond Plan" static site

Copy everything below the line into Claude Code.

---

Build a small static website that helps my parents (ages ~70, Singaporean, not financially sophisticated) understand how their SGD fixed-income portfolio should be built, from safest to riskiest. Plain HTML/CSS/vanilla JS, no build step, no frameworks, no external data calls. It must run by opening `index.html` from disk and deploy unchanged to GitHub Pages. Mobile-first, but it will mostly be read on an iPad and a laptop.

## Pages

1. `index.html` — the main page (inputs, headline result, allocation waterfall).
2. `ladder.html` — a supplemental explainer on how a bond ladder works and why it matters for cost of living. Linked from the main page via a small "How does the ladder work?" link. Keep the mechanics OFF the main page.
3. `banks.html` — a supplemental explainer on how bank bonds work: who gets paid first, what Tier 2 and perpetual bonds are, and why the banks we use are safe. Linked from Tiers 3–5 via a small "How do bank bonds work?" link. Keep this OFF the main page.

## Inputs (top of main page)

- **Portfolio size (excluding CPF)** — dropdown, S$1,000,000 to S$8,000,000 in S$250,000 steps. Default S$4,250,000.
- **Cost-of-living increase per year** — dropdown labelled exactly "Cost of living increase each year", options 1%, 2%, 3%, 4%. Default 2%. Do not use the word "inflation" anywhere on the main page; a one-line footnote may say "economists call this inflation".
- **Spending this year** — free number input labelled exactly "How much you spend in a year (S$)", formatted with thousands separators as the user types, minimum 0, default S$150,000. Helper text under it: "Everything you spend, before counting any income." Reject non-numeric input silently (keep the last valid value).

Everything recomputes instantly on change. No submit button.

## Headline result (directly under the inputs)

A single large card:
- **Estimated income each year: S$X** (large) and **(Y% yield)** beside it — computed over portfolio + CPF combined.
- One small line underneath: "This is the coupons and CPF payouts you receive. It does not include selling anything."
- One small cost-of-living line that uses the CoL input: "To buy the same things in 10 years you will need about S$Z a year." where Z = S × (1 + CoL)^10 and S is the spending input. Then one short reassurance sentence: "The ladder below is designed to grow with you — see how." linking to `ladder.html`.

## Ten-year result (second card, directly under the headline card)

A second large card titled **"Your money in 10 years"**:
- **In today's money: S$R** (large) and beside it **"(P% of what you have now)"**.
- One line: "This is what your bonds and CPF would be worth in 10 years, after paying for your spending each year, measured in today's prices."
- If spending is below income in every year, add the line: "You are spending less than you earn. Your money grows even after cost-of-living increases." If spending overtakes income at some point in the 10 years, add instead: "From year N your spending will be more than your income. That is fine — it comes out of bonds as they are repaid." If the money runs out within 10 years, show the card in the Tier 5 colour with: "At this level of spending, the money runs out in year N. Talk to [name]."

Computation (in `app.js`, one function `projectTenYears(inputs, assumptions)` returning an array of 10 yearly rows so it can be unit-tested and reused):
- Start: W₀ = portfolio input + CPF amount (both from `ASSUMPTIONS`/inputs). y = the blended yield shown on the headline card (portfolio + CPF combined). g = CoL input. S₀ = spending input.
- For each year t = 1..10: income_t = W_{t−1} × y; spending_t = S₀ × (1+g)^(t−1); W_t = W_{t−1} + income_t − spending_t, floored at 0.
- Real value R = W₁₀ / (1+g)^10. P = R / W₀.
- Simplifications, stated in the assumptions panel and nowhere else: yields stay at today's levels; coupons not spent are reinvested at the same yield; CPF is treated as part of the pool earning its 4%; no tax (Singapore does not tax individuals on bond interest or CPF); no other income (rent, dividends, pensions) is counted.
- Also draw a tiny inline SVG sparkline of W_t in today's money over the 10 years beside the number, no axes, Tier 2 colour, with a dotted horizontal line at W₀.

## Allocation waterfall (main body)

A vertical cascade of tiers, safest at the top, riskiest at the bottom. Each tier is a band across the page containing:
- Tier name (plain language) and a one-line description.
- A row of **blocks**, one block = S$250,000. Blocks are square-ish tiles with a subtle S$250k label. CPF is a fixed amount (see below) so it renders as fractional blocks (e.g. 3 full + one partial tile, partial width proportional).
- Right-hand summary: expected yield % and expected coupons S$/year for the tier.
- Colour coded by risk (see palette). A small legend near the top of the waterfall explains the colours.

Tiers, in order, with allocation rules applied to the **portfolio input** (CPF is separate and fixed):

| # | Tier (display name) | Amount | Assumed yield | Colour / risk |
|---|---|---|---|---|
| 1 | CPF Retirement Account | Fixed S$881,600 (two people at the 2026 Enhanced Retirement Sum of S$440,800 each) | 4.0% | Green — "Government guaranteed" |
| 2 | Singapore Government bonds (SGS) | 12% of portfolio | 2.3% | Light green — "Government guaranteed, tradeable" |
| 3 | Senior bonds from large foreign banks | 43% of portfolio | 3.1% | Blue — "Very safe bank bonds" |
| 4 | Local bank Tier 2 bonds (DBS, OCBC, UOB) | 25% of portfolio | 3.2% | Amber — "Safe bank bonds, paid after senior" |
| 5 | Bank perpetual bonds (AT1) | 20% of portfolio | 4.5% | Red-orange — "Higher income, higher risk. Keep to this size." |

Yield assumptions are September 2026 working estimates (SGS 2–7Y ~2.0–2.5%; 5Y SGD swap ~2.0–2.1% plus typical spreads: local Tier 2 +90–130bp, local AT1 +200–260bp). They are placeholders until the bank quotes real prices. Note the existing TD perpetual pays a 5.70% coupon, higher than the 4.5% assumed for new AT1 purchases; the 4.5% is deliberately conservative for the tier as a whole.

Rounding rule: convert each tier's percentage into whole S$250k lots; any remainder from rounding goes to Tier 3. Show the lot count and amount on each tier. All yield assumptions must live in a single `ASSUMPTIONS` object at the top of `app.js` with a comment "Update these with prices from the bank", and be displayed in a small collapsible "Assumptions we used" panel at the bottom of the main page.

Between tiers, a thin downward arrow with a 3–5 word label, e.g. "Safest", "Very safe", "Safe", "Careful", "One fifth, no more".

Each tier's one-line description, plain language, no jargon:
1. "Government pays 4% guaranteed. Money comes back to you monthly."
2. "Bonds issued by the Singapore Government. As safe as it gets outside CPF, and easy to sell if you ever need to."
3. "Big, well-known foreign banks. Paid back first if anything goes wrong."
4. "DBS, OCBC and UOB. Very safe, slightly higher income, paid back after senior bonds."
5. "Pays the most, but the bank can skip payments or not pay you back on time. Keep this to one fifth."

Tier 5 also gets a small inset card titled **"The TD bond you already own"** with exactly these lines (plain language, no additions):
- "Toronto-Dominion Bank. Pays 5.70% a year on face value, in Singapore dollars, every six months."
- "Because you bought it after it was issued, your actual return depends on the price you paid: about [X]% a year." — `[X]` is a placeholder in `ASSUMPTIONS` (`TD_YIELD_TO_CALL`, default `null`); if null, render the line as "[name] will fill this in from your contract note."
- "The bank can choose to repay you on 31 July 2029. If it does not, the rate resets to a Singapore interest rate plus 2.65%, and it can repay you at later dates."
- "TD can skip a payment, but if it does, it cannot pay its own shareholders until it pays you again."
- "If TD were ever failing, this bond turns into TD shares rather than disappearing."
- "TD's capital cushion was 14.3% at April 2026, well above what regulators require."
The card carries a one-line footnote: "Source: TD pricing supplement dated 8 July 2024 (Series 2023-9) and TD's programme prospectus, July 2026." and a small "How do bank bonds work?" link to `banks.html`.

## Below the waterfall

- A "Five rules" box, in this order:
  1. "Never sell a bond because its price fell. You still get every coupon."
  2. "Before buying any bond, ask a second bank for a price on the same bond. Only deal if the prices are close."
  3. "Ask for the yield to call (or yield to maturity), not the coupon rate. The coupon is what the bond pays on 100; the yield is what you actually earn on the price you pay. Buy on the yield."
  4. "Keep the bottom tier at one fifth. Only buy more perpetuals when a local bank issues a new one, never at a price above 100."
  5. "Each year, check your spending against the cost-of-living line above."
  Rules 2 and 3 get a small "why" tooltip or footnote (one sentence each): "Banks add a hidden margin to bond prices; a second quote shows you how much." and "A 5.7% coupon bought at 104 earns about 4.5% a year to the call date."

- The collapsible "Assumptions we used" panel.
- The collapsible panel also lists the four simplifications of the ten-year projection (yields unchanged, unspent coupons reinvested, no tax, no other income counted).
- The collapsible panel should list, per tier, the assumed yield and a one-phrase basis (e.g. "Tier 4: 3.2% — 5-year SGD swap + ~1.1%"; "Tier 5: 4.5% — 5-year SGD swap + ~2.4%; existing TD bond pays 5.70%").
- A one-line disclaimer: "Prepared by [name] for family use. Not financial advice. Check prices with the bank before buying."

## `ladder.html` — explainer

Same visual style. Four short sections, each with a simple SVG or CSS graphic and at most 3 sentences:
1. **What a ladder is.** Bonds spread across 2 to 7 years so some money comes back every year. Graphic: 6 rungs labelled 2028–2033 with a block on each.
2. **Why it helps with cost of living.** When a bond is repaid, you buy a new one at today's interest rate. If living costs rise, interest rates usually rise too, so your income catches up over time. Graphic: a repaid rung being re-bought at a higher rate.
3. **Why we don't lock in for 20 years.** A long bond pays the same coupon for 20 years even if costs rise. Graphic: flat line vs rising staircase.
4. **Why we spread across banks and years.** No more than two bonds from any one bank, and no more than two bonds coming due in any one year. Graphic: a 6×4 grid (years × issuers) with at most two filled cells per row and column.

Back link to the main page at top and bottom.

## `banks.html` — explainer

Same visual style. Five short sections, each with a simple SVG or CSS graphic and at most 3–4 sentences. Reassuring, concrete, no jargon; every technical word gets a one-phrase gloss the first time it appears.

1. **Who gets paid first.** A vertical stack, top to bottom: depositors → senior bonds (Tier 3 colour) → Tier 2 bonds (Tier 4 colour) → perpetual bonds (Tier 5 colour) → shareholders. Copy: "If a bank ever ran into serious trouble, this is the order in which people get their money back. Shareholders lose first. You sit above them in every bond we own."
2. **How safe are the banks we use.** Copy, verbatim: "Banks must hold a cushion of their own money against losses. Regulators require roughly 9% for our local banks. DBS, OCBC and UOB each hold more than 15%. TD holds 14%. Put simply: each bank could lose more than a tenth of everything it has lent out, and you would still be paid in full." Graphic: four bars (regulator minimum, DBS, OCBC, UOB, TD) with the minimum drawn as a dotted line. Footnote: "Figures from the banks' 2025–2026 reports. Ask [name] for the current numbers."
3. **Senior bonds.** "The bank promises a fixed payment and a fixed repayment date. It cannot skip or delay either. These are the safest bank bonds and most of your money sits here."
4. **Tier 2 bonds.** "Also a fixed payment and a fixed date. The bank cannot skip payments. The only difference from senior: if the bank were failing, you would be paid after senior bondholders. That is why it pays a little more."
5. **Perpetual bonds.** Three points, each with a small icon (paused coin; calendar with a question mark; bond turning into a share certificate): (a) "The bank may skip a payment. But if it does, it cannot pay its own shareholders either, so banks almost never do." (b) "There is no fixed repayment date. The bank usually repays on the first date it is allowed to — every Singapore bank has done so — but it does not have to. If it does not, the rate resets to a Singapore interest rate plus a margin." (c) "In a real crisis the bond turns into shares of the bank. That is why it pays the most, and why we keep it to one fifth."

Close with one line: "In 2020, when regulators told banks to cut dividends to shareholders, every bank still paid its bondholders in full — including on perpetuals." Back link to the main page at top and bottom.

## Visual tone

Singapore government educational infographic — think gov.sg / CPF Board / MoneySense campaign material. Clean white background, generous whitespace, one strong accent colour per tier, rounded cards, big friendly numbers, simple flat icons (draw them as inline SVG; no icon libraries). Sans-serif system font stack, base font size 18px, headline numbers 36px+. High contrast; all text passes WCAG AA. No gradients, no drop shadows heavier than a whisper, no stock photos. Language: simple, short sentences, second person ("you"), no financial jargon outside the assumptions panel.

## Non-negotiables

- No external fonts, scripts, or CSS. Everything in `index.html`, `ladder.html`, `banks.html`, `style.css`, `app.js`.
- Works with JavaScript on first load with no console errors; degrades to a readable static page if JS is off.
- All numbers formatted as S$ with thousands separators, no decimals on dollar amounts, one decimal on percentages.
- Test at 390px, 820px, and 1280px widths.
- Do not add features I have not asked for (no charts library, no dark mode, no print styles, no scenario toggles).

When done, list the files, show me a screenshot of the main page at 820px, and note anything in the spec that was ambiguous and how you resolved it.
