const Mongoose = require('mongoose');

const reviewSchema = new Mongoose.Schema(
    {
        productId: {
            type: Mongoose.Schema.Types.ObjectId,
            ref: 'Products', //Link to the Product.
            required: true
        }, 
        userId: {
            type: Mongoose.Schema.Types.ObjectId,
            ref: 'Users', //Link to the User
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        comment: {
            type: String,
            required: false,
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            required: true,
        },
        image: {
            type: String,
            required: false,
        },
        date: {
            type: Date,
            default: Date.now },
    },
    { timestamps: true }
);

module.exports = Mongoose.model('Review', reviewSchema);
