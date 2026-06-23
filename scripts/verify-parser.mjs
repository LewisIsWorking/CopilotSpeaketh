// Offline verification: run the COMPILED parser + cleaner over the real Copilot
// chatSessions on this machine and print what would be spoken. No VS Code needed.
//   node scripts/verify-parser.mjs
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { parseLatestTurn, extractProse } = require("../out/sessionParser.js");
const { cleanForSpeech } = require("../out/clean.js");

function storageRoot() {
    if (process.platform === "win32") {
        return path.join(process.env.APPDATA ?? "", "Code", "User", "workspaceStorage");
    }
    if (process.platform === "darwin") {
        return path.join(os.homedir(), "Library", "Application Support", "Code", "User", "workspaceStorage");
    }
    return path.join(os.homedir(), ".config", "Code", "User", "workspaceStorage");
}

function allSessionFiles(root) {
    const out = [];
    if (!fs.existsSync(root)) { return out; }
    for (const hash of fs.readdirSync(root)) {
        const dir = path.join(root, hash, "chatSessions");
        if (!fs.existsSync(dir)) { continue; }
        for (const f of fs.readdirSync(dir)) {
            if (f.endsWith(".json")) {
                const full = path.join(dir, f);
                out.push({ full, mtime: fs.statSync(full).mtimeMs });
            }
        }
    }
    return out.sort((a, b) => b.mtime - a.mtime);
}

const opts = { skipCodeBlocks: true, readThinking: false, maxChars: 0 };
const root = storageRoot();
console.log("storage root:", root);
const files = allSessionFiles(root);
console.log("session files found:", files.length);

let spoken = 0;
for (const { full } of files.slice(0, 8)) {
    let session;
    try { session = JSON.parse(fs.readFileSync(full, "utf8")); }
    catch { console.log("  [skip unparseable]", path.basename(full)); continue; }

    const turn = parseLatestTurn(session, opts);
    if (!turn) { console.log("  [no turn]", path.basename(full)); continue; }

    const rawLen = extractProse(session.requests[session.requests.length - 1], opts).length;
    const speech = cleanForSpeech(turn.text, opts);
    console.log(`\n# ${path.basename(full)}`);
    console.log(`  requestId=${turn.requestId.slice(0, 8)} complete=${turn.complete} prose=${rawLen} speech=${speech.length}`);
    if (speech) {
        console.log("  >>", speech.slice(0, 300).replace(/\s+/g, " "));
        if (turn.complete) { spoken++; }
    }
}
console.log(`\nWould auto-speak ${spoken} of the ${Math.min(8, files.length)} most-recent sessions.`);
