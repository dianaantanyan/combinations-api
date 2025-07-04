const express = require('express');
const { createDatabasePool } = require('./src/config/database');
const { setupDatabase } = require('./src/services/combinationsService');
const combinationsRoutes = require('./src/routes/combinations');
const { errorHandler } = require('./src/utils/errorHandler');

class CombinationsServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.dbPool = null;
    }

    async initialize() {
        try {
            this.dbPool = await createDatabasePool();
            await setupDatabase(this.dbPool);
            this.setupMiddleware();
            this.setupRoutes();
            this.setupErrorHandling();
            console.log('Server initialized successfully');
        } catch (error) {
            console.error('Server initialization failed:', error);
            process.exit(1);
        }
    }

    setupMiddleware() {
        this.app.use(express.json({ limit: '10mb' }));
        
        this.app.set('json spaces', 2);

        this.app.use((req, res, next) => {
            req.dbPool = this.dbPool;
            next();
        });
    }

    setupRoutes() {
        this.app.use('/api', combinationsRoutes);
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.originalUrl
            });
        });
    }

    setupErrorHandling() {
        this.app.use(errorHandler);
    }

    async start() {
        await this.initialize();
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}

const server = new CombinationsServer();
server.start();