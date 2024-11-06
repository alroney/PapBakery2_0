const {
    ApiError,
    Client,
    Environment,
    LogLevel,
    OrdersController,
    PaymentsController
} = require("@paypal/paypal-server-sdk");



const create_order = async (req, res) => {
    console.log("Inside create_order api...");
    try {
        
        const isGuest = !req.user; //Determine if it's a guest checkout.
        const { cartData, email } = await getCartData(req); //Use helper function to get the cart data. Use await to ensure it is given time to return the data needed.
        
        let total = 0.00;
        
        //Find all products that are in the cart by querying the Product collection.
        let cartItemIds = Object.keys(cartData).filter(itemId => cartData[itemId] > 0);
        let products = await Product.find({id: {$in: cartItemIds} });

        total = products.reduce((sum, product) => sum + (product.price * cartData[product.id], 0).toFixed(2))

        console.log("Made it inside create_order. Now running get_access_token.");

        const access_token = await get_access_token();

        console.log("Body content: ", req.body);
        console.log("Intent in body: ", req.body.intent);
        const order_data_json = {
            intent: req.body.intent.toUpperCase(),
            purchase_units: [{
                currency_code: 'USD',
                value: total,
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

        
        const json = await response.json({ orderID: createOrderID});
       
        res.send(json);
        res.send({message: "Reached end of create_order successfully."});
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
            const { cartData, email } = await getCartData(req);
            const cartSummary = await generateCartSummary(cartData);

            await sendConfirmationEmail(email, cartSummary);

            res.json({ success: true, message: "Order completed and email sent successfully!", paymentDetails: json });
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

module.exports = { create_order, complete_order };