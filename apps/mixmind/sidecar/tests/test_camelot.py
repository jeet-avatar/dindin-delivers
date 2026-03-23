from camelot import musical_key_to_camelot


def test_am_is_8a():
    assert musical_key_to_camelot("Am") == "8A"


def test_c_major_is_8b():
    assert musical_key_to_camelot("C") == "8B"


def test_fm_is_4a():
    assert musical_key_to_camelot("Fm") == "4A"


def test_d_minor_is_7a():
    assert musical_key_to_camelot("Dm") == "7A"


def test_fsharp_minor_is_11a():
    assert musical_key_to_camelot("F#m") == "11A"


def test_unknown_key_returns_unknown():
    assert musical_key_to_camelot("X") == "?"


def test_all_24_keys_covered():
    """Every key in the Camelot wheel must resolve."""
    keys = [
        "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F",
        "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Fm", "Cm", "Gm", "Dm",
    ]
    for key in keys:
        result = musical_key_to_camelot(key)
        assert result != "?", f"Missing Camelot mapping for key: {key}"
