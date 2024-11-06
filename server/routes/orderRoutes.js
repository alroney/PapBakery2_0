const express = require('express');
const authenticateUser = require('../middlewares/authMiddleware');
const router = express.Router();
const { rateLimiter } = require('../utils/helpers');
const { create_order, complete_order } = require('../controllers/orderController');



router.post('/api/create_order', rateLimiter, authenticateUser, create_order);
router.post('/api/complete_order', complete_order);

module.exports = router;