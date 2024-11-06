const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { getCart, addToCart, removeFromCart } = require('../controllers/cartController');


router.get('/api/getCart', authenticateUser, getCart);

router.post('/api/addToCart', authenticateUser, addToCart);
router.post('/api/removeFromCart', authenticateUser, removeFromCart);

module.exports = router;