const Cart = require('../models/cartSchema');
const Product = require('../models/productSchema');  // Assuming you need to fetch product details
const mongoose = require('mongoose');
const { getStateTaxRates } = require('../utils/helpers');

// Get Cart - Retrieve the cart for the logged-in user
const getCart = async (req, res) => {
    try {
        let cart = [];
        if(req.user) {
            cart = await Cart.findOne({ userId: req.user.id });
        }
        
        if(!cart) return res.status(404).json({ message: "Cart not found" });

        res.json(cart);
    } catch (error) {
        console.log("Error in getCart: ", error);
        res.status(500).json({ error: error.message });
    }
};



// Add to Cart - Add an item or update its quantity in the cart
const addToCart = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;
        if(!mongoose.Types.ObjectId.isValid(itemId)) {
            console.log("Invalid product ID.");
            return res.status(400).json({message: 'Invalid product ID'});
        }

        let cart = await Cart.findOne({ userId: req.user.id }); //Set the userId to a string for reading. 
        const product = await Product.findById(itemId);

        if(!product) return res.status(404).json({ message: "Product not found" });

        if(cart) {
            // Check if item is already in cart
            const itemIndex = cart.items.findIndex(item => item.productId.equals(itemId));

            if(itemIndex > -1) {
                // Item exists in cart, update quantity
                cart.items[itemIndex].quantity += quantity; //Increment quantity.
            } 
            else {
                // Item does not exist, add to cart
                cart.items.push({
                    productId: itemId,
                    name: product.name,
                    price: product.price,
                    quantity,
                    image: product.image,
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
                    image: product.image,
                }]
            });
        }

        await cart.save();
        res.json(cart);
    } catch (error) {
        console.log("Error in addToCart: ", error);
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
                cart.items[itemIndex].quantity = quantity; //Update quantity.
            }
            else {
                
                console.log(cart.items.splice(itemIndex, 1)); //Remove item with quantity of 0.
            }
        }

        if(itemIndex === -1) return res.status(404).json({ message: "Item not found in cart" });

        await cart.save();
        res.json(cart);
    } 
    catch (error) {
        console.log("(updateCartItem) Error: ", error);
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



const validateCoupon = async (code) => {
    const validCoupons = {
        SAVE10: 0.10,
        FREEDELIVERY: {shipping: 0},
    };
    return validCoupons[code.toUpperCase()] || null;
}

const calculateFees = async (req, res) => {
    try {

        console.log("(cartController)(calculateFees): Made it here!");
        const {subtotal, state, shippingCost, couponCode } = req.body;
        console.log("Subtotal: ", subtotal)
        const taxRate = await getStateTaxRates(state);
        const tax = parseFloat((subtotal * taxRate).toFixed(2));

        let shipping = shippingCost;

        let discount = 0;
        if(couponCode) {
            const coupon = await validateCoupon(couponCode);
            if(coupon) {
                if(coupon.shipping === 0) {
                    shipping = 0;
                }
                else {
                    discount = parseFloat((subtotal * coupon).toFixed(2)); //Percentage discount
                }
            }
        }

        //Calculate total.
        const total = parseFloat((subtotal + tax + shipping - discount).toFixed(2));
        console.log("total: ", total);
        res.json({
            taxRate, 
            tax, 
            shipping, 
            discount, 
            total });
    }       
    catch (error) {
        console.error("(cartController.js) -> (calculateFees) Error calculating fees: ", error);
        res.status(500).json({ message: 'Error calculating fees', error: error.message });
    }
}

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    clearCart,
    calculateFees,
};
