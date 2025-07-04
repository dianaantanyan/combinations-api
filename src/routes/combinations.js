const express = require('express');
const router = express.Router();
const combinationsController = require('../controllers/combinationsController');

router.post('/generate', combinationsController.generateCombinations);

module.exports = router;