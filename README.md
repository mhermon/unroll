# Unroll

**Read agent traces and chat logs in VS Code.**

Unroll opens a JSONL conversation file as a chat you can scroll, search and filter. Use it on sessions you record yourself, such as Claude Code or Codex logs, or on JSONL datasets you download from Hugging Face or a repository.

No account, API key, server or Python install needed.

![A complete saved chat with clear roles, formatted paragraphs and code](https://mhermon.github.io/unroll/assets/overview.png)

## Getting started

1. Download the VSIX from [Releases](https://github.com/mhermon/unroll/releases/latest) and choose **Extensions → … → Install from VSIX…** in VS Code. A Marketplace listing is on the way.
2. Open a `.jsonl`, `.ndjson` or `.json` file. To try it first, [download the example file](https://mhermon.github.io/unroll/examples/claude-session.jsonl).
3. Right-click the file and choose **Unroll: Open as Agent Trace**.

You can also use the preview icon in the editor title bar, the Command Palette, or **Reopen Editor With… → Agent Trace (Unroll)**. The normal text editor stays the default.

Try the downloadable [chat dataset](https://mhermon.github.io/unroll/examples/chat-samples.jsonl) or [agent trace](https://mhermon.github.io/unroll/examples/claude-session.jsonl). Both are synthetic examples used in the screenshots.

## Features

- **Search and filter.** Search message text, tool names, arguments and results with Ctrl/Cmd+F, and filter by role.
- **Readable tool calls.** Arguments are formatted, and each call links to its result.
- **Original JSON.** Show the record a message came from, or open its line in the source file.
- **Growing files.** The preview updates as lines are added. Follow latest keeps the newest messages in view.
- **Long files.** Move around with the step map, stable step numbers and keyboard shortcuts.

![Opening a Claude Code session in Unroll, following a tool call, searching and switching to a chat dataset](https://mhermon.github.io/unroll/assets/walkthrough.gif)

[Watch the walkthrough with captions](https://mhermon.github.io/unroll/#demo) · [Read the guide](https://mhermon.github.io/unroll/guide.html)

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

Files can be JSONL or a single JSON array. Formats vary between tools and versions, so some files may only partly match. Records that aren’t recognized are still shown as raw events. Parquet isn’t supported.

## Themes and shortcuts

![Unroll in a light VS Code theme](https://mhermon.github.io/unroll/assets/light.png)

Unroll uses your VS Code theme. Press **?** in the preview to see all shortcuts. The main ones are **J/K** for steps, **N/P** for tool calls, **R** for the original record and **O** for the source line. Single-letter shortcuts are ignored while you type in an input.

## Privacy

Unroll only reads and displays the file you open. It has no telemetry and doesn’t connect to any model provider. It doesn’t run recorded tool calls, load remote images from file content, or change your files. Markdown links open only when you click them.

Files are processed in the VS Code extension host and webview. In a remote workspace, that can be the remote machine. See the [privacy page](https://mhermon.github.io/unroll/privacy.html) for details.

## Requirements and limits

- Desktop VS Code 1.96 or newer. Standalone vscode.dev isn’t supported.
- Files up to 100 MB by default. Files are parsed in memory.
- In a JSON array file, source links open the start of the document.
- Token counts are estimates of the text in the file. They aren’t billed usage or the context size of a request.

## Feedback

[Report a bug or an unsupported format](https://github.com/mhermon/unroll/issues/new/choose). Include your extension version, VS Code version, OS and a small sanitized example. Don’t attach credentials or private conversations.

Unroll is a preview release under the MIT license. This repository has documentation, examples and release builds; the source code is maintained privately. Provider names describe compatible formats and don’t imply affiliation.
