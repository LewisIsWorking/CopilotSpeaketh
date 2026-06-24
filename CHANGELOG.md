# Changelog

## 0.2.0 (preview)

- Cleaner speech: box-drawing tables are skipped entirely (never read a grid
  aloud), and common symbols/abbreviations are pronounced naturally — "~10" as
  "about 10", PF2e/SF2e as Pathfinder/Starfinder, plus TTRPG, AoN, e.g., i.e., vs.
- Fixed false sentence stops: Copilot splits a sentence into separate parts around
  inline code/symbol references, which used to read as ". ." pauses. Prose
  fragments now join smoothly; real paragraph breaks still pause.

## 0.1.0 (preview)

First release.

- Reads finished GitHub Copilot Chat replies aloud **automatically**, by watching
  Copilot's on-disk chat sessions — no Copilot API or key required.
- Cross-platform, OS-native voices: macOS `say` (including the Irish voice
  "Moira") and Windows PowerShell + System.Speech (SAPI).
- Settings: enable/disable, voice, rate, max characters, skip code blocks, read
  thinking blocks.
- Commands: Toggle reading, Speak the last reply, Stop speaking — plus a
  status-bar mute/unmute button.
- Diagnostics in the **Copilot Speaketh** Output channel; a one-time warning if
  the OS voice engine can't start.
