import API_URL from "./api";

export async function getMyScores(
    token:string
){
    const response = await fetch(
        `${API_URL}/scores/me`,
        {
            headers:{
                Authorization:`Bearer ${token}`
            },
        }
    );
    return response.json();
}

export async function createScore(
    token:string,
    score:any
){
    const response = await fetch(
        `${API_URL}/scores`,
        {
            method :"POST",
            headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`,
            },
            body:JSON.stringify(score)
        }
    );

    return response.json();

}