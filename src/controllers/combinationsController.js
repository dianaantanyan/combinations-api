const { CombinationsService } = require('../services/combinationsService');
const { validateRequest } = require('../utils/validators');

class CombinationsController {
    async generateCombinations(req, res, next) {
        try {
            const validationResult = validateRequest(req.body);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: validationResult.errors
                });
            }

            const { items, length } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;
            
            const service = new CombinationsService(req.dbPool);
            const result = await service.processRequest(items, length, ipAddress);
            
            res.json(result);
            
        } catch (error) {
            console.error('Controller error:', error);
            next(error);
        }
    }
}

module.exports = new CombinationsController();
