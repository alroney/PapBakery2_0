const express = require('express');
const authenticateUser = require('../middlewares/authMiddleware');
const router = express.Router();
const { rateLimiter } = require('../utils/helpers');
const { create_order, complete_order, confirm_cash_order} = require('../controllers/orderController');


router.post('/confirmCash', confirm_cash_order)
router.post('/create', rateLimiter, authenticateUser, create_order);
router.post('/complete', complete_order);

module.exports = router;