// A clickable status-bar item showing whether reading is on, toggling on click.

import * as vscode from "vscode";

export class StatusBar {
    private readonly item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.item.command = "copilotSpeaketh.toggle";
        this.item.show();
    }

    update(enabled: boolean): void {
        this.item.text = enabled ? "$(unmute) Speaketh" : "$(mute) Speaketh";
        this.item.tooltip = enabled
            ? "Copilot Speaketh is reading replies aloud. Click to mute."
            : "Copilot Speaketh is muted. Click to enable.";
    }

    dispose(): void {
        this.item.dispose();
    }
}
