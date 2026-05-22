import {
    useContext,
    useEffect,
    useState,
} from "react";

import { AuthContext  } 
from "../context/AuthContext";

import {
    getMyScores,
    createScore
} from "../services/score.service";

import ScoreList from "../components/scores/ScoreList";
import Tuner from "../components/audio/Tuner";

export default function DashboardPage(){
    const { token } = useContext(AuthContext);
    const [scores, setScores]=useState<any[]>([]);

    useEffect(()=>{
        loadScores();
    },[token]);

    const loadScores = async()=>{
        if (!token) return;
        const data = await getMyScores(token);

        setScores(data);
    };

    const handleCreate = async()=>{
        if (!token) return;
        const newScore = {
            title:"Improvisación demo",
            notes:[
                {
                    note:"A4",
                    time:0
                },
                {
                    note:"C5",
                    time:500,
                },
            ]
        };

        await createScore(
            token, 
            newScore
        );
        loadScores();
    };

    return (
        <div>
            <h1>Dashboard</h1>
            <button onClick={handleCreate}>Crear nueva partitura</button>
            <ScoreList scores={scores} />
            <Tuner />
        </div>
    )
}


