require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI;
    console.log('URI loaded:', uri ? 'Yes (starting with ' + uri.substring(0, 15) + '...)' : 'No');
    
    if (!uri) {
        console.error('MONGODB_URI is not defined in .env');
        return;
    }

    // Try to parse the password. If it contains @ and is not encoded, mongo client might throw here or give bad auth
    try {
        const client = new MongoClient(uri);
        console.log('Attempting to connect...');
        await client.connect();
        console.log('Connected successfully!');
        await client.close();
    } catch (e) {
        console.error('Connection error type:', e.name);
        console.error('Connection error message:', e.message);
        if (e.message.includes('auth')) {
            console.log('\nPossible causes:');
            console.log('1. Incorrect password/username.');
            console.log('2. Password contains special characters like "@" which MUST be URL-encoded (e.g., @ becomes %40).');
            console.log('3. The MongoDB user was not created in the "Database Access" section of MongoDB Atlas.');
        }
    }
}

main();
