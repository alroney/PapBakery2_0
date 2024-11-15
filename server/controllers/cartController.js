const Cart = require('../models/cartSchema');
const Product = require('../models/productSchema');  // Assuming you need to fetch product details
const mongoose = require('mongoose');

// Get Cart - Retrieve the cart for the logged-in user
const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
        if(!cart) return res.status(404).json({ message: "Cart not found" });

        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add to Cart - Add an item or update its quantity in the cart
const addToCart = async (req, res) => {
    const { itemId, quantity } = req.body;

    try {
        let cart = await Cart.findOne({ userId: req.user.id });
        const product = await Product.findById(itemId);

        if(!product) return res.status(404).json({ message: "Product not found" });

        if(cart) {
            // Check if item is already in cart
            const itemIndex = cart.items.findIndex(item => item.productId.equals(itemId));

            if(itemIndex > -1) {
                // Item exists in cart, update quantity
                cart.items[itemIndex].quantity += quantity;
            } 
            else {
                // Item does not exist, add to cart
                cart.items.push({
                    productId: itemId,
                    name: product.name,
                    price: product.price,
                    quantity,
                });
            }
        } 
        else {
            // No cart for user, create a new cart
            cart = new Cart({
                userId: req.user.id,
                items: [{
                    productId: itemId,
                    name: product.name,
                    price: product.price,
                    quantity,
                }]
            });
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Cart Item - Modify the quantity of an item in the cart
const updateCartItem = async (req, res) => {
    const { itemId, quantity } = req.body;

    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if(!cart) return res.status(404).json({ message: "Cart not found" });

        const itemIndex = cart.items.findIndex(item => item.productId.equals(itemId));
        if(itemIndex > -1) {
            if(quantity > 0) {
                cart.items[itemIndex].quantity= quantity; //Update quantity.
            }
            else {
                cart.items.splice(itemIndex, 1); //Remove item with quantity of 0.
            }
        }

        if(itemIndex === -1) return res.status(404).json({ message: "Item not found in cart" });

        // Update item quantity
        cart.items[itemIndex].quantity = quantity;

        await cart.save();
        res.json(cart);
    } 
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Clear Cart - Remove all items from the cart.
const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if(!cart) return res.status(404).json({ message: "Cart not found" });

        cart.items = [];
        await cart.save();
        res.json({ message: "Cart cleared" });
    } 
    catch(error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    clearCart,
};
