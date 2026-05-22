const API_URL = "http://localhost:3000";
export default API_URL;
/* export async function saveScore(score){
    const res = await fetch(`${API_URL}/scores`,{
        method: "POST",
        headers: {
            "Content-Type":"application/json",
        },
        body:JSON.stringify(score),
    });
    return res.json();
}

export async function getScores(){
    const res = await fetch(`${API_URL}/scores`);
    return res.json();
} */
