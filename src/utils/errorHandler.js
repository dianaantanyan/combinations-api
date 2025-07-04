const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);
    
    if (error.code?.startsWith('ER_')) {
        return res.status(500).json({
            error: 'Database operation failed',
            message: 'Internal server error'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong'
    });
};

module.exports = { errorHandler };