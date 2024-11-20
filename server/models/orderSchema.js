const Mongoose = require('mongoose');

const orderSchema = new Mongoose.Schema({
    buyer: {
        type: Mongoose.Schema.Types.Mixed, //Can store either an ObjectId or a string.
        required: true,
    },
    email: {
        type: String,
        lowercase: true,
    },
    cart: {
        type: Object,
        required: true,
    },
    subtotal: {
        type: Number,
        required: true,
    },
    tax: {
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date().now,
        required: true,
    },
});


const Orders = Mongoose.model("Orders", orderSchema);

module.exports = Orders;