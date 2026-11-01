"""Independent OOXML/PDF checks using fictional fixtures only."""
from pathlib import Path
import sys
import re
from pypdf import PdfReader
import openpyxl
import pdfplumber

root = Path('test-results/maintenance-exports')
def text(path):
    return '\n'.join(page.extract_text() or '' for page in PdfReader(path).pages)
if '--ui' in sys.argv:
    value = text(Path('test-results/maintenance-ui.pdf'))
    assert 'Ștefan Test' in value and 'Test Alpha Two' in value
    assert 'Beta Test' not in value and 'EXCLUDED_MAINTENANCE' not in value
    print('Maintenance UI PDF download independently verified.')
    raise SystemExit
for language in ['ro', 'en']:
    value = text(root / f'{language}.pdf')
    for included in ['Ștefan Test', 'Test Alpha One', 'Test Alpha Two', '01/10/2026', '31/10/2026', '13,00 RON', '45,00 EUR']:
        assert included in value, included
    for excluded in ['Beta Test', 'Test Beta Private', 'EXCLUDED_MAINTENANCE_NOTE', 'Test Unassigned']:
        assert excluded not in value, excluded
    book = openpyxl.load_workbook(root / f'{language}.xlsx', data_only=True)
    assert len(book.worksheets) == 4
    totals = list(book.worksheets[3].values)
    amounts = {row[2]: row[5] for row in totals if len(row) > 5 and row[2] in ['RON', 'EUR']}
    assert amounts == {'RON': 13, 'EUR': 45}, amounts
    for sheet in book:
        values = '\n'.join(str(value) for row in sheet for value in [cell.value for cell in row] if value is not None)
        assert 'Beta Test' not in values and 'EXCLUDED_MAINTENANCE_NOTE' not in values
        assert all((row.height or 15) <= 409 for row in sheet.row_dimensions.values())
        assert sheet.freeze_panes and sheet.print_title_rows
for language in ['ro', 'en']:
    for count in [0, 1, 2]:
        noun = ('rezervare' if count == 1 else 'rezervări') if language == 'ro' else ('reservation' if count == 1 else 'reservations')
        assert f'{count} {noun}' in text(root / f'grammar-{language}-{count}.pdf')
long = text(root / 'long.pdf')
assert 'FINAL_DESCRIPTION' in long and 'FINAL_NOTES' in long
assert len(PdfReader(root / 'long.pdf').pages) >= 3
book = openpyxl.load_workbook(root / 'long.xlsx', data_only=False)
assert all(cell.data_type != 'f' for sheet in book for row in sheet for cell in row)
all_cells = '\n'.join(str(cell.value) for sheet in book for row in sheet for cell in row if cell.value is not None)
assert 'FINAL_DESCRIPTION' in re.sub(r'\s+', '', all_cells) and 'FINAL_NOTES' in re.sub(r'\s+', '', all_cells)
assert 'Beta Test' in text(root / 'all.pdf')
assert 'Test Unassigned' in text(root / 'unassigned.pdf') and 'Test Alpha' not in text(root / 'unassigned.pdf')
assert 'Beta Test' not in text(root / 'empty.pdf') and 'Înregistrări: 0' in text(root / 'empty.pdf')
for path in root.glob('*.pdf'):
    if path.name.startswith('grammar-'):
        continue  # Existing reservation PDF layout is outside this change.
    with pdfplumber.open(path) as document:
        for page in document.pages:
            assert 'Apartment Booking Manager' in (page.extract_text() or '')
            assert abs(page.width - 841.89) < 1 and abs(page.height - 595.28) < 1
            for word in page.extract_words():
                assert word['x0'] >= 30 and word['x1'] <= page.width - 30, (path.name, word)
                assert word['top'] >= 10 and word['bottom'] < page.height - 8, (path.name, word)
print('Maintenance RO/EN PDF text, page bounds, Excel totals/sheets, empty/unassigned and report grammar verified independently.')
