# Copilot Speaketh

## Open Source Maintenance Fee

This project requires an [Open Source Maintenance Fee](https://opensourcemaintenancefee.org/) from
organisations that use the **official binary release** as part of revenue-generating activity and
have annual gross revenue of **US$10,000 or more**.

- The **source stays free** under this repository's LICENSE. The fee is not a licence fee.
- **Self-compiled binaries are exempt.** You may always build from source under the LICENSE.
- Organisations under US$10,000 annual gross revenue are **exempt**.
- Individuals, hobbyists and personal use are **exempt**.
- Issues, discussions and pull requests stay **open to everyone**, fee or not.

Pay the fee via [GitHub Sponsors](https://github.com/sponsors/LewisIsWorking) at the
**Maintenance Fee** tier. Full terms: [OSMFEULA.txt](OSMFEULA.txt).

Reads **GitHub Copilot Chat** replies aloud, automatically, on **macOS and Windows**.

VS Code exposes no API to observe Copilot's response stream, so this extension does
what it *can* do: it watches the same on-disk chat transcript Copilot itself writes
(`workspaceStorage/<hash>/chatSessions/*.json`), and when a reply finishes it speaks
the prose through your operating system's built-in voice — no cloud, no API key.

| OS | Voice engine | Notes |
|----|--------------|-------|
| macOS | `say` | Built-in. Ships the Irish voice **Moira** (`copilotSpeaketh.voice: "Moira"`). |
| Windows | PowerShell + System.Speech (SAPI) | Built-in. e.g. `Microsoft Hazel Desktop`. |

## Settings

| Setting | Default | Meaning |
|---------|---------|---------|
| `copilotSpeaketh.enabled` | `true` | Auto-read new replies. |
| `copilotSpeaketh.voice` | `""` | Voice name; blank = system default. |
| `copilotSpeaketh.rate` | `0` | macOS: wpm offset (+/-). Windows: -10..10. |
| `copilotSpeaketh.maxChars` | `0` | Cap per reply; `0` = whole reply. |
| `copilotSpeaketh.skipCodeBlocks` | `true` | Don't read fenced code aloud. |
| `copilotSpeaketh.readThinking` | `false` | Also read reasoning blocks. |

## Commands

- **Copilot Speaketh: Toggle reading on/off** (also the status-bar 🔊/🔇 button)
- **Copilot Speaketh: Speak the last reply now**
- **Copilot Speaketh: Stop speaking**

## Develop / run

```bash
npm install
npm run compile
# then press F5 in VS Code (Run Extension) to launch an Extension Development Host
```

Verify the parser against your *real* Copilot chats without launching VS Code:

```bash
npm run verify   # prints what would be spoken for your 8 most-recent sessions
npm test         # unit tests for the parser + speech cleaner (run compile first)
```

### Verifying on macOS

1. `npm install && npm run compile`
2. `npm run verify` — confirms the `~/Library/Application Support/Code/...` path resolves
   and your sessions parse. (Expect text from recent Copilot chats.)
3. Press **F5**, open a folder in the dev-host window, chat with Copilot → the reply is
   read aloud by `say`. Try `copilotSpeaketh.voice: "Moira"` for the Irish voice.

## Troubleshooting

- **No sound?** Check `View → Output → Copilot Speaketh` — it logs each reply it speaks
  and any engine error. If the OS voice can't start, you'll get a one-time warning.
- **Wrong/silent voice?** Set `copilotSpeaketh.voice` to an installed voice (macOS: run
  `say -v '?'` to list; Windows: any SAPI voice name, e.g. `Microsoft Hazel Desktop`).
- **Nothing happens at all?** Open a **folder/workspace** (Copilot writes chats per
  workspace) and make sure the workspace is **trusted** — the extension stays inactive in
  untrusted or virtual workspaces, and in Remote/Codespaces.

## Caveats

- The `chatSessions` format is **undocumented**; VS Code may change it across updates,
  which can break parsing. The extension fails safe (logs nothing aloud) rather than crash.
- `child_process` is restricted in **Remote/Codespaces** hosts, so speaking works on local
  installs only.
- Karaoke word-highlighting (in the sibling project *ClaudeCodeSpeaketh*) is not feasible
  in an extension host; it would need a separate windowed app.

## License

MIT
