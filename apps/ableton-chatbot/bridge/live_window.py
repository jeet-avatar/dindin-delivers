"""Read-only window evidence and conservative Live Set selection."""

from urllib.parse import urlparse


SNAPSHOT = r'''
const system = Application('System Events');
const processes = system.applicationProcesses.whose({bundleIdentifier: 'com.ableton.live'})();
const result = {process_count: processes.length, windows: [], new_enabled: false};
function attribute(window, name, fallback) {
    try {
        const value = window.attributes.byName(name).value();
        return value === null || value === undefined ? fallback : value;
    } catch (_) { return fallback; }
}
if (processes.length === 1) {
    const process = processes[0];
    result.windows = process.windows().map(window => ({
        title: window.name(),
        subrole: attribute(window, 'AXSubrole', ''),
        document: attribute(window, 'AXDocument', ''),
        main: attribute(window, 'AXMain', false),
        minimized: attribute(window, 'AXMinimized', false),
        modal: attribute(window, 'AXModal', false),
        sheets: window.sheets().length
    }));
    result.new_enabled = process.menuBars[0].menuBarItems.byName('File')
        .menus[0].menuItems.byName('New Live Set').enabled();
}
JSON.stringify(result);
'''


class WindowCheckError(RuntimeError):
    def __init__(self, code, message, evidence=None):
        super().__init__(message)
        self.code = code
        self.diagnostics = evidence or {}


def select_document(snapshot):
    windows = snapshot['windows']
    # Keep file paths private; diagnostics describe only the evidence used.
    evidence = {'process_count': snapshot['process_count'], 'windows': [
        {key: window.get(key) for key in ('title', 'subrole', 'main', 'minimized', 'modal', 'sheets')}
        for window in windows
    ]}

    def fail(code, message):
        raise WindowCheckError(code, message, evidence)

    if snapshot['process_count'] == 0:
        fail('live_not_open', 'Open Ableton Live, then retry inspection. Nothing was changed.')
    if snapshot['process_count'] != 1:
        fail('multiple_live_apps', 'More than one Ableton Live application is running. Keep the one you want to use open, then retry inspection.')
    if not windows:
        fail('window_unavailable', 'Ableton has no accessible window yet. Bring your Live Set onscreen, then retry inspection. Nothing was changed.')
    if any(window.get('modal') or window.get('sheets', 0) for window in windows) or not snapshot['new_enabled']:
        fail('live_dialog', 'Ableton is waiting on a dialog. Finish or cancel it in Ableton, then retry inspection. BeatMind has not answered it for you.')

    documents = []
    for window in windows:
        uri = urlparse(window.get('document') or '')
        if uri.scheme == 'file' and uri.path.lower().endswith('.als'):
            documents.append(window)
    if documents:
        identities = {window['document'] for window in documents}
        if len(identities) != 1:
            fail('ambiguous_window', 'BeatMind found more than one Live Set document. Leave the intended Set visible, then retry inspection. Nothing was changed.')
        candidates = [window for window in documents if not window.get('minimized')]
        if not candidates:
            fail('window_minimized', 'Your Live Set is minimized. Bring it onscreen, then retry inspection. Nothing was changed.')
        selected = next((window for window in candidates if window.get('main')), candidates[0])
    else:
        # Untitled sets may have no AXDocument; require a unique main window.
        candidates = [window for window in windows if window.get('main') and not window.get('minimized')
                      and window.get('subrole') in ('AXStandardWindow', 'AXUnknown', '')]
        if len(candidates) != 1:
            fail('ambiguous_window', 'BeatMind could not identify the active Live Set window. Click the main Ableton Set window, then retry inspection. Nothing was changed.')
        selected = candidates[0]
    if not selected.get('title', '').strip():
        fail('window_unavailable', 'Ableton has not exposed the Set title yet. Bring your Set onscreen, then retry inspection. Nothing was changed.')
    return selected['title']
