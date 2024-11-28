const mongoose = require('mongoose');
const Products = require('../models/productSchema'); // Adjust the path as necessary
const Reviews = require('../models/reviewSchema'); // Adjust the path as necessary
require('dotenv').config({ path: __dirname + '/.env' }); //Allows access to environment variables.
const url = process.env.MONGO_URI;

const migrateReviews = async () => {
    try {
        // Connect to the database
        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => console.log("Connected to MongoDB."))
        .catch((error) => console.error("Error connecting to MongoDB: ", error));

        // Fetch all products
        const products = await Products.find();
        console.log(`Found ${products.length} products.`);

        // Migrate reviews
        for (const product of products) {
            if (product.reviews && product.reviews.length > 0) {
                for (const review of product.reviews) {
                    // Create a new review in the Review model
                    await Reviews.create({
                        productId: product._id,
                        userId: review.userId,
                        title: review.title,
                        comment: review.comment,
                        rating: review.rating,
                        date: review.date || new Date(),
                    });
                }

                // Clear the reviews field in the product (optional)
                product.reviews = [];
                await product.save();
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
};

migrateReviews();
