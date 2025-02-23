const { createClient } = require('redis');

const client = createClient({
    //Client options
    socket: {
        reconnectStrategy: function(retries) {
            if(retries > 10) {
                console.log("Too many attempts to reconnect. Redis connection terminated.");
                return new Error("Too many retries.");
            }
            else {
                return retries * 500; //Reconnect after 500ms, then 1000ms, then 1500ms, etc.
            }
        }
    }
});

client.on('error', error => console.log('Redis client error: ', error));

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

client.on('warning', (warning) => {
    console.warn('Redis warning:', warning);
});

module.exports = client;