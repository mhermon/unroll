# Unroll

**Read agent traces like a conversation, right in VS Code.**

Open a Claude Code session, a Codex log or a Hugging Face trajectory dataset and see every message, tool call and result in order. Check any step against the raw JSON. Your data never leaves your machine.

- **Works with the logs you already have.** Claude Code, Codex, OpenAI, Gemini, Vercel AI SDK, LangChain and OpenTelemetry logs, plus eval and training datasets such as SWE-agent, OpenHands and τ-bench.
- **Fast on big files.** In benchmarks, a 110 MB log with 110,000 messages shows its first messages in under a second. Scroll, jump to the end or search the whole file.
- **Nothing hidden.** Every message links to its raw JSON record and its line in the file.
- **Private and free.** Works offline, with no account, API key or telemetry. It never runs recorded tool calls or changes your files.

![A Claude Code session in Unroll: the request, the assistant's reasoning, a Bash call linked to its result and the failing test output](https://mhermon.github.io/unroll/assets/overview.png)

## Get started

1. Download the VSIX from [GitHub Releases](https://github.com/mhermon/unroll/releases/latest). In VS Code, open the Extensions view, choose **… → Install from VSIX…** and select the file. A Marketplace listing is on the way.
2. Right-click a `.jsonl`, `.ndjson` or `.json` file and choose **Unroll: Open as Agent Trace**. The editor's preview icon, the Command Palette and **Reopen Editor With…** work too. Your usual text editor stays the default.

No trace handy? Try one of the made-up examples: a [Claude Code session](https://mhermon.github.io/unroll/examples/claude-session.jsonl), a [dataset of agent runs](https://mhermon.github.io/unroll/examples/agent-runs.jsonl) or a [chat dataset](https://mhermon.github.io/unroll/examples/chat-samples.jsonl).

![Opening a Claude Code session in Unroll, following a tool call to its result, checking the original record and source line, searching, and browsing a dataset of agent runs](https://mhermon.github.io/unroll/assets/walkthrough.gif)

[Watch the one-minute walkthrough with captions](https://mhermon.github.io/unroll/#demo) · [Read the guide](https://mhermon.github.io/unroll/guide.html)

## What you can do

- **Follow each tool call to its result.** Arguments appear as readable fields, not escaped JSON. Select *result at line N* to see a call next to everything it returned.
- **Check it against the raw data.** Switch any message to the exact JSON record it came from (**R**), switch to its whole dataset row, or open its line in the file (**O**). Records Unroll doesn't recognize stay available under **View → Show events**.
- **Search and filter.** Search messages, tool names, arguments and results with Ctrl/Cmd+F, and filter by role. On a long file you can stop a search and continue it later; **Esc** clears it and returns you to where you were reading.
- **Review a whole eval or dataset.** When each row is a full run, Unroll lists the runs with their outcome. Filter by id, field or text, see each run's model, reward or cost above its conversation, and move between runs with **Shift+J/K**.
- **Watch a run live.** Leave a session open while an agent works. New steps appear as they're written, and **F** follows the latest.
- **Read large logs.** Saved JSONL files open straight from disk and load as you scroll. Jump to the start or end, or use the map of loaded messages.

![A dataset of eight agent runs: a list with resolved and failed outcomes, and the selected run's model, cost and conversation](https://mhermon.github.io/unroll/assets/conversations.png)

## Supported formats

| Source | Recognized content |
| --- | --- |
| Claude Code / Anthropic | Message envelopes, text, thinking, tool use and tool results |
| Codex / OpenAI Responses | Response items, messages, function calls, custom tools and outputs |
| OpenAI Chat Completions | Role/content messages and tool calls |
| Gemini | Model messages, parts, function calls and responses |
| Vercel AI SDK | Text, reasoning and tool parts |
| OpenTelemetry GenAI | Input and output message attributes on spans |
| LangChain / LangGraph | Human, AI and tool messages, including nested state dumps |
| ShareGPT / chat datasets | Conversation and message envelopes |
| Trace datasets | One trace per row or array item: SWE-agent, OpenHands, τ-bench, AgentInstruct, Hermes, xLAM and Agent-SafetyBench-style (`thought` / `action` / `environment`) shapes |

Files can be JSONL, NDJSON or a single JSON array. Log formats change between tool versions, so a file may only partly match; anything unrecognized is still available as raw events. Parquet isn't supported.

## Keyboard shortcuts

Press **?** in the preview for the full list.

| Keys | Action |
| --- | --- |
| **J** / **K** | Next / previous step |
| **N** / **P** | Next / previous tool call |
| **Shift+J** / **Shift+K** | Next / previous run in a dataset |
| **R** | Show the original record |
| **O** | Open the step's line in the file |
| **/** or **Ctrl/Cmd+F** | Search |
| **Esc** | Clear search and filters |
| **F** | Follow the newest steps |
| **C** | Show or hide the run list |
| **T** | Show or hide the map |

Single-letter shortcuts are ignored while you type in a field. In the run list and the map, **Up/Down** and **Home/End** move the selection; in the map, **Enter** opens the selected message. Every shortcut is a VS Code command named **Unroll: …**, so you can rebind it.

## Themes

![Unroll in a light VS Code theme](https://mhermon.github.io/unroll/assets/light.png)

Unroll follows your VS Code theme, including light, dark and high contrast. Times are shown in UTC; hover one for the full timestamp.

## Privacy

Unroll reads the file you open and shows it to you. That's all it does.

- It sends nothing anywhere: no telemetry, account or model provider.
- It never runs the tool calls recorded in a trace, and never edits your files.
- It doesn't load remote images from trace content. Links open only when you click them.

In a remote workspace (SSH, containers, WSL), the file is read on the remote machine, where VS Code runs its extensions. See the [privacy page](https://mhermon.github.io/unroll/privacy.html) for details.

## Requirements and limits

- Desktop VS Code 1.96 or newer on Windows, macOS or Linux. The browser-only vscode.dev isn't supported.
- Saved `.jsonl` and `.ndjson` files have no size limit. `.json` files, unsaved edits and virtual filesystems are read into memory, up to 100 MB by default (**Unroll: Max File Size MB**).
- Large messages keep a short preview. **Read full text** opens the complete message in plain-text sections, with section search, copy, and Original JSON access. Closing restores your conversation position.
- The **In view** total estimates the size of the loaded messages in tokens, words or characters. It isn't a whole-file count or billed usage.

## Feedback

[Report a bug or an unsupported format](https://github.com/mhermon/unroll/issues/new/choose) with your extension version, VS Code version, OS and a small sanitized example. Issues are public, so don't attach credentials or private conversations.

Unroll is a preview release under the MIT license. This repository has documentation, examples and release builds; the source code is maintained privately. Provider names describe compatible formats and don't imply affiliation.
