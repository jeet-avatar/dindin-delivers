"""Stem taxonomy shared by the worker, API, Bridge and cloud job."""

CORE_STEMS = ('drums', 'bass', 'vocals', 'other')
DRUM_PARTS = ('kick', 'snare', 'toms', 'cymbals')
ALL_STEMS = CORE_STEMS + DRUM_PARTS
LABELS = {'other': 'Other instruments', 'cymbals': 'Cymbals and hi-hat'}


def audio_stems(report):
    """Every stem file a reference has, in report order. Reports without stems are four-stem."""
    if not report.get('stems'):
        return list(CORE_STEMS)
    return [stem['name'] for stem in report['stems']]


def review_stems(report):
    """Stems the user decides on. The parent drums file is not a choice once its parts exist."""
    names = audio_stems(report)
    if any(name in DRUM_PARTS for name in names):
        return [name for name in names if name != 'drums']
    return names
