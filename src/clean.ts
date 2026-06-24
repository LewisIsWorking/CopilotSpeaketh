// Turns Copilot's markdown prose into something pleasant to hear: skips tables
// and code, drops link/image/heading/emphasis syntax, fixes pronunciation of
// common symbols/abbreviations, and collapses whitespace into natural sentences.

export interface CleanOptions {
    skipCodeBlocks: boolean;
    maxChars: number;
}

// Symbol / abbreviation -> spoken form. Extend freely; order matters (applied
// top-to-bottom). \b = word boundary, the `i` flag = case-insensitive.
const PRONUNCIATIONS: Array<[RegExp, string]> = [
    [/~(?=\s*\d)/g, "about "],          // "~10 min" -> "about 10 min"
    [/\bPF2e\b/gi, "Pathfinder"],
    [/\bSF2e\b/gi, "Starfinder"],
    [/\bTTRPG\b/gi, "tabletop RPG"],
    [/\bAoN\b/g, "Archives of Nethys"],
    [/\be\.g\.,?/gi, "for example,"],
    [/\bi\.e\.,?/gi, "that is,"],
    [/\bvs\b\.?/gi, "versus"],
];

export function cleanForSpeech(markdown: string, opts: CleanOptions): string {
    let t = markdown ?? "";

    // Drop box-drawing tables entirely (every row/border line has a U+2500..U+257F
    // char). Done line-wise, before newlines are collapsed below -- we never want
    // a table grid read aloud as a jumble of cell text.
    const boxChar = new RegExp("[" + String.fromCharCode(0x2500) + "-" + String.fromCharCode(0x257f) + "]");
    t = t.split("\n").filter(line => !boxChar.test(line)).join("\n");

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
    // Emphasis / bold / strikethrough markers.
    t = t.replace(/(\*\*|__|\*|_|~~)/g, "");

    // Pronunciation fixes, applied to the now-plain prose.
    for (const [re, to] of PRONUNCIATIONS) { t = t.replace(re, to); }

    // Whitespace + sentence handling. A BLANK line is a paragraph break -> a
    // sentence stop; a SINGLE newline is a soft wrap within a sentence -> a space.
    // (Turning every newline into ". " breaks mid-sentence wraps into false stops
    // like "so. stays at 0".)
    t = t.replace(/[ \t]+/g, " ");
    t = t.replace(/\s*\n\s*\n+\s*/g, ". ");   // paragraph break -> stop
    t = t.replace(/\s*\n\s*/g, " ");          // soft wrap -> space
    t = t.replace(/\s+([.,:;!?])/g, "$1");             // no space before punctuation
    t = t.replace(/([.,:;!?])(?:\s*[.,:;!?])+/g, "$1"); // collapse repeated punctuation
    t = t.replace(/\s{2,}/g, " ");
    t = t.trim();

    if (opts.maxChars > 0 && t.length > opts.maxChars) {
        t = t.slice(0, opts.maxChars).replace(/\s+\S*$/, "") + "...";
    }
    return t;
}
