# BASIC responsive calendar

The unchanged 30-day grid uses a shared apartment column of `clamp(60px,16cqw,180px)` and thirty `minmax(0,1fr)` columns. Every row and both header rows use the same geometry. Apartment labels wrap onto two lines. Date-number text scales to its own column's content width; month labels scale to their own segment. Booking labels truncate within their existing bars. The twelve month choices are one fluid row with no minimum width or horizontal scroll.

Run `npm test` and `npm run test:responsive` after installing Chromium with `npx playwright install --with-deps chromium`. The browser checks cover 320px narrow portrait, 360px Fold cover-screen layout, 390px portrait, 740px landscape, 840px Fold inner-screen layout, 1024px tablet and 1440px desktop. These are CSS viewport simulations, not measurements from a physical Galaxy Fold. Tests also resize the same page without reloading, check day-number containment, all 12 months, header alignment, half-day adjacency, the blue separator, year navigation, Today and European date fields. Test data exists only in isolated test browser storage; production installs remain empty.

All responsive screenshots are uploaded by GitHub Actions as `Responsive-layout-checks`.

## BASIC 1.0.3 phones and RO/EN

A dedicated `max-width:600px` query refines only narrow phone layouts (320/360/390/412 CSS px). Date-number sizing increases from 62% to 82% of the date-column content width, while the apartment column and phone padding are reduced. APARTAMENTE/APARTMENTS stays on one line. Top spacing and the date header are more compact. Outside this breakpoint, the existing timeline/grid/font geometry is unchanged; tests assert the previous formula on Fold inner-screen, tablet, landscape and desktop widths.

The additional browser checks cover S24 Ultra at a representative 412px CSS viewport, both languages, initial OS-language selection, manual preference persistence, switching languages with draft form fields intact, translated errors, English CRUD, overlap rejection and permitted same-day changeover. These remain browser viewport simulations, not physical-device tests.

## Phone scrolling timeline

At viewport widths up to 600px the apartment column is clamp(110px, 30vw, 130px). The 30-day content width is twice the scroll viewport minus that column, which gives exactly 15 visible day widths beside the pinned apartment column. Both axes use a single native scroll viewport: month/day headers and bookings share one grid; the header sticks to its top and apartment labels to its left. All 30 dates remain available by horizontal swipe. No booking/date/storage logic changes. Large-screen CSS remains unchanged.

Tests at 360, 390 and 430px measure visible day count, digit containment, two-line names, pinned labels/header, shared scroll displacement and half-day changeover geometry. Ten apartments are test fixtures only, never seeded into the application.

The previously missing BASIC guard now prevents adding an eleventh apartment, including submit-time validation; existing records are not removed and editing/deleting remains available. The limit message uses the central RO/EN dictionary.
