const mongoose = require('mongoose');

let connection = null;

let connectionPromise = null;

const connectDB = async () => {
    // Si une connexion est déjà en cours, attendre celle-ci
    if (connectionPromise) {
        return connectionPromise;
    }

    // Si déjà connecté, retourner la connexion
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
            
            // Log de l'URI (masquer le mot de passe pour la sécurité)
            const uriForLog = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
            console.log('🔌 [] Tentative de connexion à:', uriForLog);
            
            // Si une connexion existe mais n'est pas prête, la fermer d'abord
            if (connection && connection.readyState !== 0) {
                console.log('🔄 [] Fermeture de l\'ancienne connexion...');
                await connection.close();
            }
            
            connection = mongoose.createConnection(mongoUri, {
                serverSelectionTimeoutMS: 8000, // ⚡ 8s max pour éviter les timeouts Vercel
                socketTimeoutMS: 10000,
                connectTimeoutMS: 8000,
                maxPoolSize: 5,
                minPoolSize: 1,
                maxIdleTimeMS: 30000,
            });

            // Utiliser asPromise() qui est plus fiable que les événements
            console.log('🔄 [] Attente de la connexion...');
            await connection.asPromise();
            
            console.log('✅ [] Connexion à MongoDB  établie et prête !');
            console.log('✅ [] État de la connexion:', {
              0: 'disconnected',
              1: 'connected',
              2: 'connecting',
              3: 'disconnecting'
            }[connection.readyState] || 'unknown');
            connectionPromise = null; // Réinitialiser pour permettre de nouvelles tentatives
            return connection;
        } catch (error) {
            console.error('❌ Erreur de connexion à MongoDB  :', error.message);
            if (error.stack) {
                console.error('❌ Stack:', error.stack.substring(0, 500)); // Limiter la taille du log
            }
            connection = null;
            connectionPromise = null; // Réinitialiser pour permettre de nouvelles tentatives
            // Ne pas faire process.exit pour ne pas bloquer l'app principale
            return null;
        }
    })();

    return connectionPromise;
};

const getConnection = () => {
    return connection;
};

module.exports = { connectDB, getConnection };
