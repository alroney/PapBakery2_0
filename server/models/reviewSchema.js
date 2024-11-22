const Mongoose = require('mongoose');

const reviewSchema = new Mongoose.Schema(
    {
        productId: {
            type: Mongoose.Schema.Types.ObjectId,
            ref: 'Product', //Link to the Product.
            required: true
        }, 
        userId: {
            type: Mongoose.Schema.Types.ObjectId,
            ref: 'User', //Link to the User
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        comment: {
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            required: true,
        },
        image: {
            type: String,
        },
        date: {
            type: Date,
            default: Date.now },
    },
    { timestamps: true }
);

module.exports = Mongoose.model('Review', reviewSchema);
