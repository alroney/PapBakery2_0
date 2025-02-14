require('dotenv').config({ path: __dirname + '/.env' }); //Allows access to environment variables.
const environment = process.env.ENVIRONMENT;
const pp_client_id = process.env.PAYPAL_CLIENT_ID;
const pp_client_secret = process.env.PAYPAL_CLIENT_SECRET;
const paypal_endpoint_url = environment === 'development' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

const Products = require('../models/productSchema');
const Users = require('../models/userSchema');
const Orders = require('../models/orderSchema');
const Carts = require('../models/cartSchema');

const {getCartData, generateCartSummary, sendConfirmationEmail, isValidJSON, getStateTaxRates} = require('../utils/helpers');





const getOrderDetails = async (req, isGuest) => {
    /**TODO - Implement discounts/fees */
    console.log("\n\n\nGUEST: "+ isGuest +"\n\n\n");
    const { cartData, email } = await getCartData(req); // Fetch cart data

    const cartItemIds = cartData
        .filter((item) => item.quantity > 0) //Include items with quantity > 0.
        .map((item) => item.productId) //Extract product IDs.

    console.log("(getOrderDetails) cartItemIds: ", cartItemIds);
    const productsInCart = await Products.find({ _id: { $in: cartItemIds } });
    console.log("(getOrderDtails) productsInCart: ", productsInCart);
    let taxRate = parseFloat(await (getStateTaxRates("MD"))).toFixed(2);

    //Calculate the subtotal using the correct price of the item * the quantity. 
    let subtotal = cartData.reduce((sum, cartItem) => {
            console.log("(getOrderDetails)(subtotal) cartItem: ", cartItem);
            const product = productsInCart.find((p) => p._id.toString() === cartItem.productId);
            console.log("(getOrderDetails)(subtotal) product: ", product);
            if(product) {
                return sum + product.price * cartItem.quantity;
            }
            return sum;
        }, 0);
    
    let tax = subtotal * taxRate;
    let total = tax + subtotal;

    taxRate = parseFloat(taxRate).toFixed(2);
    subtotal = parseFloat(subtotal).toFixed(2);
    tax = parseFloat(tax).toFixed(2);
    total = parseFloat(total).toFixed(2);

    //Sanitize cartData to exclude the image property.
    const sanitizedCart = cartData.map(({image, _id, productId, ...rest}) => rest);
    
    return {
        buyer: isGuest ? "guest" : req.user,
        email: email,
        cart: sanitizedCart,
        subtotal,
        taxRate,
        tax,
        total,
    };
};



const process_order = async (req, res) => {
    let isProcessed = false;
    let orderSaved = false;
    try {
        const isGuest = !req.user;
        const orderDetails = await getOrderDetails(req, isGuest);
        const cartSummary = await generateCartSummary(orderDetails);
        const sendEmail = await sendConfirmationEmail(orderDetails.email, cartSummary);
        //Create new order using spread operator to let orderDetails to fill in all the properties.
        const newOrder = new Orders({
            ...orderDetails,
            date: new Date()
        })
        orderSaved = await newOrder.save();
        console.log("(process_order) orderSaved: ", orderSaved);
        if(orderSaved) {
            if(sendEmail) {
                console.log("Email sent successfully and Order saved.");
            }
            else {
                console.log("Order was saved but email failed to send.");
            }
            isProcessed = true;
        }
        else{
            throw new Error("Failed to save order");
        }
        
        return isProcessed;
    }
    catch(error) {
        console.log("(process_order) Error: ", error);
        return isProcessed;
    }
    
}


const confirm_cash_order = async (req, res) => {
    try {
        
        if(await process_order(req)) {
            console.log("(confirm_cash_order) order processed. Now sending status code...");
            res.status(200).json({ success: true, message: "Order processed successfully."});
        }
        else {
            console.log("(confirm_cash_order) Processed return false.");
            res.json({ success: false, message: "Internal server error: Order failed to proccess."});
        }

        

    }
    catch (error) {
        console.error("Error confirming cash order: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }

}



const create_order = async (req, res) => {
    console.log("Inside create_order api...");
    try {
        const isGuest = !req.user; //Determine if it's a guest checkout.
        const orderDetails = await getOrderDetails(req, isGuest);
        const access_token = await get_access_token();

        console.log("(create_order) orderDetails: ", orderDetails);

        const order_data_json = {
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: JSON.parse(orderDetails.total),
                },
                
            }],
        };
        
        const response = await fetch(paypal_endpoint_url + '/v2/checkout/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify(order_data_json),
        });

        
        const json = await response.json({ orderID: orderDetails.orderId});
       
        res.send(json);
    }
    catch(error) {
        console.log("Error in create_order: ", error);
        res.status(500).send(error);
    }
    
};







/**
 * Completes an order and returns it as a JSON response.
 * @function
 * @name completeOrder
 * @memberof module:routes
 * @param {object} req - The HTTP request object.
 * @param {object} req.body - The request body containing the order ID and intent.
 * @param {string} req.body.order_id - The ID of the order to complete.
 * @param {string} req.body.intent - The intent of the order.
 * @param {object} res - The HTTP response object.
 * @returns {object} The completed order as a JSON response.
 * @throws {Error} If there is an error completing the order.
 */

/**@todo: Create a model for completed orders. Then add completed orders to the model everytime. */

const complete_order = async (req,res) => {
    try {
        const isGuest = !req.user;
        const access_token = await get_access_token();
        console.log("access_token: ", access_token)
        const response = await fetch(paypal_endpoint_url + '/v2/checkout/orders/' + req.body.order_id + '/' + req.body.intent, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            }
        });

        const json = await response.json();
        console.log("JSON in complete_order: ", json);
        if(json.status === 'COMPLETED') {
            try {
                res.json(json);
                process_order(req);
            }
            catch(error) {
                console.log("Error in completed transaction statement: ", error)
            }
            
        }
        else {
            res.json({ success: false, message: "Payment could not be completed.", details: json});
        }
    }
    catch(error) {
        console.log("Error in complete_order: ", error);
        res.status(500).json({ success: false, message: "An error occurred while completing the order."})
    }
};



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



module.exports = { create_order, complete_order, confirm_cash_order };