const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: __dirname + '/.env' }); //Allows access to environment variables.
const environment = process.env.ENVIRONMENT;
const pp_client_id = process.env.PAYPAL_CLIENT_ID;
const pp_client_secret = process.env.PAYPAL_CLIENT_SECRET;
const paypal_endpoint_url = environment === 'development' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const axios = require('axios');
const from_address = process.env.AUTO_EMAIL_ADR
const from_pass = process.env.AUTO_EMAIL_PAS
const Users = require('../models/userSchema');


/**
 * Standardizes product data structure before sending to client.
 * Ensures consistent property names and data formats regardless of the source.
 * @param {Object} product - Raw product data object.
 * @return {Object} - Standardized product data object.
 */
const standardizedProductData = (product) => {
    if(!product) return null;

    //Create standardized product object with consistent naming.
    const standardProduct = {
        _id: product._id,
        sku: product.sku,
        description: product.description || '',
        price: product.price || 0,
        //Standardize naming (ensure consistent casing).
        category: product.category || '',
        subcategory: product.subcategory || product.subCategory || '',
        //Product attributes.
        flour: product.flour || '',
        flavor: product.flavor || '',
        shape: product.shape || '',
        size: product.size || '',

        //Standardize rating values.
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        available: product.available !== undefined ? product.available : true,

        //Always ensure images is an array with consistent structure.
        images: Array.isArray(product.images)
            ? product.images.map(img => {
                //If image is already in correct format, return it.
                if(typeof img === 'object' && img.imgName) {
                    return img;
                }
                //Convert string to object format.
                return {imgName: img, isNutrition: false};
            })
            : product.images
                ? [{imgName: product.images, isNutrition: false}]
                : [], //Default to empty array if no images provided.
    };

    return standardProduct;
};

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs (15mins).
    message: 'Too many requests, please try again later.',
});

//#region - CART HELPERS
    //Helper function to fetch cart data based on user or guest.
    const getCartData = async (req) =>  {
        console.log("Getting cart data......");
        console.log("(getCartData) req.user: ", req.user);
        if(req.user) {
            console.log("User found! Using user cart.");
            console.log("req.user: ", req.user);
            const userData = await Users.findOne({_id: req.user.id});
            console.log("(getCartData)(userfound) userData: ", userData);
            //userData.cartData is already in proper JSON format. Therefore no parsing is required.
            return { cartData: req.body.cart, email: userData.email };
        }
        else if(!req.user && req.body.isGuest) {
            console.log("No user found. Searching for guest email...");
            console.log("req.body: ", req.body);
            if(!req.body.guestEmail) throw new Error("Guest email is required for guest checkout");
            
            return { cartData: req.body.cart, email: req.body.guestEmail };
        }
        else {
            console.log("Cart data not found.");
            return {cartData: {}, email: null}
        }
    }




    //Helper function to generate cart summary.
    const generateCartSummary = async (orderDetails) => {
        try {
            console.log("(generateCartSummary) orderDetails: ", orderDetails);
            if(!orderDetails.buyer === "guest") {
                
            }
            let cartSummary = "Your cart summary includes the following items: \n\n";
            const cart = orderDetails.cart;
            let totalAmount = orderDetails.total;

            //Loop through the cart assigning each item as `product`
            cart.forEach((product) => {
                let tItemCost = product.quantity * product.price;
                cartSummary += `Product: ${product.name}\n`;
                cartSummary += `Price: $${product.price}\n`;
                cartSummary += `Quantity: ${product.quantity}\n`;
                cartSummary += `Total: $${tItemCost}\n`;
                cartSummary += `==================================\n\n`
            });

            if(cartSummary === "Your cart summary includes the following items: \n\n") {
                cartSummary += `No items in your cart.`
            }
            
            cartSummary += `\nTax = $${orderDetails.tax}`
            cartSummary += `\nGrand Total = $${totalAmount}`
            cartSummary += `\n\nTHIS IS EMAIL WAS SENT DURING TESTING PHASE\n\nYOU ARE NOT TO EXPECT ANY PRODUCTS`

            return cartSummary;
        } 
        catch (error) {
            console.log("(generateCartSummary) Error: ", error);
        }       
    }
//#endregion - CART HELPERS


//#region - CHECKOUT HELPERS
    //Helper function to send confirmation email.
    const sendConfirmationEmail = async (email, cartSummary) => {
        try {
            //SMTP configuration for Zoho Mail.
            const transporter = nodemailer.createTransport({
                host: "smtp.zoho.com",
                port: 465,
                secure: true,
                auth: {
                    user: from_address,
                    pass: from_pass,
                },
            });

            await transporter.sendMail({
                from: from_address,
                to: email,
                subject: "Order Confirmation",
                text: `Your order has been confirmed.\n\n ${cartSummary}`,
            });

            return true;
        }
        catch(error) {
            console.log("(sendConfirmationEmail) Error: ", error);
            return false;
        }
        
    }


    const stateTaxRates = {
        MD: 0.06,
    }

    const getStateTaxRates = async (state) => {
        try {
            if(!state || typeof state !== "string") {
                throw new Error("Invalid state provided.");
            }

            const taxRate = stateTaxRates[state.toUpperCase()];
            if(taxRate === undefined) {
                throw new Error(`Sales tax rate not found for state: ${state}`);
            }

            return taxRate;
        } 
        catch (error) {
            console.error("Error fetching sales tax rate: ", error.message);
            return 0;     
        }
    }
//#endregion - CHECKOUT HELPERS


//#region - VALIDATION HELPERS
    const isValidJSON = (str) => {
        try {
            JSON.parse(str);
            return true;
        }
        catch(error) {
            return false;
        }
    };
//#endregion - VALIDATION HELPERS

//#region - STRING HELPERS
    const capitalize = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    const decapitalize = (str) => {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
//#endregion - STRING HELPERS




//#region - PRODUCT HELPERS
    const destructureSKU = (sku) => {
        const [recipeSKU, ssSKU] = sku.split("-");
        const subCategoryID = recipeSKU.charAt(0);
        const flourID = recipeSKU.charAt(1);
        const flavorID = recipeSKU.charAt(2);
        const shapeID = ssSKU.charAt(0);
        const sizeID = ssSKU.charAt(1);

        return { subCategoryID, flourID, flavorID, shapeID, sizeID };
    }
//#endregion - PRODUCT HELPERS

module.exports = { standardizedProductData, sendConfirmationEmail, rateLimiter, generateCartSummary, getCartData, isValidJSON, getStateTaxRates, capitalize, decapitalize, destructureSKU };