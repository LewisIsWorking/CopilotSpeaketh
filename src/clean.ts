// Turns Copilot's markdown prose into something pleasant to hear: drops code,
// link/image syntax, headings markers, emphasis, and collapses whitespace.

export interface CleanOptions {
    skipCodeBlocks: boolean;
    maxChars: number;
}

export function cleanForSpeech(markdown: string, opts: CleanOptions): string {
    let t = markdown ?? "";

    if (opts.skipCodeBlocks) {
        // Fenced code blocks -> a short spoken placeholder.
        t = t.replace(/```[\s\S]*?```/g, " (code block) ");
    } else {
        t = t.replace(/```(\w+)?\n?/g, " ");
    }

    // Inline code -> its contents without the backticks.
    t = t.replace(/`([^`]+)`/g, "$1");
    // Images ![alt](url) -> alt
    t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
    // Links [text](url) -> text
    t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
    // Heading hashes, blockquote markers, list bullets at line starts.
    t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    t = t.replace(/^\s{0,3}>\s?/gm, "");
    t = t.replace(/^\s*[-*+]\s+/gm, "");
    // Emphasis / bold markers.
    t = t.replace(/(\*\*|__|\*|_|~~)/g, "");
    // Newlines become sentence breaks, then tidy punctuation: stripping tool
    // calls and joining the surviving prose chunks otherwise leaves stray
    // ". ." / " : ." that a voice would read as "dot" pauses.
    t = t.replace(/[ \t]+/g, " ");
    t = t.replace(/\s*\n+\s*/g, ". ");
    t = t.replace(/\s+([.,:;!?])/g, "$1");             // no space before punctuation
    t = t.replace(/([.,:;!?])(?:\s*[.,:;!?])+/g, "$1"); // collapse repeated punctuation
    t = t.replace(/\s{2,}/g, " ");
    t = t.trim();

    if (opts.maxChars > 0 && t.length > opts.maxChars) {
        t = t.slice(0, opts.maxChars).replace(/\s+\S*$/, "") + "...";
    }
    return t;
}
