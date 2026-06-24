// Unit tests for the fragile core: the chatSessions parser + speech cleaner.
// Run with `npm test` (node --test). Loads the COMPILED out/*.js, so run
// `npm run compile` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { parseLatestTurn, extractProse, isComplete } = require("../out/sessionParser.js");
const { cleanForSpeech } = require("../out/clean.js");

const OPTS = { skipCodeBlocks: true, readThinking: false, maxChars: 0 };

// A realistic session: prose parts have NO `kind`; thinking/tool parts do.
function session() {
    return {
        requests: [{
            requestId: "request_abc",
            message: { parts: [{ text: "hi" }] },
            response: [
                { kind: "thinking", value: "internal reasoning, do not read" },
                { value: "First paragraph of the answer.", supportThemeIcons: true },
                { kind: "toolInvocationSerialized", invocationMessage: "Using Run in Terminal" },
                { value: "Second paragraph here.", supportThemeIcons: true },
            ],
            result: { timings: { totalElapsed: 1234 } },
        }],
    };
}

test("extractProse takes only kindless MarkdownString parts", () => {
    const text = extractProse(session().requests[0], OPTS);
    assert.match(text, /First paragraph/);
    assert.match(text, /Second paragraph/);
    assert.doesNotMatch(text, /internal reasoning/, "thinking must be excluded");
    assert.doesNotMatch(text, /Run in Terminal/, "tool calls must be excluded");
});

test("readThinking=true includes thinking", () => {
    const text = extractProse(session().requests[0], { ...OPTS, readThinking: true });
    assert.match(text, /internal reasoning/);
});

test("isComplete requires result.timings", () => {
    assert.equal(isComplete(session().requests[0]), true);
    assert.equal(isComplete({ response: [], result: {} }), false);
    assert.equal(isComplete({ response: [] }), false);
});

test("parseLatestTurn returns the last request's id + completeness", () => {
    const turn = parseLatestTurn(session(), OPTS);
    assert.equal(turn.requestId, "request_abc");
    assert.equal(turn.complete, true);
    assert.ok(turn.text.length > 0);
});

test("parseLatestTurn handles empty/garbage sessions", () => {
    assert.equal(parseLatestTurn({}, OPTS), null);
    assert.equal(parseLatestTurn({ requests: [] }, OPTS), null);
    assert.equal(parseLatestTurn({ requests: [{ response: [] }] }, OPTS), null);
});

test("cleanForSpeech drops code blocks and tidies joined punctuation", () => {
    const out = cleanForSpeech("Do this:\n\n```js\nconst x=1;\n```\n\nThen done.", OPTS);
    assert.doesNotMatch(out, /const x/, "code body must be gone");
    assert.doesNotMatch(out, /\.\s*\./, "no doubled '. .' from chunk joins");
});

test("cleanForSpeech respects maxChars", () => {
    const out = cleanForSpeech("word ".repeat(100), { ...OPTS, maxChars: 20 });
    assert.ok(out.length <= 23, `expected <=23, got ${out.length}`);
});
