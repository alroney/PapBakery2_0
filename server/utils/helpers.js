const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const environment = process.env.ENVIRONMENT;
const pp_client_id = process.env.PAYPAL_CLIENT_ID;
const pp_client_secret = process.env.PAYPAL_CLIENT_SECRET;
const paypal_endpoint_url = environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const axios = require('axios');

const Users = require('../models/userSchema');
const Products = require('../models/productSchema');


const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs (15mins).
    message: 'Too many requests, please try again later.',
});


//Helper function to fetch cart data based on user or guest.
const getCartData = async (req) =>  {
    console.log("Getting cart data......");

    if(req.user) {
        console.log("User found! Using user cart.");
        const userData = await Users.findOne({_id: req.user.id});
        //userData.cartData is already in proper JSON format. Therefore no parsing is required.
        return { cartData: userData.cartData, email: userData.email };
    }
    else if(req.user === undefined && req.body.isGuest) {
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
        console.log("(generateCartSummary) orderDetails: ", orderDetails);
        
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

        return cartSummary;
}



//Helper function to send confirmation email.
const sendConfirmationEmail = async (email, cartSummary) => {
    //SMTP configuration for Zoho Mail.
    const transporter = nodemailer.createTransport({
        host: "smtp.zoho.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.AUTO_EMAIL_ADR,
            pass: process.env.AUTO_EMAIL_PAS,
        },
    });

    await transporter.sendMail({
        from: process.env.AUTO_EMAIL_ADR,
        to: email,
        subject: "Order Confirmation",
        text: `Your order has been confirmed.\n\n ${cartSummary}`,
    });
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

const isValidJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    }
    catch(error) {
        return false;
    }
};



module.exports = { sendConfirmationEmail, generateCartSummary, getCartData, rateLimiter, isValidJSON, getStateTaxRates };