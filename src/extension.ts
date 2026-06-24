// Copilot Speaketh -- reads new GitHub Copilot Chat replies aloud.
//
// Flow: watch this workspace's chatSessions dir -> on a file change, parse the
// latest turn -> if it is COMPLETE and not yet spoken, clean its prose and speak
// it through the OS voice. No Copilot API is used (none exposes the response
// stream); we read the same on-disk transcript Copilot itself writes.

import * as vscode from "vscode";
import { readConfig, setEnabled } from "./config";
import { cleanForSpeech } from "./clean";
import { ParseOptions, ParsedTurn } from "./sessionParser";
import { findNewestTurn, resolveChatSessionsDir } from "./paths";
import { Speaker } from "./speech";
import { SpokenTracker } from "./spokenTracker";
import { StatusBar } from "./statusBar";
import { SessionWatcher } from "./watcher";
import { initLog, log, disposeLog } from "./log";

export function activate(context: vscode.ExtensionContext): void {
    initLog();
    log("Copilot Speaketh activated.");

    // Surface a missing/broken voice engine once, so it isn't silently dead.
    let warnedEngine = false;
    const speaker = new Speaker(message => {
        log("ENGINE ERROR: " + message);
        if (!warnedEngine) {
            warnedEngine = true;
            vscode.window.showWarningMessage("Copilot Speaketh: " + message);
        }
    });
    const tracker = new SpokenTracker();
    const statusBar = new StatusBar();
    statusBar.update(readConfig().enabled);

    const parseOptions = (): ParseOptions => {
        const c = readConfig();
        return { skipCodeBlocks: c.skipCodeBlocks, readThinking: c.readThinking, maxChars: c.maxChars };
    };

    const speakTurn = (turn: ParsedTurn): void => {
        const c = readConfig();
        const text = cleanForSpeech(turn.text, { skipCodeBlocks: c.skipCodeBlocks, maxChars: c.maxChars });
        if (text) {
            speaker.speak(text, { voice: c.voice, rate: c.rate });
        }
    };

    const chatSessionsDir = resolveChatSessionsDir(context.storageUri?.fsPath);
    let watcher: SessionWatcher | undefined;

    if (chatSessionsDir) {
        watcher = new SessionWatcher(chatSessionsDir, parseOptions, (sessionId, turn) => {
            // Auto-read: only complete turns, only once, only when enabled.
            if (!readConfig().enabled) { return; }
            if (!turn.complete) { return; }
            if (!turn.text.trim()) { return; }
            if (!tracker.markIfNew(sessionId, turn.requestId)) { return; }
            log(`Speaking ${turn.text.length} chars from session ${sessionId.slice(0, 8)}.`);
            speakTurn(turn);
        });
        watcher.start();
        log("Watching: " + chatSessionsDir);
        context.subscriptions.push({ dispose: () => watcher?.dispose() });
    } else {
        log("No folder/workspace open -- nothing to watch.");
        vscode.window.setStatusBarMessage(
            "Copilot Speaketh: open a folder/workspace to read its Copilot chats.",
            8000
        );
    }

    context.subscriptions.push(
        statusBar,
        { dispose: () => speaker.stop() },
        vscode.commands.registerCommand("copilotSpeaketh.toggle", async () => {
            const next = !readConfig().enabled;
            await setEnabled(next);
            statusBar.update(next);
            if (!next) { speaker.stop(); }
        }),
        vscode.commands.registerCommand("copilotSpeaketh.stop", () => speaker.stop()),
        vscode.commands.registerCommand("copilotSpeaketh.speakLast", () => {
            if (!chatSessionsDir) { return; }
            const newest = findNewestTurn(chatSessionsDir, parseOptions());
            if (newest) {
                tracker.forget(newest.sessionId, newest.turn.requestId);
                speakTurn(newest.turn);
            } else {
                vscode.window.showInformationMessage("Copilot Speaketh: no reply found to read.");
            }
        }),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("copilotSpeaketh.enabled")) {
                statusBar.update(readConfig().enabled);
            }
        })
    );
}

export function deactivate(): void {
    // subscriptions (watcher, speaker.stop) are disposed by VS Code.
    disposeLog();
}
