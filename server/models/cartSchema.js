const mongoose = require('mongoose');

// Define the CartItem schema for each item in the cart
const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',  // Reference to Product model
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
    },
    image: {
        type: String,
    }
});

// Define the Cart schema
const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to User model
        required: true,
        unique: true, // Ensures one cart per user
    },
    items: [cartItemSchema],  // Array of cart items
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Automatically update `updatedAt` on document modification
cartSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Cart', cartSchema);
