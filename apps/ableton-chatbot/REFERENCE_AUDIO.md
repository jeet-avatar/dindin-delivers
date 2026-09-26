# Reference Audio

The References view accepts audio uploads, estimates four stems with Demucs
`htdemucs`, and measures tempo, key candidates, waveform, stem activity and
eight-second energy windows with librosa. It does not identify original plugins,
recover original MIDI, isolate every drum, or label song sections with certainty.
Users audition the mix/stems, then explicitly choose **Discuss reference in chat**.
Analysis never sends Ableton commands. Chat asks which reference qualities to use
for an original composition and follows the guided one-part review workflow.

## Reviewed Reference Timeline

The current UI separates Stems, Timing, Listening and Template stages. Stem review
records use/exclude/needs-work decisions for every estimated stem after file-integrity
checks. These are user judgments, not automatic claims of separation quality.

Timing starts with contiguous MFCC-based agglomerative segments, with candidate
boundaries snapped to nearby estimated beats. Section labels, constant tempo and meter
remain proposals until reviewed. The map covers the entire file, supports split/merge
and boundary edits, and can cue the selected audio layer. It is not downbeat detection
or a recovered expressive tempo map.

In reference-seconds mode, confirmed timestamps, tempo, meter, section names and
count constrain the planner. Fractional bar lengths are retained rather than rounded.
Custom-bars mode is available for deliberate restructuring. Changing reviewed stems
or timing makes a reference-timed draft stale; regeneration/revision and approval are
required. Optional effect suggestions describe intent only, with off/subtle/moderate
choices; they do not identify the original chain or apply effects to Live.

Approved templates export a ZIP with `template.json` and `timing-guide.mid`. The MIDI
uses low-velocity note-0 placeholders spanning the sections for tempo-map import.
Keep that guide muted and without an instrument. MIDI markers are not guaranteed to
become Live locators. No `.als`, stems, original notes or loaded devices are exported.

Implementation references:
- https://github.com/facebookresearch/demucs (archived upstream; separation remains estimated)
- https://librosa.org/doc/0.11.0/generated/librosa.segment.agglomerative.html
- https://mido.readthedocs.io/en/stable/files/midi.html
- https://help.ableton.com/hc/en-us/articles/360003387979-Importing-a-tempo-map

`mir-aidj/all-in-one` was evaluated as an alternative structural-analysis engine,
but is not integrated. Its semantic section detection should not be attributed to
the current librosa-based implementation.

## Local Setup

- Install FFmpeg and `backend/requirements-reference.txt` into the backend environment.
- Preload the model: `python -c 'from demucs.pretrained import get_model; get_model("htdemucs")'`.
- Set `BEATMIND_REFERENCE_ENABLED=1` and `BEATMIND_REFERENCES_DIR` to a private data directory.
- Start the backend normally; point `NEXT_PUBLIC_API_URL` at it for local frontend testing.

Core dependencies remain separate from the optional CPU/ML dependencies. Model
weights are fetched from the upstream Demucs distribution during preload. Input
audio is processed on the configured server, not uploaded to a separation API.

## Limits and Operations

- Uploads require authentication, subscription/trial, and an upload-rights confirmation.
- Accepted formats: WAV, AIFF, MP3, M4A, FLAC, OGG. Maximum 50 MB, 5 seconds to 10 minutes.
- One worker at a time per server process; five stored references per account;
  ten upload attempts per hour per user. Upload timeout 120 seconds, worker timeout 30 minutes.
- FFmpeg uses an explicit audio demuxer and file/pipe protocols only. No URL imports.
- Audio downloads, metadata, deletion and reference context enforce ownership.
  Tokens are sent as authorization headers, never audio query parameters.
- Uploads and derived audio persist until user deletion. Provision storage for up
  to roughly 0.6 GB per full-length reference, plus model weights and working space.
- Worker errors are shown as failures, not successful analyses. Interrupted jobs
  are marked failed at startup. Processing references cannot be deleted mid-write.
- This implementation requires a single backend worker, as does the existing bridge.
  Do not enable it in a multi-worker deployment without shared job ownership/queueing.
- Production enablement requires the optional packages, FFmpeg, cached weights,
  persistent `BEATMIND_REFERENCES_DIR`, measured CPU/RAM capacity and upload limits
  supported by the proxy. It is disabled by default. It is not deployed by code edits.

## Musical Review

Ask style once, select and audition a source, obtain sample approval, ask about
feel, then optional envelope/tone/effects. Compare levels and audition changes.
Approval does not automatically create the next instrument. A new audition of
the same track/scene updates that part's review rather than consuming the next
planned part. A final next-part choice is required before building it.
# Optional Audio Listening

## Whole-track Listening and Creative Templates

`POST /api/references/{id}/listen-whole` requires authenticated ownership, a current
subscription/trial and explicit consent. It starts a background job with at most 20
consecutive excerpts, each 5-30 seconds, covering the complete reference. Two jobs
per account per hour are allowed, in addition to the ten single-excerpt attempts.
There are no automatic paid retries. Repeating the same whole-track request reuses
already-checked matching intervals and attempts only missing ones. Stop requests and
server restarts preserve completed intervals and mark the job interrupted.

Each result must contain rhythm, bass, texture, change and uncertainty observations.
Timestamp-only or malformed responses fail validation. Local three-second head/tail
RMS measurements identify large changes (12 dB); contradictory energy-trend labels
are rejected. These limited checks do NOT establish musical accuracy. All source
identification and arrangement interpretations remain subject to human review.
Legacy free-text results remain visible but do not count as checked coverage.

The frontend keeps preferences in a per-reference creative brief, with separate
keep/avoid fields, style, mood, tempo, meter, feel and source constraints. It does not
silently learn a permanent taste profile from uploaded files. Manual drafts work
without another model request. Optional AI proposals require separate consent to
send the brief and saved analysis to OpenAI. They use `BEATMIND_TEMPLATE_MODEL`
(default `gpt-4.1`) with strict structured output, not the audio model, which requires
audio input or output. Five proposals per account per hour are allowed.

AI proposals can suggest parts and sections, but cannot overwrite explicit tempo,
style, exclusions or source constraints. Drafts are revisioned; editing resets
approval. Approval is for planning only. Chat receives bounded interval evidence and
the brief; it must inspect the connected set, discover real sources and build one
requested part at a time. Session-section blueprints are not Arrangement View clips,
rendered music, or saved Ableton `.als` files. No new direct Ableton write path was added.

Production retains the existing single-worker assumption. Provision persistent
reference storage and replace test secrets before deployment. This feature has not
been deployed as part of local testing.

Text planning model: https://developers.openai.com/api/docs/models/gpt-4.1
Structured output: https://developers.openai.com/api/docs/guides/structured-outputs

In References, select a processed track, enter musical intent, select a 5-30 second
excerpt and audio layer, and explicitly consent to sending it to OpenAI. Listening
notes are saved separately from signal measurements and included when discussing
the reference in chat. This action does not change Ableton.

Set `BEATMIND_AUDIO_LISTENING_ENABLED=1` and provision `BEATMIND_AUDIO_API_KEY`
in the backend secret environment (or use `OPENAI_API_KEY`), then restart the backend.
Never put the key in frontend configuration or chat. `BEATMIND_AUDIO_MODEL` defaults
to `gpt-audio-1.5`. Calls incur provider charges; ten attempts per account per hour
and one simultaneous server request are allowed. Failed requests are not automatically
retried. The current implementation assumes the existing single backend worker.

Only the selected excerpt and intent are sent; `store:false` is requested. This is
not a promise of zero provider retention. Notes are model impressions, not verified
instrument identification or whole-song analysis. Music-specific quality requires
evaluation with real references. No live provider verification is possible without
a configured key.

API reference: https://developers.openai.com/api/docs/guides/audio-chat-completions
