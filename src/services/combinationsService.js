const Item = require('../models/Item');
const Combination = require('../models/Combination');
const Response = require('../models/Response');

const setupDatabase = async (pool) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_name VARCHAR(50) NOT NULL UNIQUE,
                prefix_letter CHAR(1) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_prefix (prefix_letter)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS responses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_data JSON NOT NULL,
                response_data JSON NOT NULL,
                processing_time_ms DECIMAL(10,2) DEFAULT NULL,
                ip_address VARCHAR(45) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS combinations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                response_id INT NOT NULL,
                combination_data JSON NOT NULL,
                combination_hash VARCHAR(64) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await connection.commit();
        console.log('Database tables created successfully');
    } catch (error) {
        await connection.rollback();
        console.error('Database setup failed:', error);
        throw error;
    } finally {
        connection.release();
    }
};

class CombinationsService {
    constructor(pool) {
        this.itemModel = new Item(pool);
        this.combinationModel = new Combination(pool);
        this.responseModel = new Response(pool);
    }

    /**
     * Generates items from input array.
     */
    generateItems(inputArray) {
        const items = [];
        let letterIndex = 0;
        
        for (const count of inputArray) {
            const letter = String.fromCharCode(65 + letterIndex);
            
            for (let i = 1; i <= count; i++) {
                items.push({
                    name: `${letter}${i}`,
                    prefix: letter
                });
            }
            letterIndex++;
        }
        
        return items;
    }

    /**
     * Generate all valid combinations of specified length.
     */
    generateCombinations(items, length) {
        if (length <= 0 || length > items.length) {
            return [];
        }

        const combinations = [];
        
        const buildCombinations = (startIndex, currentCombination, usedPrefixes) => {
            if (currentCombination.length === length) {
                combinations.push([...currentCombination]);
                return;
            }
            
            for (let i = startIndex; i < items.length; i++) {
                const item = items[i];
                
                if (usedPrefixes.has(item.prefix)) {
                    continue;
                }
                
                currentCombination.push(item.name);
                usedPrefixes.add(item.prefix);
                
                buildCombinations(i + 1, currentCombination, usedPrefixes);
                
                currentCombination.pop();
                usedPrefixes.delete(item.prefix);
            }
        };
        
        buildCombinations(0, [], new Set());
        return combinations;
    }

    async processRequest(inputArray, length, ipAddress) {
        const startTime = process.hrtime();
        
        try {
            const items = this.generateItems(inputArray);
            
            await this.itemModel.createItems(items);
            
            const combinations = this.generateCombinations(items, length);
            
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const processingTime = seconds * 1000 + nanoseconds / 1000000;
            
            const responseData = {
                combination: combinations
            };
            
            const responseId = await this.responseModel.createResponse(
                { items: inputArray, length },
                responseData,
                processingTime,
                ipAddress
            );
            
            await this.combinationModel.createCombinations(responseId, combinations);
            
            return {
                id: responseId,
                ...responseData
            };
            
        } catch (error) {
            console.error('Error processing request:', error);
            throw error;
        }
    }
}

module.exports = { CombinationsService, setupDatabase };
