// Watches this workspace's chatSessions directory and emits the latest turn of
// any session file that changes. Parsing/dedup/completion decisions live in the
// caller (extension.ts) -- this layer only debounces disk churn and tolerates
// partial reads (VS Code rewrites the file mid-stream, so JSON.parse may fail;
// we simply wait for the next event).

import * as fs from "fs";
import * as path from "path";
import { parseLatestTurn, ParsedTurn, ParseOptions } from "./sessionParser";

export type TurnHandler = (sessionId: string, turn: ParsedTurn) => void;

export class SessionWatcher {
    private watchers: fs.FSWatcher[] = [];
    private timers = new Map<string, NodeJS.Timeout>();
    private disposed = false;

    constructor(
        private readonly chatSessionsDir: string,
        private readonly getOptions: () => ParseOptions,
        private readonly onTurn: TurnHandler
    ) {}

    start(): void {
        const parent = path.dirname(this.chatSessionsDir);
        if (fs.existsSync(this.chatSessionsDir)) {
            this.watchDir();
        } else if (fs.existsSync(parent)) {
            // chatSessions is created on first chat; watch the parent until then.
            const w = fs.watch(parent, (_e, file) => {
                if (file === "chatSessions" && fs.existsSync(this.chatSessionsDir)) {
                    w.close();
                    this.watchDir();
                }
            });
            this.watchers.push(w);
        }
    }

    private watchDir(): void {
        const w = fs.watch(this.chatSessionsDir, (_e, file) => {
            if (!file || !file.endsWith(".json")) { return; }
            this.debounce(file);
        });
        this.watchers.push(w);
    }

    private debounce(file: string): void {
        const existing = this.timers.get(file);
        if (existing) { clearTimeout(existing); }
        this.timers.set(file, setTimeout(() => {
            this.timers.delete(file);
            if (this.disposed) { return; }
            this.handleFile(path.join(this.chatSessionsDir, file), this.onTurn);
        }, 300));
    }

    private handleFile(filePath: string, handler: TurnHandler): void {
        let session: any;
        try {
            session = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch {
            return; // partial/locked write -- a later event will retry
        }
        const turn = parseLatestTurn(session, this.getOptions());
        if (turn) {
            const sessionId = path.basename(filePath, ".json");
            handler(sessionId, turn);
        }
    }

    dispose(): void {
        this.disposed = true;
        for (const t of this.timers.values()) { clearTimeout(t); }
        this.timers.clear();
        for (const w of this.watchers) {
            try { w.close(); } catch { /* ignore */ }
        }
        this.watchers = [];
    }
}
