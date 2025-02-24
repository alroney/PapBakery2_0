const { createClient } = require('redis');

const client = createClient({
    //Client options
    // username: process.env.REDIS_USERNAME, //ACL username
    // password: process.env.REDIS_PASSWORD, //ACL password
    socket: {
        reconnectStrategy: function(retries) {
            return false; //Do not reconnect.
            if(retries > 2) {
                console.log("Too many attempts to reconnect. Redis connection terminated.");
                return new Error("Too many retries.");
            }
            else {
                return retries * 500; //Reconnect after 500ms, then 1000ms, then 1500ms, etc.
            }
        },
        connectionTimeout: 10000, //10 seconds
    }
});

client.disconnect = true;

// client.on('error', error => console.log('Redis client error: ', error));

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('ready', () => {
    client.disconnect = false;
    console.log('Redis client ready.');
});

client.on('reconnecting', () => {
    console.log('Redis client is reconnecting');
});

client.on('end', () => {
    client.disconnect = true;
    console.log('Redis client connection ENDED.');
})



module.exports = client;