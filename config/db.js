const mongoose = require('mongoose');

let connection = null;

let connectionPromise = null;

const connectDB = async () => {
    // If a connection is already in progress, wait for it
    if (connectionPromise) {
        return connectionPromise;
    }
    // If already connected, return the connection
    if (connection && connection.readyState === 1) {
        return connection;
    }

    connectionPromise = (async () => {
        try {
            if (!process.env.MONGO_SECRET_KEY) {
                console.warn('⚠️ MONGO_SECRET_KEY non défini - connexion  ignorée');
                return null;
            }

            const mongoUri = process.env.MONGO_SECRET_KEY;
            const uriForLog = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');

            if (connection && connection.readyState !== 0) {
                await connection.close();
            }
            
            connection = mongoose.createConnection(mongoUri, {
                serverSelectionTimeoutMS: 8000, // ⚡ 8s max to avoid Vercel timeouts
                socketTimeoutMS: 10000,
                connectTimeoutMS: 8000,
                maxPoolSize: 5,
                minPoolSize: 1,
                maxIdleTimeMS: 30000,
            });
            await connection.asPromise();
            connectionPromise = null;
            return connection;
        } catch (error) {
            console.error('❌ Erreur de connexion à MongoDB  :', error.message);
            if (error.stack) {
                console.error('❌ Stack:', error.stack.substring(0, 500));
            }
            connection = null;
            connectionPromise = null;
            return null;
        }
    })();

    return connectionPromise;
};

const getConnection = () => {
    return connection;
};

module.exports = { connectDB, getConnection };
