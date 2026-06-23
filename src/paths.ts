// Locating the current workspace's chatSessions directory WITHOUT hardcoding
// per-OS roots. VS Code gives the extension its own storage path:
//     <...>/workspaceStorage/<workspace-hash>/<publisher.extension>
// so chatSessions is a sibling of our storage folder. This resolves correctly
// on Windows (%APPDATA%\Code\...) and macOS (~/Library/Application Support/Code/...)
// alike, because VS Code supplies the right base for the host OS.

import * as fs from "fs";
import * as path from "path";
import { parseLatestTurn, ParsedTurn, ParseOptions } from "./sessionParser";

export function resolveChatSessionsDir(storageFsPath: string | undefined): string | undefined {
    if (!storageFsPath) {
        return undefined; // no folder/workspace open -> no chat sessions to watch
    }
    const hashDir = path.dirname(storageFsPath);
    return path.join(hashDir, "chatSessions");
}

/** Newest-modified session's latest turn (for the "speak last reply" command). */
export function findNewestTurn(
    chatSessionsDir: string,
    opts: ParseOptions
): { sessionId: string; turn: ParsedTurn } | undefined {
    if (!fs.existsSync(chatSessionsDir)) {
        return undefined;
    }
    const files = fs.readdirSync(chatSessionsDir)
        .filter(f => f.endsWith(".json"))
        .map(f => {
            const full = path.join(chatSessionsDir, f);
            return { full, sessionId: path.basename(f, ".json"), mtime: safeMtime(full) };
        })
        .sort((a, b) => b.mtime - a.mtime);

    for (const f of files) {
        try {
            const session = JSON.parse(fs.readFileSync(f.full, "utf8"));
            const turn = parseLatestTurn(session, opts);
            if (turn && turn.text.trim()) {
                return { sessionId: f.sessionId, turn };
            }
        } catch {
            // try the next file
        }
    }
    return undefined;
}

function safeMtime(file: string): number {
    try {
        return fs.statSync(file).mtimeMs;
    } catch {
        return 0;
    }
}
