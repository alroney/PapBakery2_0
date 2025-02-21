const Token = require("../models/tokenSchema");

//Function: Fetch Stored Token from Mongo.
const fetchStoredToken = async (source, keyName) => {
    try {
        // console.log("Fetching token: ", source, keyName);
        const token = await Token.findOne({ source: source, keyName: keyName });
        let keyValue = null;
        let needsRefresh = true;
        let message = "";

        if(token) {
            if(token.expiresAt === null || token.expiresAt === undefined) {
                message = `${source} ${keyName} found.`;
                keyValue = token.keyValue;
                needsRefresh = false; //No need to refresh the token if its valid.
            }
            else {
                const currentTime = new Date();

                if(currentTime > token.expiresAt) { //If the token is  expired (current time is greater than the expiration time of 2 days).
                    message = `${source} ${keyName} found but expired.`;
                }
                else {
                    message = `${source} ${keyName} with expiration found and not expired.`;
                    keyValue = token.keyValue;
                    needsRefresh = false; //No need to refresh the token if its valid.
                }
            }
        }
        else {
            message = `(tokenController)(fetchStoredToken) ${source} ${keyName} not found.`;
        }

        return { keyValue, needsRefresh, message };
    }
    catch(error) {
        console.error("(tokenController)(fetchToken) Error fetching token: ", error);
    }
}



const storeNewToken = async (keyPairs, source) => {
    try {
        console.log("Keypair length: ", keyPairs.length);

        if(Array.isArray(keyPairs) && keyPairs.length > 0) {
            const operations = keyPairs.map(pair => ({
                updateOne: {
                    filter: { source: source, keyName: pair.keyName },
                    update: {
                        $set: {
                            keyValue: pair.keyValue,
                            expiresAt: pair.expiresAt,
                        },
                    },
                    upsert: true,
                }
            }));

            try {
                await Token.bulkWrite(operations);
                console.log("New tokens stored successfully.");
            }
            catch(error) {
                console.error("(tokenController)(storeNewToken) Error storing token using bulkWrite: ", error);
            }
        }

        else {
            console.log("No keyPairs found.");
        }
    }
    catch(error) {
        console.error("(tokenController)(storeNewToken) Error storing token: ", error);
    }
    
}

module.exports = { fetchStoredToken, storeNewToken }; //Export the function.