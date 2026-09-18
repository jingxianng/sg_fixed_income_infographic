# Our Bond Plan

A small static site explaining how a Singapore-dollar fixed-income portfolio is built, from safest to riskiest.
Plain HTML, CSS and vanilla JavaScript. No build step. Open `index.html` directly or serve it from GitHub Pages.

## Files

- `index.html` — main page: inputs, income headline, ten-year projection, allocation waterfall, five rules, assumptions.
- `ladder.html` — how a bond ladder works.
- `banks.html` — how bank bonds work.
- `cpf.html` — CPF Retirement Account rules and why we top up.
- `style.css`, `app.js` — shared styles and all logic.
- `test/app.test.js` — unit tests: `node --test test/app.test.js`

## Updating yields

All yield assumptions live in the `ASSUMPTIONS` object at the top of `app.js`.
Set `TD_YIELD_TO_CALL` once the yield to call from the contract note is known.

## Publishing

Push to GitHub, then in the repository settings enable Pages from the `main` branch, root folder.
