const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const environment = process.env.ENVIRONMENT;
const pp_client_id = process.env.PAYPAL_CLIENT_ID;
const pp_client_secret = process.env.PAYPAL_CLIENT_SECRET;
const paypal_endpoint_url = environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs (15mins).
    message: 'Too many requests, please try again later.',
});


//Helper function to fetch cart data based on user or guest.
const getCartData = async (req) =>  {
    console.log("Getting cart data......");
    console.log("req: ", req.user);
    if(req.user) {
        console.log("User found! Using user cart.");
        const userData = await Users.findOne({_id: req.user.id});

        return { cartData: userData.cartData, email: userData.email };
    }
    else if(req.user === undefined && req.body.isGuest) {
        console.log("No user found. Searching for guest email...");
        if(!req.body.guestEmail) throw new Error("Guest email is required for guest checkout");
        console.log("Guest email found. Returning cartData and email...");
        return { cartData: req.body.cartData, email: req.body.guestEmail };
    }
    else {
        console.log("Cart data not found.");
    }
}



//Helper function to generate cart summary.
const generateCartSummary = async (cartData) => {
    let cartItemIds = Object.keys(cartData).filter(itemId => cartData[itemId] > 0);
        let products = await Product.find({id: {$in: cartItemIds} });

        
        let cartSummary = "Your cart summary includes the following items: \n\n";
        let totalAmount = 0;

        products.forEach((product) => {
            const quantity = cartData[product.id];
            const itemTotal = product.price * quantity;
            totalAmount += itemTotal;

            cartSummary += `Product: ${product.name}\n`;
            cartSummary += `Price: ${product.price}\n`;
            cartSummary += `Quantity: ${quantity}\n`;
            cartSummary += `Total: $${itemTotal}\n`;
            cartSummary += `==================================\n\n`
        });

        if(cartSummary === "Your cart summary includes the following items: \n\n") {
            cartSummary += `No items in your cart.`
        }

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




const get_access_token = async () => {
    const auth = `${pp_client_id}:${pp_client_secret}`;
    const data = 'grant_type=client_credentials';
    console.log("get_access_token reached!");

    return fetch(paypal_endpoint_url + '/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(auth).toString('base64')}`
        },
        body: data
    })
    .then(response => {
        if(!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json(); //Parse the response as JSON. This allows access to json.access_token.
    })
    .then(json => {
        console.log("Access token retrieved: ", json.access_token);
        if(!json.access_token) {
            throw new Error("Access token missing in response.");
        }
        return json.access_token;
    })
    .catch(error => {
        console.error("Error fetching access token: ", error);
        throw error; //Propagate the error so it can be handled by the caller
    });
};


module.exports = { sendConfirmationEmail, generateCartSummary, getCartData, rateLimiter, get_access_token };