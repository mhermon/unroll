# Changelog

## 0.6.0

- Rename the extension to Unroll (extension ID `mhermon.unroll`). Uninstall `mhermon.runtranscript` before installing Unroll in the same profile. Command and setting IDs keep the `chatview.*` prefix, so keybindings and settings carry over.
- Describe the extension as a viewer for agent traces and chat logs, including chat datasets.
- New website, README, walkthrough video and synthetic examples (a Claude Code session and a chat dataset).

## 0.5.0

- Introduce RunTranscript, the AI agent trace viewer for VS Code.
- Add a Marketplace quickstart, screenshots, walkthrough, sample trace, privacy documentation and a public issue tracker.
- Preserve existing `chatview.*` settings and keyboard command IDs for local installations.
- Package a reproducible preview release with release validation and third-party notices.

## Unreleased

- Add a document content total with cycling token/word/character units and optional per-message counts. Count text and tool activity without log envelopes, attachment data, or display markup; compute counts once per revision in the host.
- Rebalance the extension icon with centered vertical spacing, stronger rails, and matching first/last rows.

- Correct original-record lookup for compact JSON arrays and reject stale record requests after edits.
- Keep continuous writes refreshing, defer hidden-panel work, and preserve each panel's input focus across tab switches.
- Preserve unique Codex event messages; suppress only matching neighboring response copies.
- Remove redundant dataset parsing, unused message metadata, and repeated tool-argument formatting.
- Keep malformed tool calls inspectable and provide a recoverable error screen for renderer failures.
- Fix empty-content refusals, record shortcuts on collapsed messages, dialog focus, Escape behavior, narrow filter controls, and off-page keyboard selection.
- Scope shortcuts to the focused webview and correct the documented J/K and N/P order.
- Add revision and streaming regressions, strict host type checks, and native VS Code smoke tests for minimum/stable versions in CI.
- Refresh affected build dependencies and clean extension output before packaging.

## 0.4.0

- Read Gemini (`parts`, `functionCall`, `functionResponse`), Vercel AI SDK parts (`text`, `reasoning`, `tool-<name>`, `dynamic-tool`, `tool-invocation`), OpenTelemetry GenAI spans, LangChain messages and LangGraph state dumps. Anthropic blocks are now recognized bare as well as enveloped, so a logged `tool_result` no longer reads as user text.
- Fixed ShareGPT and other `{conversations: […]}` rows producing nothing: the editor now resolves speaker labels like `human` and `gpt` the same way on dataset rows as on message rows, and follows a trajectory nested under a state wrapper.
- Stopped shipping every original record to the preview. A step that parsed into messages re-reads its record from the file when you open **Record**; steps with nothing else to show still carry theirs. On a 76 MB transcript the payload falls from 114 MB to 39 MB and extension-host memory from 528 MB to 374 MB.
- Raised the preview limit to 100 MB, which covers real agent transcripts; an out-of-range record now reports that the file changed instead of quietly showing its neighbour.
- Added a Marketplace icon and gallery banner, and dropped the source map from the package (155 KB to 116 KB).
- Added a fixture per supported format, and `npm run check:corpus` to parse a directory of real traces and report coverage.

- Fixed JSON keys wrapping mid-word. A key and its value were laid out as two flex columns, so a long value squeezed the key's box until the key itself broke (`te` / `xt`). A pair is now one run of text with a hanging indent, so keys never break and continuation lines land under the start of the value.
- Fixed a crash that blanked the preview: the state-saving effect returned VS Code's `setState` result, which React ran as a cleanup function. The viewer now reports faults to a **RunTranscript** output channel instead of failing silently.
- Moved every shortcut onto contributed VS Code keybindings, so they appear in Keyboard Shortcuts, can be rebound, and fire once whether or not the webview iframe holds focus. The viewer reports caret focus through a `chatview.inputFocused` context key so single-letter keys stand down while you are typing in search.
- Added `J`/`K` step navigation, `N`/`P` tool-call navigation, `[`/`]` paging, `R` record inspection, `O` source navigation, `F` follow, `T` map, `/` and `Ctrl/Cmd+F` search, and a `?` shortcut reference. Every action is also a `RunTranscript: …` command in the palette.
- Focus the reader once a trace loads, so the keyboard works without clicking into the preview first.
- Rebuilt each message as a card with a label column and a content column. Role, step number and elapsed time hold one position down the page; the content column is only content. The role colour appears once, on the rule dividing them.
- Removed the per-card header bar, the role badges and the nested boxes around reasoning, tool calls and records. Anything that opens in place is a summary line with an indent rule.
- A tool call now reads as a command: name, arguments on one line, and its result on the next (`→ result at step 12`, which isolates the pair). Row actions reveal on hover instead of holding a column open on every card, and take their own line where there is no hover to reveal them.
- Narrow editors fold the label column into a header line rather than paying for it at every width.
- Replaced the 220px page outline with a 46px trajectory map covering the whole run: role-coloured ticks, a viewport bracket, a cursor for the current step, hover previews, and click-to-jump across pages.
- Reworked the chrome: one header line, a merged filter/status row, and a step counter that matches the numbers on the cards.
- Parse each document revision once and share it across panels, instead of re-parsing on every tab switch and view-state change.
- Keep the webview alive when hidden, so switching editor tabs no longer reloads the preview and loses scroll position and expanded tool calls.
- Build the webview stylesheet against only the modules it renders: 82 kB to 38 kB.

## 0.3.0

- Recognize camelCase toolCalls/toolCallId fields, including assistant turns with empty, null, or missing text.
- Keep calls inside assistant turns, expand arguments for tool-only messages, and show recorded-result locations beside each call.
- Label chronological tool outputs with their tool name and originating step; inspect an invocation without mixing reused IDs.
- Make results searchable by tool name and copy both assistant text and calls. Preserve original records and source navigation.

## 0.2.1

- Retry the webview startup handshake and show a recoverable error after a bounded timeout instead of loading forever.
- Resend the document when an editor becomes visible.
- Require a rendered-message acknowledgment in native VS Code integration tests, including updates and reopen.

## 0.2.0

- Redesigned the reading layout with a message outline, compact role tabs, native theme colors, and comfortable/compact spacing.
- Added stable step numbers, relative timestamps, keyboard navigation, collapse/expand controls, per-message copy, and original-record inspection.
- Added exact tool-call/result filtering and an opt-in follow-latest mode that pauses when navigating or scrolling up.
- Improved long text and reasoning previews, search indexing, saved-state validation, narrow layouts, and accessibility.
- Split the webview into document bridge, view model, outline, message, and application modules. Added regression coverage for filtering, stable numbering, call matching, state restoration, and elapsed times.

## 0.1.0

- Initial JSON/JSONL trace custom editor with live source updates, shared parsing, source navigation, and offline rendering.
