// Parses a VS Code Copilot Chat session file (chatSessions/<id>.json).
//
// Schema (reverse-engineered; undocumented and subject to change across VS Code
// versions, so everything here is defensive):
//   { requests: [ {
//       requestId,
//       message: { parts: [{ text }] },     // the user's prompt
//       response: [ <typed part>, ... ],    // the assistant turn
//       result: { timings: { totalElapsed } } // present only once the turn is COMPLETE
//   } ] }
//
// A response part is the assistant's spoken PROSE when it has NO `kind` field and
// carries a string `value` (a serialized MarkdownString). Parts with a `kind`
// ("thinking", "toolInvocationSerialized", "prepareToolInvocation", ...) are
// reasoning/tool/infra noise and are skipped.

export interface ParseOptions {
    skipCodeBlocks: boolean;
    readThinking: boolean;
    maxChars: number;
}

export interface ParsedTurn {
    requestId: string;
    /** Cleaned text ready to speak (may be empty). */
    text: string;
    /** True once the turn has finished generating (safe to read aloud). */
    complete: boolean;
}

function isProsePart(part: any): boolean {
    return part && part.kind === undefined && typeof part.value === "string";
}

function isThinkingPart(part: any): boolean {
    return part && part.kind === "thinking" && typeof part.value === "string";
}

/** Join the assistant's spoken prose (and optionally thinking) from a request. */
export function extractProse(request: any, opts: ParseOptions): string {
    const response = Array.isArray(request?.response) ? request.response : [];
    const chunks: string[] = [];
    for (const part of response) {
        if (isProsePart(part)) {
            chunks.push(part.value);
        } else if (opts.readThinking && isThinkingPart(part)) {
            chunks.push(part.value);
        }
    }
    return chunks.join("\n\n");
}

/** A turn is complete once VS Code has stamped its timing/result. */
export function isComplete(request: any): boolean {
    return !!(request && request.result && request.result.timings != null);
}

/**
 * Parse the most recent turn from a parsed session object. Returns null when
 * there is no usable turn (no requests, or no spoken prose).
 */
export function parseLatestTurn(session: any, opts: ParseOptions): ParsedTurn | null {
    const requests = Array.isArray(session?.requests) ? session.requests : [];
    if (requests.length === 0) {
        return null;
    }
    const last = requests[requests.length - 1];
    const requestId = typeof last?.requestId === "string" ? last.requestId : "";
    if (!requestId) {
        return null;
    }
    const raw = extractProse(last, opts);
    return {
        requestId,
        text: raw,
        complete: isComplete(last),
    };
}
