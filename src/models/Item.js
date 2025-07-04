class Item {
    constructor(pool) {
        this.pool = pool;
    }

    async createItems(items) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            await connection.execute('DELETE FROM items');
            
            for (const item of items) {
                await connection.execute(
                    'INSERT INTO items (item_name, prefix_letter) VALUES (?, ?)',
                    [item.name, item.prefix]
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
}

module.exports = Item;