const express = require('express');
const authenticateUser = require('../middlewares/authMiddleware');
const router = express.Router();
const { rateLimiter } = require('../utils/helpers');
const { create_order, complete_order, getFees } = require('../controllers/orderController');


router.get('/fees', getFees)
router.post('/create', rateLimiter, authenticateUser, create_order);
router.post('/complete', complete_order);

module.exports = router;