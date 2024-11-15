const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, clearCart } = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure this middleware authenticates users

// Route to get the current cart for a user
router.get('/', authMiddleware, getCart);

// Route to add an item to the cart or update quantity
router.post('/add', authMiddleware, addToCart);

// Route to update the quantity of a specific item in the cart
router.put('/update', authMiddleware, updateCartItem);

// Route to clear all items from the cart
router.delete('/clear', authMiddleware, clearCart);

module.exports = router;
