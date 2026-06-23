// Remembers which (session, requestId) turns have already been spoken, so the
// same reply is never read twice -- and, crucially, so a turn that is still
// streaming (re-written to disk repeatedly) is only spoken once it completes.

export class SpokenTracker {
    private readonly spoken = new Set<string>();

    private key(sessionId: string, requestId: string): string {
        return `${sessionId}::${requestId}`;
    }

    /** True the first time a given turn is seen; false on every repeat. */
    markIfNew(sessionId: string, requestId: string): boolean {
        const k = this.key(sessionId, requestId);
        if (this.spoken.has(k)) {
            return false;
        }
        this.spoken.add(k);
        return true;
    }

    /** Forget a turn so it can be spoken again on demand (e.g. "speak last"). */
    forget(sessionId: string, requestId: string): void {
        this.spoken.delete(this.key(sessionId, requestId));
    }
}
