const Mongoose = require("mongoose");

/**
     * Product schema definition using Mongoose.
     * In MondoDB, data is stored in collections, not tables (as in SQL databases).
     * Therefore, This creates a model named "Product" which represents a collection in the MongoDB database.
     */
const productSchema = new Mongoose.Schema({
    //key: object -> { key: value,}.
    id: {
        type: Number,
        required: true,
        unique: true,
    },
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
    reviews: [ //This property is an array since it will hold multiple reviews.
        {
            id: {
                type: String,
                required: false,
            },
            name: {
                type: String,
                required: false,
                default: null,
            },
            rating: {
                type: Number,
                required: false,
            },
            comment: {
                type: String,
                required: false,
            },
            image: { //This property gives the option to add an image to a review.
                type: String,
                required: false,
            },
            user: {//This property is created to assign the user to the review made.
                type: Mongoose.Schema.Types.ObjectId,
                required: false,
                ref: "users",
            },
            date: {
                type: Date,
                required: false,
                default: Date.now(),
            },
        },
    ],
    rating: { //This will be the average. It will be retrieved from getting all reviews, adding the rating value for each one, then divide by the number of reviews made, based off the current product id.
        type: Number,
        required: true,
        default: 0,
    },
    reviewNumber: { //This will count the number of reviews that have been made.
        type: Number,
        required: true,
        default: 0,
    }
});


const Products = Mongoose.model("Products", productSchema);

module.exports = Products;