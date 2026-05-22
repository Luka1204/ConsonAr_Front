type Props = {
    scores: any[];
}

export default function ScoreList({
    scores,
}: Props){
    return (
        <div>
            <h2>Mis partituras</h2>
                {scores.map((score) => (
                    <div 
                        key={score.id}
                        style={{border:"1px solid gray",marginBottom:"10px",padding:"10px"}}
                    >
                        <h3>{score.title}</h3>

                        <pre>
                            {JSON.stringify(
                                score.notes,
                                null,
                                2
                            )}
                        </pre>
                    </div>
                ))}
        </div>
    );
}