import { apiUrl } from '@config';


export const getOptimalBag = async (treatDimensionKey, amount) => {
    try {
        const response = await fetch(`${apiUrl}/seatable/optimalPackaging`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                treatDimensionKey,
                amount,
            }),
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        if(!data.success) {
            console.error("Error getting optimal bag: ", data.message);
            return null;
        }

        console.log("Optimal bag data: ", data);

        return data.bagCombination;
    } 
    catch(error) {
        console.error("Error in getOptimalBag: ", error);
        return null;
    }
}