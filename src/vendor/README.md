# Offline PDF dependencies

- `jspdf.js`: jsPDF **4.2.1**, official npm package
  <https://registry.npmjs.org/jspdf/-/jspdf-4.2.1.tgz>, `dist/jspdf.umd.min.js`.
  MIT license in `jspdf-LICENSE.txt` (upstream bundled dependency notices are
  retained in the JavaScript). Only its unused source-map directive was removed
  and `export const jsPDF=globalThis.jspdf.jsPDF;` appended for the app's ES modules.
- `report-fonts.js`: base64 TTF subsets of DejaVu Sans and DejaVu Sans Bold
  from the system `fonts-dejavu-core` package. License in `DejaVu-LICENSE.txt`.
  Generated with fontTools subset, using `recalc_timestamp=False`, keeping
  U+0020–052F, U+2000–206F, U+20AC and U+FFFD. Both fonts are embedded and
  subset again by jsPDF in each PDF. This covers RO/EN diacritics and common
  Latin/Greek/Cyrillic guest names; it is not a full multilingual font pack.

No runtime download, CDN, npm installation, Android plugin or server is needed.
Do not modify or remove license notices when updating these dependencies.
Only PDF's text/vector/TTF APIs are used; HTML, remote image and script APIs
are not used with reservation data.
