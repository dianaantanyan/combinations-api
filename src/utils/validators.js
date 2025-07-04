const validateRequest = (body) => {
    const errors = [];
    
    if (!body) {
        errors.push('Request body is required');
        return { isValid: false, errors };
    }
    
    if (!Array.isArray(body.items)) {
        errors.push('Items must be an array');
    } else if (body.items.length === 0) {
        errors.push('Items array cannot be empty');
    } else if (body.items.length > 26) {
        errors.push('Items array cannot exceed 26 elements');
    } else if (!body.items.every(item => Number.isInteger(item) && item > 0)) {
        errors.push('All items must be positive integers');
    }
    
    if (!Number.isInteger(body.length) || body.length <= 0) {
        errors.push('Length must be a positive integer');
    } else if (body.length > body.items?.length) {
        errors.push('Length cannot exceed the number of item types');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = { validateRequest };