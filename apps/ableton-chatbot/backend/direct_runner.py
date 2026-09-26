#!/usr/bin/env python3
"""
BeatMind DIRECT runner — no cloud, no subscription, no WebSocket bridge.

Runs the real BeatMind brain (claude_tools.py: ABLETON_TOOLS / SYSTEM_PROMPT /
tool_to_osc) locally, billing Claude via AWS Bedrock, and speaks OSC straight to
AbletonOSC on this Mac. It replaces the cloud FastAPI (_run_claude_loop) + the
local bridge (bridge.py) with one process.

Chain replicated:
    Claude (Bedrock) -> tool_to_osc -> OSC/UDP 11000 -> AbletonOSC -> Ableton Live

Prereqs:
  - Ableton Live open with AbletonOSC selected as a Control Surface (holds :11000).
  - Run with the backend venv, from this directory:
        venv/bin/python direct_runner.py

Derived from: main.py::_run_claude_loop + claude_tools.py + bridge/bridge.py (OSC helpers).
"""

import asyncio
import json
import os
import socket
import struct
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from claude_tools import ABLETON_TOOLS, SYSTEM_PROMPT  # noqa: E402
from execution import BAD_STATUSES, MAX_PRODUCTION_ROUNDS, execute_verified, response_ids  # noqa: E402

# ---- Config ----
OSC_HOST = "127.0.0.1"
OSC_SEND_PORT = 11000
OSC_RECV_PORT = 11001
# Bedrock inference profile (account 134607809447, region us-east-1).
MODEL = os.getenv("BEATMIND_MODEL", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
MAX_ITERS = MAX_PRODUCTION_ROUNDS


# ---- OSC protocol (mirrors bridge/bridge.py) ----

def _osc_string(s: str) -> bytes:
    encoded = s.encode("utf-8") + b"\x00"
    padding = (4 - len(encoded) % 4) % 4
    return encoded + b"\x00" * padding


def build_osc_message(address: str, args: list) -> bytes:
    msg = _osc_string(address)
    type_tag = ","
    arg_data = b""
    for arg in args:
        if isinstance(arg, bool):
            type_tag += "i"
            arg_data += struct.pack(">i", int(arg))
        elif isinstance(arg, int):
            type_tag += "i"
            arg_data += struct.pack(">i", arg)
        elif isinstance(arg, float):
            type_tag += "f"
            arg_data += struct.pack(">f", arg)
        elif isinstance(arg, str):
            type_tag += "s"
            arg_data += _osc_string(arg)
        else:
            type_tag += "s"
            arg_data += _osc_string(str(arg))
    return msg + _osc_string(type_tag) + arg_data


def parse_osc_message(data: bytes) -> tuple[str, list]:
    end = data.index(b"\x00")
    address = data[:end].decode("utf-8")
    offset = end + 1
    offset += (4 - offset % 4) % 4
    if offset >= len(data) or data[offset:offset + 1] != b",":
        return address, []
    tag_end = data.index(b"\x00", offset)
    type_tag = data[offset + 1:tag_end].decode("utf-8")
    offset = tag_end + 1
    offset += (4 - offset % 4) % 4
    args = []
    for t in type_tag:
        if t == "i":
            args.append(struct.unpack(">i", data[offset:offset + 4])[0])
            offset += 4
        elif t == "f":
            args.append(round(struct.unpack(">f", data[offset:offset + 4])[0], 6))
            offset += 4
        elif t == "s":
            s_end = data.index(b"\x00", offset)
            args.append(data[offset:s_end].decode("utf-8"))
            offset = s_end + 1
            offset += (4 - offset % 4) % 4
        elif t in ("T", "F", "N"):
            args.append({"T": True, "F": False, "N": None}[t])
        elif t in ("h", "d"):
            args.append(struct.unpack(">q" if t == "h" else ">d", data[offset:offset + 8])[0])
            offset += 8
        else:
            raise ValueError(f"Unsupported OSC type tag: {t}")
    return address, args


class OscClient:
    """Synchronous OSC over UDP. Sends to :11000, listens on :11001 for replies."""

    def __init__(self):
        self.send_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.recv_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.recv_sock.bind((OSC_HOST, OSC_RECV_PORT))

    def send(self, address: str, args: list):
        self.send_sock.sendto(build_osc_message(address, args), (OSC_HOST, OSC_SEND_PORT))

    def query(self, address: str, args: list, timeout: float = 5.0) -> dict:
        # Drain any stale datagrams before issuing the query.
        self.recv_sock.setblocking(False)
        try:
            while True:
                self.recv_sock.recv(65535)
        except BlockingIOError:
            pass
        self.recv_sock.setblocking(True)

        self.send(address, args)
        self.recv_sock.settimeout(timeout)
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                self.recv_sock.settimeout(max(0.001, deadline - time.monotonic()))
                data, _ = self.recv_sock.recvfrom(65535)
            except socket.timeout:
                break
            try:
                resp_addr, resp_args = parse_osc_message(data)
            except (ValueError, UnicodeError, struct.error):
                continue
            # AbletonOSC echoes the query address on reply.
            ids = response_ids(address, args)
            if resp_addr == address and resp_args[:len(ids)] == ids:
                return {"status": "ok", "address": resp_addr, "args": resp_args}
        return {"status": "timeout", "address": address}

    def ping(self) -> bool:
        return self.query("/live/song/get/tempo", [], timeout=1.5).get("status") == "ok"

    def close(self):
        self.send_sock.close()
        self.recv_sock.close()


def execute_tool(tool_name: str, tool_input: dict, osc: OscClient) -> dict:
    """Use exactly the same validation and readback checks as the web app."""
    async def send(address, args, query, timeout):
        if query:
            return osc.query(address, args, timeout)
        osc.send(address, args)
        return {"status": "sent", "address": address}

    return asyncio.run(execute_verified(tool_name, tool_input, send))


def build_tools() -> list[dict]:
    tools = [dict(t) for t in ABLETON_TOOLS]
    tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}
    return tools


def run_claude_loop(client, messages: list, osc: OscClient) -> str:
    system = [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]
    tools = build_tools()
    text_parts = []
    for _ in range(MAX_ITERS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system,
            tools=tools,
            messages=messages,
        )
        text_parts = [b.text for b in response.content if b.type == "text"]
        tool_uses = [b for b in response.content if b.type == "tool_use"]

        if response.stop_reason == "end_turn" or not tool_uses:
            return "\n".join(text_parts)

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        blocked = False
        if text_parts:
            print("\n".join(text_parts))
        for tu in tool_uses:
            result = ({"status": "failed", "error": "Skipped because an earlier action in this batch failed. Inspect and replan.", "steps": []}
                      if blocked else execute_tool(tu.name, tu.input, osc))
            blocked = blocked or result.get("status") in {"failed", "partial"}
            print(f"  [{result['status']}] {tu.name}: {result.get('summary', result.get('error', ''))}")
            for step in result.get("steps", []):
                print(f"    {step['number']}. {step['kind']} {step['address']} {json.dumps(step['args'])} [{step['status']}]")
            if "sound" in result:
                print(json.dumps(result["sound"], indent=2))
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": json.dumps(result),
                "is_error": result.get("status") in BAD_STATUSES,
            })
        messages.append({"role": "user", "content": tool_results})

    return "Production paused at the action limit. Some requested work may remain; inspect the action results before continuing."


def main():
    from anthropic import AnthropicBedrock

    client = AnthropicBedrock(aws_region=AWS_REGION)
    osc = OscClient()

    print("\n  BeatMind DIRECT  (Bedrock: %s, region %s)" % (MODEL, AWS_REGION))
    if osc.ping():
        print("  \033[32m✓ AbletonOSC responding on :%d\033[0m" % OSC_SEND_PORT)
    else:
        print("  \033[33m⚠ No OSC reply on :%d — is Ableton open with AbletonOSC enabled?\033[0m"
              % OSC_SEND_PORT)
        print("    (You can still chat; tool calls will time out until Live is up.)")
    print("  Type a production request, or 'quit' to exit.\n")

    messages: list = []
    while True:
        try:
            prompt = input("\033[35myou ›\033[0m ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not prompt:
            continue
        if prompt.lower() in ("quit", "exit", "q"):
            break
        messages.append({"role": "user", "content": prompt})
        reply = run_claude_loop(client, messages, osc)
        messages.append({"role": "assistant", "content": reply})
        print(f"\033[32mbeatmind ›\033[0m {reply}\n")


if __name__ == "__main__":
    main()
