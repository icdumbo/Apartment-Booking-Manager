"""Independent text extraction of fictional owner-filtered PDF test artifacts."""
from pathlib import Path
import sys
from pypdf import PdfReader
ui = '--ui' in sys.argv
for language in (('ui-ro',) if ui else ('ro', 'en')):
    text = '\n'.join(page.extract_text() for page in PdfReader(Path('test-results') / f'owners-{language}.pdf').pages)
    for expected in ('Ștefan Test', 'Alpha guest a', 'Alpha guest b', 'Test Alpha One', 'Test Alpha Two', '01/10/2026', '31/10/2026'):
        assert expected in text, f'Missing included owner report value: {expected}'
    for excluded in ('EXCLUDED_PRIVATE_GUEST', 'EXCLUDED_PRIVATE_NOTE', 'UNASSIGNED_GUEST', 'Beta Test', 'Test Beta Private'):
        assert excluded not in text, 'Another owner leaked into PDF'
if not ui:
    text = '\n'.join(page.extract_text() for page in PdfReader('test-results/owners-unassigned.pdf').pages)
    assert 'UNASSIGNED_GUEST' in text and 'Alpha guest' not in text and 'EXCLUDED_PRIVATE' not in text
print('Owner-filtered RO/EN and unassigned PDF text verified independently.')
