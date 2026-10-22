# Export layout and preview check correction

The preview runs for b7c34fb and 8a91885 each passed 107 browser checks and failed the five responsive report variants. The assertion at checks/reservations-report.spec.mjs:26 used a global booking-ID selector. It matched both a hidden Apartments button and the Reports card, causing a Playwright strict-mode error before the content assertion could run. Scope that assertion to the report list; no application data or navigation change is necessary.

Each run had three annotations: exit code 1 from that failed test step; a non-fatal Node 20 deprecation warning for the existing Actions versions; and an informational ubuntu-latest migration notice. The latter two did not cause the failures. Workflow configuration is unchanged.

Exports keep apartment then guest as the first columns. The separate legacy-receipt summary, column and amount annotation are removed from exported documents, while the existing selector still includes those receipts once in total collected. Missing values remain distinct from zero. On-screen Reports explanations are unchanged.

Excel uses ten compact columns, Calibri 11 for normal cells, wrapped headings, 100% sheet zoom, and A4 landscape printing with fitToWidth=1 and unrestricted page height. The blank notes column is retained in its existing order. No Android saving transport or financial formulas are changed.

## Visual verification limits

The generated RO/EN sheets were imported into the document renderer and inspected at scale 1 (100%). The full A:J view including row headings measures 1246 px wide and fits a 1366 px viewport. This is a rendering check, not a test in Microsoft Excel on a physical laptop. Narrower usable windows, larger OS display scaling, side panels, fonts or spreadsheet-viewer differences can still require horizontal scrolling. The renderer does not reproduce Excel's Romanian locale currency display faithfully; the existing numeric values and Romanian-locale OOXML format are preserved. PDF amounts render in Romanian format.

Printing width is a separate setting from screen zoom; it does not reduce the normal cell font. New Android builds are necessary to package changed generators; installation on a real phone and its chosen XLSX/PDF viewers remains a manual check.
