const environment = process.env.ENVIRONMENT;
const pp_client_id = process.env.PAYPAL_CLIENT_ID;
const pp_client_secret = process.env.PAYPAL_CLIENT_SECRET;
const paypal_endpoint_url = environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

const Products = require('../models/productSchema');
const Users = require('../models/userSchema');
const Orders = require('../models/orderSchema');
const {getCartData, generateCartSummary, sendConfirmationEmail, isValidJSON} = require('../utils/helpers');

const getNextOrderId = () => {
    const orders = Orders.find({});
    const orderId = orders.length > 0 ? orders.slice(-1)[0].id + 1 : 1;
    return orderId;
}

const getOrderDetails = async (req, isGuest) => {
    const { cartData, email } = await getCartData(req); // Fetch cart data
    const cartItemIds = Object.keys(cartData).filter(itemId => cartData[itemId] > 0);
    const productsInCart = await Products.find({ id: { $in: cartItemIds } });
    
    const subtotal = productsInCart.reduce((sum, product) => {
        return sum + (product.price * cartData[product.id]);
    }, 0).toFixed(2);
    
    const tax = 0.10;
    const total = parseFloat(subtotal) + parseFloat(tax);

    return {
        orderId: await getNextOrderId(), // Assume helper function to get unique order ID
        user: isGuest ? null : req.user,
        guest: isGuest ? { isGuest, email } : null,
        cart: productsInCart,
        subtotal,
        tax,
        total,
    };
};

const create_order = async (req, res) => {
    console.log("Inside create_order api...");
    const orders = await Orders.find({});
    try {
        const isGuest = !req.user; //Determine if it's a guest checkout.
        const orderDetails = await getOrderDetails(req, isGuest);


        const access_token = await get_access_token();

        // console.log("Body content: ", req.body);
        // console.log("Intent in body: ", req.body.intent);
        const order_data_json = {
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: JSON.parse(orderDetails.total),
                },
                
            }],
        };

        console.log("order_data_json: ", JSON.stringify(order_data_json));
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
        const access_token = get_access_token();
        const response = await fetch(paypal_endpoint_url + '/v2/checkout/orders/' + req.body.order_id + '/' + req.body.intent, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`,
            }
        });

        const json = await response.json();
        if(json.status === 'COMPLETED') {
            const orderDetails = await getOrderDetails(req, isGuest);
            const cartSummary = await generateCartSummary(orderDetails.cart);

            await sendConfirmationEmail(orderDetails.guest ? orderDetails.guest.email : req.user.email, cartSummary);

            res.json({ success: true, message: "Order completed and email sent successfully!", paymentDetails: json });
            if(!isGuest) {
                Users.findOneAndUpdate({ _id: req.user.id }, { cartData: {} });
            }
            else {
                localStorage.removeItem("guestCart");
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

    // get_access_token()
    //     .then(access_token => {
    //         fetch(paypal_endpoint_url + '/v2/checkout/orders/' + req.body.order_id + '/' + req.body.intent, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${access_token}`
    //             }
    //         })
    //         .then(res => res.json())
    //         .then(json => {
    //             console.log(json);
    //             res.send(json);
    //         }) //Send minimal data to client.
    //     }).catch(error => {
    //         console.log("Error in complete_order: ", error);
    //         res.status(500).send(error);
    //     })
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



module.exports = { create_order, complete_order };