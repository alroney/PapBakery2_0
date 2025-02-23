const redis = require('redis');
const { promisify } = require('util');

console.log('Starting testRedisConnection.js script...');

const client = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
    retry_strategy: (options) => {
        if (options.error) {
            console.error('Redis connection error:', options.error);
        }
        if (options.total_retry_time > 1000 * 60 * 5) {
            // End reconnecting after a specific timeout and flush all commands with an individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built-in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
});

console.log('Attempting to connect to Redis...');

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('ready', async () => {
    client.getAsync = promisify(client.get).bind(client);
    client.setAsync = promisify(client.set).bind(client);
    console.log('Redis client is ready');
    client.disconnect = false;
    // Test a simple set and get operation
    try {
        console.log('Setting test_key...');
        const setReply = await client.setAsync('test_key', 'test_value');
        console.log('Set key reply:', setReply);

        console.log('Getting test_key...');
        const getReply = await client.getAsync('test_key');
        console.log('Get key reply:', getReply);
    }
    catch(error) {
        console.error('Error setting test_key:', error);
    }
    finally {
        console.log('Closing Redis connection...');
        client.quit();
    }
});

client.on('reconnecting', () => {
    console.log('Redis client is reconnecting');
});

client.on('warning', (warning) => {
    console.warn('Redis warning:', warning);
});

// Add a timeout to forcefully quit if connection is not established
setTimeout(() => {
    if(client.disconnect) {
        console.error('Failed to connect to Redis within the timeout period');
        client.quit(); //Forcefully close the connection.
    }
}, 10000); // 10 seconds timeout

client.connect();