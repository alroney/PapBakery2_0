const Mongoose = require('mongoose');

/**
     * Product schema definition using Mongoose.
     * In MondoDB, data is stored in collections, not tables (as in SQL databases).
     * Therefore, This creates a model named "Product" which represents a collection in the MongoDB database.
     */
const productSchema = new Mongoose.Schema(
    {
        //key: object -> { key: value,}.
        name: {
            type: String,
            required: true,
            default: "product",
        },
        image: {
            type: String,
            required: true,
            default: "",
        },
        description: {
            type: String,
            required: false, //CHANGE LATER
            default: `Product Description`,
        },
        category:{
            type: String,
            required: true,
            default: "none",
        },
        price:{
            type: Number,
            required: true,
            default: 0,
        },
        date:{
            type: Date,
            default: Date.now(),
        },
        available:{
            type: Boolean,
            default: true,
        },
        reviewCount: { //Total number of reviews.
            type: Number,
            default: 0,
        },
        rating: { //This will be the average. It will be retrieved from getting all reviews, adding the rating value for each one, then divide by the number of reviews made, based off the current product id.
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);


module.exports = Mongoose.model('Product', productSchema);