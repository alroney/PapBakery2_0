const Token = require("../models/tokenSchema");
const redisClient = require('../redisClient');

//Function: Fetch Stored Token from Mongo or Cache.
const fetchStoredToken = async (source, keyName) => {
    try {
        console.log("redisClient disconnect status: ", redisClient.disconnect);
        await redisClient.connect();
        console.log("status after connect: ", redisClient.disconnect);
        const cacheKey = `${source}:${keyName}`; //Key name for finding the token in the Redis cache.

        if(!redisClient.disconnect) {
            const cachedToken = await redisClient.get(cacheKey);

            if(cachedToken) {
                console.log("Token fetched from cache:", source, keyName);
                
                await redisClient.quit();
                return JSON.parse(cachedToken);
            }
        }


        const token = await Token.findOne({ source: source, keyName: keyName });
        let keyValue = null;
        let needsRefresh = true;
        let message = "";

        if(token) {
            if(token.expiresAt === null || token.expiresAt === undefined) {
                message = `${source} ${keyName} found.`;
                keyValue = token.keyValue;
                needsRefresh = false; //No need to refresh the token if it's valid.
            } 
            else {
                const currentTime = new Date();

                if (currentTime > token.expiresAt) { //If the token is expired.
                    message = `${source} ${keyName} found but expired.`;
                } else {
                    message = `${source} ${keyName} with expiration found and not expired.`;
                    keyValue = token.keyValue;
                    needsRefresh = false; //No need to refresh the token if it's valid.
                }
            }

            // Cache the token
            if(!redisClient.disconnect){
                console.log("Caching token:", source, keyName, " to Redis.");
                await redisClient.set(cacheKey, JSON.stringify({ keyValue, needsRefresh, message }), 'EX', 3600); // Cache for 1 hour
            }
        } 
        else {
            message = `(tokenController)(fetchStoredToken) ${source} ${keyName} not found.`;
        }

        return { keyValue, needsRefresh, message };
    } 
    catch(error) {
        console.error("(tokenController)(fetchStoredToken) Error fetching token: ", error);
    }
};



//Function: Store New Token in Mongo and Cache.
const storeNewToken = async (keyPairs, source) => {
    try {
        console.log("Keypair length: ", keyPairs.length);

        if (Array.isArray(keyPairs) && keyPairs.length > 0) {
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
                console.log("New tokens stored successfully in mongoDB");

                if(redisClient.disconnect) {
                    console.log("(storeNewToken) Connecting to Redis...");
                    await redisClient.connect();
                }
                // Cache the new tokens
                if(!redisClient.disconnect) {
                    keyPairs.forEach(async pair => {
                        const cacheKey = `${source}:${pair.keyName}`;
                        await redisClient.set(cacheKey, JSON.stringify({ keyValue: pair.keyValue, needsRefresh: false, message: `${source} ${pair.keyName} stored.` }), 'EX', 3600); // Cache for 1 hour
                    });
                    console.log("New tokens stored successfully in Redis");
                }
            } 
            catch (error) {
                console.error("(tokenController)(storeNewToken) Error storing token using bulkWrite: ", error);
            }
        } 
        else {
            console.log("No keyPairs found.");
        }
    } catch (error) {
        console.error("(tokenController)(storeNewToken) Error storing token: ", error);
    }
};

module.exports = { fetchStoredToken, storeNewToken }; // Export the functions.