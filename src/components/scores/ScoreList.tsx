type Props = {
    scores: Record<string, unknown>[];
}

export default function ScoreList({ scores }: Props) {
    if (!scores || scores.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No hay partituras guardadas aún
            </div>
        );
    }

    return (
        <div>
            {scores.map((score, idx) => (
                <div key={(score.id as string) || idx} className="score-item animate-slide-in">
                    <div className="score-title">{score.title as string}</div>
                    <div className="score-notes">
                        {JSON.stringify(score.notes, null, 2)}
                    </div>
                </div>
            ))}
        </div>
    );
}