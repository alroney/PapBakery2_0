const Token = require('../models/stTokenSchema'); //Import the SeaTable token model.
const axios = require('axios'); //Axios is a promise-based HTTP client for the browser and Node.js.


//Function: Fetch and store the base token for the SeaTable API.
const fetchAndStoreNewBaseToken = async (req, res) => {
    const url = 'https://cloud.seatable.io/api/v2.1/dtable/app-access-token/';
    const apiKey = process.env.SEATABLE_API_TOKEN;
    console.log("API Key: ", apiKey);
    const options = {
        method: 'GET',
        url: url,
        headers: {
            accept: 'application/json',
            authorization: `Bearer ${apiKey}`,
        }
    }

    try {
        const response = await axios(options);
        const { access_token, dtable_uuid } = response.data;
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); //3 days.

        //Upsert token (update if exists, insert if not).
        await Token.findOneAndUpdate(
            { key: "base_token" },
            { value: access_token, uuid: dtable_uuid, expiresAt: expiresAt },
            { upsert: true, new: true }
        );

        console.log("Base token stored successfully.");
    }
    catch(error) {
        console.error("Error fetching data: ", error);
        res.status(500).json({ error: error.message });
    }
}


const getBaseToken = async (req, res) => {
    try {
        const token = await Token.findOne({ key: "base_token" });

        if(token && new Date() < token.expiresAt) {
            console.log("Using stored base token for SeaTable.");
            res.status(200).json({ success: true,  message: "Base Token (base_token) Fetched Successfully." });
            return token.value;
        }

        else {
            if(!token) {
                console.log("No base token found. Fetching a new one.");
            }
    
            else if(new Date() > token.expiresAt) {
                console.log("Base token expired. Fetching a new one.");
            }
            
            await fetchAndStoreNewBaseToken();
            const newToken = await Token.findOne({ key: "base_token" });
            console.log("New token fetched.");
            res.status(200).json({ success: true, message: "Base Token (base_token) Created and Fetched Successfully." });
            return newToken.value;
        }

        
    }
    catch(error) {
        console.error("Error fetching token: ", error);
        res.status(500).json({ error: error.message });
    }

    
}


module.exports = { getBaseToken };