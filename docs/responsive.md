# BASIC responsive calendar

The unchanged 30-day grid uses a shared apartment column of `clamp(60px,16cqw,180px)` and thirty `minmax(0,1fr)` columns. Every row and both header rows use the same geometry. Apartment labels wrap onto two lines. Date-number text scales to its own column's content width; month labels scale to their own segment. Booking labels truncate within their existing bars. The twelve month choices are one fluid row with no minimum width or horizontal scroll.

Run `npm test` and `npm run test:responsive` after installing Chromium with `npx playwright install --with-deps chromium`. The browser checks cover 320px narrow portrait, 360px Fold cover-screen layout, 390px portrait, 740px landscape, 840px Fold inner-screen layout, 1024px tablet and 1440px desktop. These are CSS viewport simulations, not measurements from a physical Galaxy Fold. Tests also resize the same page without reloading, check day-number containment, all 12 months, header alignment, half-day adjacency, the blue separator, year navigation, Today and European date fields. Test data exists only in isolated test browser storage; production installs remain empty.

All responsive screenshots are uploaded by GitHub Actions as `Responsive-layout-checks`.
