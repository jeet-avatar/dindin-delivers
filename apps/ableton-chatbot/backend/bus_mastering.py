"""Per-stem-bus mastering: group the producer's own tracks into the reference's four buses
(drums/bass/vocals/other) and compare each bus against the matching reference stem."""

DRUM_WORDS = ('kick', 'snare', 'hat', 'clap', 'perc', 'cymbal', 'tom', 'drum')
BASS_WORDS = ('bass', 'sub', '808')
VOCAL_WORDS = ('vocal', 'vox', 'voice')


def classify(name):
    lowered = name.casefold()
    if any(word in lowered for word in VOCAL_WORDS):
        return 'vocals'
    if any(word in lowered for word in BASS_WORDS):
        return 'bass'
    if any(word in lowered for word in DRUM_WORDS):
        return 'drums'
    if lowered.strip() in ('pad', 'chords', 'lead', 'synth', 'keys', 'strings', 'guitar', 'arp'):
        return 'other'
    return None


def classify_tracks(names):
    return [classify(name) for name in names]
