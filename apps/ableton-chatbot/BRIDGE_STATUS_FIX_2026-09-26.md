# Account-specific bridge status UI

Fixed the unconditional bridge download action in Home and Downloads, and the
initial false/offline state in chat. All three views now share the authenticated
`/api/bridge/status` result for the signed-in user, not the global health count.

- Connected: green `Bridge connected`; no launch or installer prompt. Home and
  Downloads offer `Let's make music` to open chat.
- Checking: neutral loading status, without suggesting the app is missing.
- Disconnected: open the installed bridge first. The installer is inside an
  explicit `Need to install the bridge?` disclosure.
- Failed/malformed/timed-out check: unavailable status and retry, not offline.
- Expired sign-in: sign-in status, not a bridge download prompt.

Polling is bounded, non-overlapping, refreshed on focus/online/visibility, and
cancelled on unmount/account change. Stream session events request a fresh status
check rather than overwrite it with an old boolean. An OS launch request alone
never marks the bridge connected.

Verification: six frontend regression files passed; Playwright at 1440x1000 and
390x844 passed initial loading, connected Home/chat/Downloads, no connected-user
installer prompt, offline launch and timeout fallback, reconnect on focus,
HTTP/malformed/network errors, retry, and session expiry. Screenshots inspected;
no horizontal overflow or page errors. Production build and TypeScript passed.
Browser tests use isolated API fixtures and send no music commands.

The six changed source/test files are also in the original BeatMind working copy.
No website/backend deployment was performed for this fix; it is part of the local
application release candidate pending the remaining release gates. The signed
bridge installer itself was not changed.
