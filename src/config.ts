// Thin typed wrapper over the extension's VS Code settings.

import * as vscode from "vscode";

export interface SpeakethConfig {
    enabled: boolean;
    voice: string;
    rate: number;
    maxChars: number;
    skipCodeBlocks: boolean;
    readThinking: boolean;
}

export function readConfig(): SpeakethConfig {
    const c = vscode.workspace.getConfiguration("copilotSpeaketh");
    return {
        enabled: c.get<boolean>("enabled", true),
        voice: c.get<string>("voice", ""),
        rate: c.get<number>("rate", 0),
        maxChars: c.get<number>("maxChars", 0),
        skipCodeBlocks: c.get<boolean>("skipCodeBlocks", true),
        readThinking: c.get<boolean>("readThinking", false),
    };
}

export async function setEnabled(enabled: boolean): Promise<void> {
    await vscode.workspace
        .getConfiguration("copilotSpeaketh")
        .update("enabled", enabled, vscode.ConfigurationTarget.Global);
}
