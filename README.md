# RunTranscript

**Read AI agent traces as conversations inside VS Code.**

Open Claude Code, Codex, and other JSONL transcripts. Follow the conversation, inspect tool calls, and find the original source record. No server, account, Python installation, or API key required.

![RunTranscript showing an agent investigating a failing checkout test](https://mhermon.github.io/runtranscript/assets/overview.png)

## Start with a trace

1. Install **RunTranscript — AI Agent Trace Viewer** from the VS Code Marketplace, or download a VSIX from [Releases](https://github.com/mhermon/runtranscript/releases).
2. Open a `.jsonl`, `.ndjson`, or `.json` file. [Download a synthetic example](https://mhermon.github.io/runtranscript/examples/checkout-debug.jsonl).
3. Right-click the file and choose **RunTranscript: Open as Agent Trace**.

You can also use the editor’s preview icon, the Command Palette, or **Reopen Editor With… → Agent Trace (RunTranscript)**. The normal text editor remains the default.

## Find the step that matters

- **Search the run.** Find message text, tool names, arguments, and results with Ctrl/Cmd+F. Filter by role.
- **Inspect tool activity.** Expand arguments and follow the connection between a call and its recorded result.
- **Check the original.** Open a step’s JSON record or jump to its source line beside the preview.
- **Follow a growing trace.** Enable Follow latest to stay with new steps as the file changes.
- **Navigate long conversations.** Use the trajectory map, stable step numbers, and keyboard shortcuts.

![A short recording of search and tool inspection in RunTranscript](https://mhermon.github.io/runtranscript/assets/walkthrough.gif)

[Watch the walkthrough with captions](https://mhermon.github.io/runtranscript/#demo) · [Read the full guide](https://mhermon.github.io/runtranscript/guide.html)

## Supported formats

| Trace or dataset | Recognized content |
| --- | --- |
| Claude Code / Anthropic | Message envelopes, text, thinking, tool use and tool results |
| Codex / OpenAI Responses | Response items, messages, function calls, custom tools and outputs |
| OpenAI Chat Completions | Role/content messages and tool calls |
| Gemini | Model messages, parts, function calls and responses |
| Vercel AI SDK | Text, reasoning and tool parts |
| OpenTelemetry GenAI | Input/output message attributes in spans |
| LangChain / LangGraph | Human, AI and tool messages, including nested state dumps |
| ShareGPT / conversation datasets | Conversation and message envelopes |

These are recognized record shapes, not a promise to parse every export from each provider. Unrecognized records remain available as original events. Files may contain JSONL records or a single JSON array. Parquet belongs to the separate browser/Python application and is not supported by this extension.

## Built for your editor

![RunTranscript in a light VS Code theme](https://mhermon.github.io/runtranscript/assets/light.png)

Press **?** in the preview for shortcuts. Use **J/K** for steps, **N/P** for tool calls, **R** for the original record, and **O** for source. Single-letter shortcuts yield while you type in inputs.

## Privacy and limits

The extension processes trace content in the VS Code extension host and webview. In a remote workspace, that host can be remote. It has no telemetry or model-provider connection, does not execute recorded tools, does not load remote images from traces, and does not modify trace files. External Markdown links open only when clicked. See [Privacy](https://mhermon.github.io/runtranscript/privacy.html).

VS Code 1.96 or newer is required. This is a desktop extension; a standalone vscode.dev browser host is not supported. The default file limit is **100 MB**. Parsing is in memory; it is not a streaming parser. JSON-array source links open the start of the document. Token counts are heuristic estimates of recorded text, not billed usage or a request’s context size.

## Help and feedback

[Report a bug or unsupported format](https://github.com/mhermon/runtranscript/issues/new/choose). Include your extension version, VS Code version, OS, and a small sanitized example. Never attach credentials or private conversations.

RunTranscript is a preview release. The public repository contains documentation, examples and binary releases; implementation source is maintained privately. The distributed extension is MIT licensed. Provider names describe compatible formats and do not imply affiliation.
