const mysql = require('mysql2/promise');

const createDatabasePool = async () => {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'combinations_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    };

    try {
        const tempPool = mysql.createPool({
            host: config.host,
            user: config.user,
            password: config.password,
            charset: config.charset
        });

        await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${config.database} 
                               CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await tempPool.end();

        const pool = mysql.createPool(config);
        
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        
        console.log('Database connection established');
        return pool;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
};

module.exports = { createDatabasePool };
