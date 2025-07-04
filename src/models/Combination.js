const crypto = require('crypto');

class Combination {
    constructor(pool) {
        this.pool = pool;
    }

    async createCombinations(responseId, combinations) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            for (const combination of combinations) {
                const combinationHash = this.generateHash(combination);
                
                await connection.execute(
                    'INSERT INTO combinations (response_id, combination_data, combination_hash) VALUES (?, ?, ?)',
                    [responseId, JSON.stringify(combination), combinationHash]
                );
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    generateHash(combination) {
        const sortedCombination = [...combination].sort();
        return crypto.createHash('sha256')
            .update(JSON.stringify(sortedCombination))
            .digest('hex');
    }
}

module.exports = Combination;
