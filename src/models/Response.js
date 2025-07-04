class Response {
    constructor(pool) {
        this.pool = pool;
    }

    async createResponse(requestData, responseData, processingTime, ipAddress) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.execute(
                `INSERT INTO responses (request_data, response_data, processing_time_ms, ip_address) 
                 VALUES (?, ?, ?, ?)`,
                [
                    JSON.stringify(requestData),
                    JSON.stringify(responseData),
                    processingTime,
                    ipAddress
                ]
            );
            
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Response;
