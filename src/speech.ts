// Cross-platform speech via the operating system's own TTS, so the extension
// host never needs an audio API:
//   macOS   -> `say`        (built-in; ships the Irish voice "Moira")
//   Windows -> PowerShell + System.Speech (SAPI; built-in)
//
// Text is passed via a UTF-8 temp file rather than as a shell argument: it
// sidesteps quoting/escaping and the PowerShell stdin/encoding traps. Only one
// utterance plays at a time -- a newer reply kills the current one (latest-wins).

import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface SpeechOptions {
    voice: string;
    rate: number;
}

export class Speaker {
    private current: ChildProcess | undefined;
    private currentTextFile: string | undefined;

    /** Speak text now, interrupting anything already playing. */
    speak(text: string, opts: SpeechOptions): void {
        const trimmed = (text ?? "").trim();
        if (!trimmed) {
            return;
        }
        this.stop();

        const file = path.join(
            os.tmpdir(),
            `copilot-speaketh-${process.pid}-${Date.now()}.txt`
        );
        fs.writeFileSync(file, trimmed, { encoding: "utf8" });
        this.currentTextFile = file;

        const child = process.platform === "darwin"
            ? this.spawnMac(file, opts)
            : this.spawnWindows(file, opts);

        this.current = child;
        const cleanup = () => this.cleanupFile(file);
        child.on("exit", cleanup);
        child.on("error", cleanup);
    }

    /** Stop any current utterance. */
    stop(): void {
        if (this.current) {
            try { this.current.kill(); } catch { /* already gone */ }
            this.current = undefined;
        }
        if (this.currentTextFile) {
            this.cleanupFile(this.currentTextFile);
            this.currentTextFile = undefined;
        }
    }

    private spawnMac(file: string, opts: SpeechOptions): ChildProcess {
        const args: string[] = ["-f", file];
        if (opts.voice) { args.push("-v", opts.voice); }
        if (opts.rate) { args.push("-r", String(175 + opts.rate)); }
        return spawn("say", args, { stdio: "ignore" });
    }

    private spawnWindows(file: string, opts: SpeechOptions): ChildProcess {
        // Voice name is sanitised to a safe character set before interpolation.
        const safeVoice = (opts.voice || "").replace(/[^\w .\-]/g, "");
        const rate = Math.max(-10, Math.min(10, Math.round(opts.rate)));
        const script =
            "Add-Type -AssemblyName System.Speech;" +
            "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;" +
            (safeVoice ? `try { $s.SelectVoice('${safeVoice}') } catch {};` : "") +
            `$s.Rate = ${rate};` +
            `$t = [System.IO.File]::ReadAllText('${file.replace(/'/g, "''")}', [System.Text.Encoding]::UTF8);` +
            "$s.Speak($t); $s.Dispose();";
        return spawn(
            "powershell",
            ["-NoProfile", "-NonInteractive", "-Command", script],
            { stdio: "ignore", windowsHide: true }
        );
    }

    private cleanupFile(file: string): void {
        fs.promises.unlink(file).catch(() => { /* best-effort */ });
    }
}
