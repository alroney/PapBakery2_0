const Mongoose = require('mongoose');

const orderSchema = new Mongoose.Schema({
    id: {
        type: String,
        lowercase: true,
        unique: true,
    },
    user: {
        type: Mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "users",
    },
    guest: {
        isGuest: {
            type: Boolean,
        },
        email: {
            type: String,
            lowercase: true,
        },
    },
    cart: {
        type: Object,
    },
    subtotal: {
        type: Number,
    },
    tax: {
        type: Number,
    },
    date: {
        type: Date,
        default: Date().now,
    }
});