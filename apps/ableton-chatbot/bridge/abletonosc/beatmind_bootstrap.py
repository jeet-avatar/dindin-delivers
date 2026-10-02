"""BeatMind handlers for an unmodified AbletonOSC installation."""
import Live
from .handler import AbletonOSCHandler


def browser_handlers(handler, app):
    categories = ("audio_effects", "instruments", "midi_effects", "max_for_live",
                  "drums", "sounds", "samples", "plugins", "packs", "user_library")

    def resolve(parts):
        if not parts or str(parts[0]) not in categories:
            raise ValueError("Choose an available browser category.")
        item = getattr(app.browser, str(parts[0]), None)
        if item is None:
            raise ValueError("Browser category is unavailable.")
        for name in parts[1:]:
            matches = [c for c in item.children if c.name == str(name)]
            if len(matches) != 1:
                raise ValueError("Exact browser path is unavailable or ambiguous.")
            item = matches[0]
        return item

    def list_path(params):
        return tuple(child.name for child in resolve(params).children)

    def load_path(params):
        item = resolve(params)
        if not item.is_loadable:
            raise ValueError("Choose a loadable item, not a folder.")
        app.browser.load_item(item)
        return ("loaded", item.name)

    def load_named(params, samples=False):
        name = str(params[0]).casefold()
        roots = ("samples", "packs", "user_library") if samples else categories
        # Match an exact name in each category. Never substitute the first preset.
        for category in roots:
            root = getattr(app.browser, category, None)
            if root is None:
                continue
            stack, matches, visited = list(root.children), [], 0
            while stack:
                item = stack.pop()
                visited += 1
                if visited > 20000:
                    raise ValueError("Browser search is too large. Use the exact library path.")
                if item.is_loadable and item.name.casefold() in (name, name + ".adv", name + ".adg"):
                    matches.append(item)
                elif item.is_folder:
                    stack.extend(item.children)
            if len(matches) > 1:
                raise ValueError("Name is ambiguous. Use the exact library path.")
            if matches:
                app.browser.load_item(matches[0])
                return ("loaded", matches[0].name)
        return ("not_found", str(params[0]))

    def guarded(function):
        def call(params):
            try:
                return function(params)
            except (ValueError, IndexError, AttributeError) as error:
                return ("error", str(error))
        return call

    for name, callback in (("list", list_path), ("list_path", list_path),
                           ("load_path", load_path), ("load_device", load_named),
                           ("load_sample", lambda p: load_named(p, samples=True))):
        handler.osc_server.add_handler("/live/browser/" + name, guarded(callback))
    handler.osc_server.add_handler("/live/song/get/return_track_names",
                                   lambda p: tuple(t.name for t in handler.song.return_tracks))


class BeatMindHandler(AbletonOSCHandler):
    def init_api(self):
        from .beatmind_samples import register
        from .beatmind_mixer import register as register_mixer
        from .beatmind_master import register as register_master
        from .beatmind_sidechain import register as register_sidechain
        app = Live.Application.get_application()
        browser_handlers(self, app)
        for setup in (register, register_mixer, register_master, register_sidechain):
            setup(self, app)


def attach(manager):
    if not any(isinstance(handler, BeatMindHandler) for handler in manager.handlers):
        manager.handlers.append(BeatMindHandler(manager))
