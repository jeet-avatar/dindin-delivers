"""Browser links may reveal the bridge window, never configure or command it."""

SCHEME = 'beatmind-bridge'
OPEN_URL = SCHEME + '://open'
URL_TYPES = [{'CFBundleURLName': 'com.zietra.beatmind-bridge.launch',
              'CFBundleURLSchemes': [SCHEME], 'CFBundleTypeRole': 'Viewer'}]


def handle_launch(root, *urls):
    if len(urls) != 1 or urls[0] not in (OPEN_URL, OPEN_URL + '/'):
        return False
    root.deiconify()
    root.lift()
    root.focus_force()
    return True


def register_mac_launch(root):
    # Tk's Apple-event URL callback. Keep arbitrary URL input out of Tcl eval.
    root.createcommand('::tk::mac::LaunchURL', lambda *urls: handle_launch(root, *urls))
