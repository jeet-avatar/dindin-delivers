---
phase: quick-175
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - ~/.claude/commands/handoff.md
  - ~/.claude/hooks/session-handoff-loader.js
  - ~/.claude/settings.json
autonomous: true
requirements: [QUICK-175]
must_haves:
  truths:
    - "Running /handoff saves a markdown file to ~/.claude/handoffs/{date}-{slug}.md"
    - "A new Claude session auto-injects the most recent handoff file as context"
    - "The handoff file is human-readable and covers topic, recent work, and pending tasks"
  artifacts:
    - path: "~/.claude/commands/handoff.md"
      provides: "/handoff slash command that collects session state and writes handoff file"
    - path: "~/.claude/hooks/session-handoff-loader.js"
      provides: "SessionStart hook that finds and injects most recent handoff"
  key_links:
    - from: "/handoff command"
      to: "~/.claude/handoffs/{date}-{slug}.md"
      via: "Bash tool Write"
      pattern: "~/.claude/handoffs/"
    - from: "session-handoff-loader.js"
      to: "SessionStart hook in settings.json"
      via: "registered hook entry"
      pattern: "session-handoff-loader"
---

<objective>
Build a global /handoff command plus a SessionStart hook so context survives across Claude sessions.

Purpose: Context loss between sessions wastes 5-10 minutes of ramp-up per session. A structured handoff file captures the session state in 60 seconds and is auto-injected into the next session.
Output: /handoff command (global slash command) + session-handoff-loader.js (SessionStart hook) + updated settings.json.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create /handoff global slash command</name>
  <files>~/.claude/commands/handoff.md</files>
  <action>
Create the file `/Users/jeet/.claude/commands/handoff.md` as a global Claude Code slash command.

The command must:
1. Ask Claude to synthesize current session state into a structured handoff file
2. Determine the handoff slug from the current project directory name or session topic (lowercase, hyphens, max 40 chars)
3. Determine today's date in YYYY-MM-DD format via Bash
4. Write the handoff file to `~/.claude/handoffs/{date}-{slug}.md` using the Write tool

The command prompt text (the body of handoff.md) should instruct Claude to:

```
You are creating a session handoff file. Follow these steps exactly:

1. Run `date +%Y-%m-%d` to get today's date.
2. Derive a short slug (≤40 chars, lowercase, hyphens) from the current project/task context.
3. Write the file `~/.claude/handoffs/{date}-{slug}.md` using the Write tool with this exact structure:

---
saved: {ISO datetime}
project: {project name or path}
slug: {slug}
---

# Session Handoff: {human-readable topic}

## What We Were Working On

{1-3 sentences describing the active task or topic}

## Recent Work Completed

{Bullet list of the last 3-5 things accomplished this session, with file paths where relevant}

## Pending / Next Steps

{Numbered list of immediate next actions, most important first}

## Key Context

{Any critical facts, gotchas, or decisions made this session that the next session needs to know}

## Key Files

| File | Why It Matters |
|------|----------------|
{table rows for files touched or referenced this session}

---
*Handoff saved: {datetime}*

4. After writing the file, output: "Handoff saved to ~/.claude/handoffs/{date}-{slug}.md"
```

The file at `~/.claude/commands/handoff.md` should contain ONLY the above prompt text (no frontmatter needed for global commands — just the markdown prompt body).
  </action>
  <verify>Run `/handoff` in Claude Code → it should create a file in `~/.claude/handoffs/` with today's date prefix. Check: `ls ~/.claude/handoffs/`</verify>
  <done>~/.claude/commands/handoff.md exists and the command produces a readable handoff file when invoked.</done>
</task>

<task type="auto">
  <name>Task 2: Create SessionStart hook that injects most recent handoff</name>
  <files>~/.claude/hooks/session-handoff-loader.js</files>
  <action>
Create `/Users/jeet/.claude/hooks/session-handoff-loader.js`.

The hook receives JSON on stdin (same shape as other hooks — has `session_id`, `cwd`). It must:

1. Find the most recent file in `~/.claude/handoffs/` (sort by filename desc — filenames are `YYYY-MM-DD-slug.md` so lexicographic sort works)
2. If no handoff file exists → exit 0 silently
3. If a handoff file exists AND it was saved within the last 7 days (check mtime) → read its contents
4. Output the handoff content in the Claude Code hook `prompt_injection` format so it appears at the start of the session

The hook output format for prompt injection (write to stdout, exit 0):
```json
{"type":"prompt_injection","prompt":"[SESSION HANDOFF]\n\nThe following context was saved from your last session:\n\n{file_contents}\n\n[END HANDOFF] — You may proceed with any new user requests. If asked to resume work, use this context."}
```

If the handoff is older than 7 days → skip injection (don't surface stale context).

Handle errors gracefully: any exception → exit 0 (never block session start).

Use only Node.js built-ins (fs, path, os) — no npm dependencies.

```javascript
#!/usr/bin/env node
// SessionStart hook — injects most recent handoff file as context
const fs = require('fs');
const path = require('path');
const os = require('os');

const HANDOFFS_DIR = path.join(os.homedir(), '.claude', 'handoffs');
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    // Ensure directory exists
    if (!fs.existsSync(HANDOFFS_DIR)) {
      process.exit(0);
    }

    // Find most recent handoff file
    const files = fs.readdirSync(HANDOFFS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) process.exit(0);

    const latestFile = path.join(HANDOFFS_DIR, files[0]);
    const stat = fs.statSync(latestFile);

    // Skip if older than 7 days
    if (Date.now() - stat.mtimeMs > MAX_AGE_MS) process.exit(0);

    const contents = fs.readFileSync(latestFile, 'utf8');

    const injection = {
      type: 'prompt_injection',
      prompt: `[SESSION HANDOFF]\n\nThe following context was saved from your last session:\n\n${contents}\n\n[END HANDOFF] — You may proceed with any new user requests. If asked to resume work, use this context.`
    };

    process.stdout.write(JSON.stringify(injection));
    process.exit(0);
  } catch (e) {
    // Never block session start
    process.exit(0);
  }
});
```

Write this exact content to the file and make it executable: `chmod +x ~/.claude/hooks/session-handoff-loader.js`
  </action>
  <verify>`node ~/.claude/hooks/session-handoff-loader.js <<< '{}'` — should output JSON with `type: prompt_injection` if a handoff file exists, or exit cleanly if none.</verify>
  <done>Hook file exists, is executable, outputs valid prompt_injection JSON when a handoff file is present.</done>
</task>

<task type="auto">
  <name>Task 3: Register session-handoff-loader.js in SessionStart hooks</name>
  <files>~/.claude/settings.json</files>
  <action>
Read `/Users/jeet/.claude/settings.json` (already read — current content is known).

Add `session-handoff-loader.js` as a new entry in the `SessionStart` hooks array. The entry goes AFTER `gsd-check-update.js` and BEFORE `telegram-poller.js` (ordering: update check → handoff → telegram).

Updated `SessionStart` section:
```json
"SessionStart": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"/Users/jeet/.claude/hooks/gsd-check-update.js\""
      },
      {
        "type": "command",
        "command": "node \"/Users/jeet/.claude/hooks/session-handoff-loader.js\""
      },
      {
        "type": "command",
        "command": "node \"/Users/jeet/.claude/hooks/telegram-poller.js\" start"
      }
    ]
  }
]
```

Write the full updated settings.json — preserve all other fields exactly (UserPromptSubmit, Stop, Notification, PostToolUse, statusLine, enabledPlugins, extraKnownMarketplaces).

Also create the handoffs directory if it doesn't exist: `mkdir -p ~/.claude/handoffs`
  </action>
  <verify>
1. `cat ~/.claude/settings.json | grep session-handoff-loader` → shows the hook entry
2. `ls ~/.claude/handoffs/` → directory exists (may be empty on first run)
3. Start a new Claude Code session — it should run the hook silently if no handoff file exists yet
  </verify>
  <done>settings.json contains session-handoff-loader.js in SessionStart array. ~/.claude/handoffs/ directory exists. Next session start will attempt to load the most recent handoff.</done>
</task>

</tasks>

<verification>
1. `/handoff` command is available globally in Claude Code (tab-complete shows it)
2. Running `/handoff` creates `~/.claude/handoffs/YYYY-MM-DD-*.md` with all sections populated
3. Starting a new session with a recent handoff file → hook injects the content as session context
4. Starting a new session with no handoff file → hook exits silently, no error
5. `node ~/.claude/hooks/session-handoff-loader.js <<< '{}'` exits with code 0 in all scenarios
</verification>

<success_criteria>
- /handoff command creates a structured handoff file in under 60 seconds of Claude execution
- SessionStart hook auto-injects the most recent handoff file (if ≤7 days old) into new sessions
- No session start blocking — hook always exits 0, even on errors
- Handoffs directory is created automatically
</success_criteria>

<output>
After completion, create `.planning/quick/175-build-global-handoff-command-that-saves-/175-SUMMARY.md`
</output>
