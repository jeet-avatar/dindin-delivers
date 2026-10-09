"""Compressor sidechain routing: list the available sources and route one track (usually the Kick) into a Compressor."""
import json


def register(handler, app):
    song = handler.song

    def compressor(data):
        tracks = list(song.tracks)
        index, device = int(data["track"]), int(data["device"])
        if not 0 <= index < len(tracks):
            raise ValueError("Track no longer exists.")
        devices = list(tracks[index].devices)
        if not 0 <= device < len(devices) or devices[device].class_name not in ("Compressor2", "Compressor"):
            raise ValueError("That device is not Ableton's Compressor.")
        return devices[device]

    def describe(target):
        return {"sources": [t.display_name for t in target.available_input_routing_types],
                "source": target.input_routing_type.display_name,
                "channels": [c.display_name for c in target.available_input_routing_channels],
                "channel": target.input_routing_channel.display_name}

    def callback(params):
        try:
            data = json.loads(params[0])
            target = compressor(data)
            if data.get("operation") == "set":
                matches = [t for t in target.available_input_routing_types if t.display_name == data["source"]]
                if len(matches) != 1:
                    raise ValueError("Sidechain source %r is not available; choose one of the listed sources." % data["source"])
                target.input_routing_type = matches[0]
                if data.get("channel"):
                    channels = [c for c in target.available_input_routing_channels if c.display_name == data["channel"]]
                    if len(channels) == 1:
                        target.input_routing_channel = channels[0]
            return (json.dumps({"status": "observed", **describe(target)}),)
        except Exception as error:
            return (json.dumps({"status": "failed", "summary": str(error), "error": str(error)}),)

    handler.osc_server.add_handler("/live/beatmind/sidechain", callback)
