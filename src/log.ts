// A single "Copilot Speaketh" Output channel for diagnostics. Because we depend
// on an undocumented on-disk format and an external OS voice command, a quiet
// place to see what was parsed/spoken (and what failed) is worth having.

import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

export function initLog(): vscode.OutputChannel {
    channel ??= vscode.window.createOutputChannel("Copilot Speaketh");
    return channel;
}

export function log(message: string): void {
    channel?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function disposeLog(): void {
    channel?.dispose();
    channel = undefined;
}
