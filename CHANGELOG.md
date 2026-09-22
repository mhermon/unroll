# Changelog

## 0.8.0

- Open saved JSONL/NDJSON directly from disk without a file-size cutoff, with bounded memory, incremental indexes, cancellable search, and live updates.
- Select cases using stackable Boolean, numeric, text, regex, and presence conditions, with typed value lists and suggestions from loaded cases.
- Read filtered messages in context and return to the same results and reading position.
- Preserve roles in large-message previews and read complete text or original JSON in on-demand sections, with section search and copy.
- Show preview-aware word, character, and estimated-token counts.
- Improve tool-call linking, keyboard navigation, source provenance, split-preview lifecycle, error recovery, and large-file responsiveness.
- Refresh the documentation, synthetic examples, screenshots, and walkthrough.

## 0.7.0

- Read trace datasets: files with one conversation or agent trace per JSONL row or JSON array item, including SWE-agent, OpenHands, τ-bench, AgentInstruct, Hermes and xLAM-style rows, and JSON files that wrap their rows in one key.
- Add a conversation list for these files, with message and tool-call counts and each row's outcome. Filter it by id, row field or message text; **C** shows or hides it, and **Shift+J / Shift+K** move between conversations.
- Show each row's other fields (model, outcome, reward, patch…) above its conversation.
- Read agent turns logged as `thought` + `action` with an `environment` reply (Agent-SafetyBench and ReAct-style logs): an action naming a tool becomes a tool call, and the next observation its result. Rows can be bare message arrays or hold one under a field, including `content: [[...]]`.
- Title rows by common id fields such as `instance_id`, `task_id` and `session_id`.
- Link JSON array items to the line where each starts, instead of the top of the file.
- Fix: plain messages were dropped from conversations that mixed them with Claude-style content blocks, and a `model` field could turn a dataset row into a single message.

## 0.6.0

- Rename the extension to Unroll (extension ID `mhermon.unroll`). Uninstall `mhermon.runtranscript` before installing Unroll in the same profile. Command and setting IDs keep the `chatview.*` prefix, so keybindings and settings carry over.
- Describe the extension as a viewer for agent traces and chat logs, including chat datasets.
- New website, README, walkthrough video and synthetic examples (a Claude Code session and a chat dataset).

## 0.5.0

- Introduce RunTranscript, the AI agent trace viewer for VS Code.
- Add a Marketplace quickstart, screenshots, walkthrough, sample trace, privacy documentation and a public issue tracker.
- Preserve existing `chatview.*` settings and keyboard command IDs for local installations.
- Package a reproducible preview release with release validation and third-party notices.
