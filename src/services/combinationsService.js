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

    generateItems(inputArray) {
        const items = [];
        let prefixCharCode = 65; 

        for (const count of inputArray) {
            const prefix = String.fromCharCode(prefixCharCode++);
            for (let i = 1; i <= count; i++) {
                items.push({ name: `${prefix}${i}`, prefix });
            }
        }

        return items;
    }

    /**
     * Generate all valid combinations of specified length.
     */
    generateCombinations(items, length) {
        if (length <= 0) return [];

        const prefixMap = new Map();
        for (const item of items) {
            if (!prefixMap.has(item.prefix)) {
                prefixMap.set(item.prefix, []);
            }
            prefixMap.get(item.prefix).push(item.name);
        }

        const grouped = Array.from(prefixMap.values());
        if (grouped.length < length) return [];

        const result = [];

        const kCombinations = (arr, k) => {
            const res = [];
            const combine = (start, path) => {
                if (path.length === k) {
                    res.push([...path]);
                    return;
                }

                for (let i = start; i < arr.length; i++) {
                    path.push(arr[i]);
                    combine(i + 1, path);
                    path.pop();
                }
            };
            combine(0, []);
            return res;
        };

        const cartesian = (arrays) => {
            return arrays.reduce((acc, curr) => {
                const temp = [];
                for (const a of acc) {
                    for (const b of curr) {
                        temp.push([...a, b]);
                    }
                }
                return temp;
            }, [[]]);
        };

        const prefixCombos = kCombinations(grouped, length);
        for (const groupSet of prefixCombos) {
            result.push(...cartesian(groupSet));
        }

        return result;
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
