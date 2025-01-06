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


const getBaseToken = async () => {
    try {
        const token = await Token.findOne({ key: "base_token" });

        if(token && new Date() < token.expiresAt) {
            console.log("Using stored base token for SeaTable.");
            return token.value;
        }

        else {
            console.log("Token not found or expired. Fetching new token...");
            await fetchAndStoreNewBaseToken();
            const newToken = await Token.findOne({ key: "base_token" });
            console.log("New token fetched.");
            return newToken.value;
        }

        
    }
    catch(error) {
        console.error("(seatableController)(getBaseToken) Error fetching token: ", error);
    }
}

const getBaseInfo = async () => {
    try {
        
    }
    catch(error) {
        console.error("(seatableController)(getBaseInfo) Error fetching token: ", error);
    }
}


module.exports = { getBaseToken };