const port = 4000;

//Import necessary packages -> const varname = require("packagename");.
const express = require("express");
require('dotenv').config(); //Load environment variables.
const app = express();
const mongoose = require("mongoose"); //Allows connection to MongoDB
const jwt = require("jsonwebtoken"); //Used to generate and verify tokens.
const multer = require("multer"); //Allows for image storage handling.
const fs = require('fs');
const path = require("path");
const cors = require("cors"); //Allows client (React) to access the backend.
const axios = require("axios"); //Used to make HTTP requests to external APIs.
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser")
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const {
    ApiError,
    Client,
    Environment,
    LogLevel,
    OrdersController,
    PaymentsController
} = require("@paypal/paypal-server-sdk");
const environment = process.env.ENVIRONMENT;
const pp_client_id = process.env.PAYPAL_CLIENT_ID;
const pp_client_secret = process.env.PAYPAL_CLIENT_SECRET;
const paypal_endpoint_url = environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10); //Convert to integer.




//#region - MIDDLEWARE SETUP

app.use(helmet());
app.use(express.json()); //Automatically parse incoming requests as JSON.
app.use(express.urlencoded({
    extended: true
})); 
app.use(cors()); //Allow React app to connect to the Express app.

//Set Cross-Origin-Resource-Policy to cross-origin during development and same-site during production.
app.use((req,res,next) => {
    res.setHeader('Cross-Origin-Resource-Policy', environment === 'sandbox' ? 'cross-origin' : 'same-site');
    next();
})

 /** Explanation of fetchUser Middleware.
 * Asynchronous Middleware Function.
 * 
 * @param {*} req: Represents the request made by the client.
 * @param {*} res: Represents the response that will be sent to the client.
 * @param {*} next: A function that, when called, will pass control to the next middleware in the stack.
 * 
 * PURPOSE:
 * - To authenticate the user using the JWT token provided in the request headers.
 */
const fetchUser = async (req,res,next) => {
    const token = req.header('auth-token'); //Extract JWT token value from the key 'auth-token' located in the 'headers' key's object value in the fetch functions object parameter -> fetch(('api_endpoint_url'), {}).
    
    if(!token) {
        req.user = null; //Set req.user to null for guest users.
        return next(); ///Proceed without user authentication.
    }
    try {
        /** Explanation of JWT verification process.
         * Verify JWT token and extract user data.
         * 
         * @Verification_Process
         * - `jwt.verify(token, process.env.JWT_SECRET)`: used to verify the token.
         *      - `token`: The JWT token extracted from the request header.
         *      - `secret_ecom`: The secret key used to verify the token's integrity.
         *          - This is the same secret that was used to sign the token when it was originally created.
         *          - If the token has been altered or is not valid, verification will fail.
         * - If the token is valid, `jwt.verify()` returns the decoded payload from the token, which in this case is assigned to the variable `data`.
         *      - `data` contains the information embedded when the token was created, specifically `{user: {id: user.id} }`
         * 
         * Extract User Data
         * - `req.user =data.user;` assigns the `user` object (from the decoded token) to `req.user`.
         * - This allows the information about the user (e.g. user ID) to be available in any subsequent route handler or middleware.
         * - For example, any route that follows this middleware can use req.user.id to know which user is making the request.
         * 
         * Call Next Middleware
         * - `next();` is called to pass control to the next middleware function in the stack.
         * - If the middleware successfully authenticates the user, the request proceeds to the next handler (e.g. a route that handles a request to add a product to a cart).
         */
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified.user;
        next();
    }
    catch (error) {
        res.status(401).send({errors: "Invalid token."});
    }
};

/** Explanation of Middleware Usage.
 * HOW THE MIDDLEWARE IS USED (fetchUser)
 * 
 * @Purpose
 * - This middleware is used to ensure that the request is coming from an authenticated user.
 * - It validates the user's identity using the token, making sure that only authorized users can access protected routes.
 * 
 * @Usage
 * - Middleware is added to routes that require authentication.
 * - For example, in `app.post('/addtocart', fetchUser, async (req, res) => {});`
 *      - This route will only proceed if the user is authenticated.
 *      - `fetchUser` will run before this function.
 * 
 * @Summary
 * - The `fetchUser` middleware ensures that users are authenticated before they can access certain routes.
 * - It extracts the token from the request header and verifies it using a secret key.
 * - If the token is valid, the user's data is attched to req.user, allowing downstream handlers to know the user's identity.
 * - If the token is missing or invalid, the user gets a 401 Unauthorized response, preventing access to the route.
 */


const updateAverageRating = async (productId) => {
    try {
        const product = await Product.findOne({id:productId});
        let avgRating = 0;

        if(product.reviews.length > 0) {
            const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
            console.log("TotalRating: ", totalRating);
            avgRating = totalRating / product.reviews.length;
        }

        else {
            console.log("Product has no reviews.");
        }

        product.rating = avgRating;

        await product.save();
    }
    catch(error) {
        console.log("Error while updating rating: ", error);
    }
}

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs (15mins).
    message: 'Too many requests, please try again later.',
});
//#endregion


//Database credentials and connection string.
let uri = process.env.MONGO_URI;



//Database connection with MongoDB
mongoose.connect(uri);

//Image Storage Engine configuration
const storage = multer.diskStorage({
    destination: './upload/images', //Directory to save uploaded images.
    filename: (req, file, cb) => {
        //Generate unique filename with original extension.
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`); //`cb` is a callback function that is provided by the Multer library (used for handling file uploads in Node.js).
    }
})

//Multer configuration for file uploads.
const upload = multer({storage:storage})


//Start the server and listen on the specified port.
app.listen(port, (error) => {
    if(!error) {
        console.log("Server Running on Port: "+ port);
    }
    else {
        console.log("Error: "+ error);
    }
})


app.use(bodyParser.json());

//#region - API
    /** Abbreviations
     * req = request.
     * res = respond.
     */
    //API creation for the root route.
    app.get("/", (req, res) => {
        res.send("Express App is Running")//response.send displays the text on to web page.
    })

    //Serve static images from the 'upload/images' folder.
    app.use('/images', express.static('upload/images'))



    //API Endpoint to handle image uploads.
    app.post("/upload", upload.single('product'), (req,res) => {//field name is product.
        try {
            //Respond with success and img url.
            res.json({
                success:1,
                image_url:`http://localhost:${port}/images/${req.file.filename}`
            })
        }
        catch(error) {
            console.log("Upload error occurred: ", error);
        }
    })


    /**
     * Product schema definition using Mongoose.
     * In MondoDB, data is stored in collections, not tables (as in SQL databases).
     * Therefore, This creates a model named "Product" which represents a collection in the MongoDB database.
     */
    const Product = mongoose.model("Product", {
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
                    type: mongoose.Schema.Types.ObjectId,
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
    })


    //#region - PRODUCT RELATED API ENDPOINTS
        //API endpoint to add a new product.
        app.post('/addproduct', async (req,res) => {
            
            let products = await Product.find({}); 
            console.log("Product Length: "+ products.length);
            try {

                //Generate a new product ID. If there are exisiting products, it takes the last product's ID and increments it by 1. If no products exist, it starts with an ID of 1.
                let id = products.length > 0 ? products.slice(-1)[0].id + 1 : 1; //slice() method is used to return a shallow copy of a portion of an array. So, slice(-1) is used with a negative index, which means "get the last element of the array". This returns an array containing only the last product in the products array.
                console.log("ID: ", id);

                //Create a new product with the provided values.
                const product = new Product({
                    id: id,
                    name: req.body.name,
                    image: req.body.image,
                    category: req.body.category,
                    price: req.body.price,
                });

                //Save the product to the database.
                await product.save();
                console.log("Product Added");

                //Respond with success.
                res.json({
                    success: true,
                    name: req.body.name,
                })
            }
            catch(error) {
                console.log("Product Length was: ", products.length);
                console.log("Error while adding product: ", error);
            }
        });


        //API endpoint to edit product by ID.
        app.post('/editproduct', async (req,res) => {
            try {
                const filter = {id:req.body.id};
                const update = {
                    name: req.body.name,
                    price: req.body.price,
                    category: req.body.category,
                }

                let product = await Product.findOneAndUpdate(filter, update);
                product;
                product.save();
                console.log("Product ID: "+ product.id +", has successfully updated!");

                if(product){
                    res.json({
                        success: true,
                        name: product.name,
                    })
                }
            }
            catch(error) {
                console.log("An error occurred trying to update a product: ", error);
            }

        })


        //API endpoint to remove a product by ID.
        app.post('/removeproduct', async (req,res) => {
            try {
                const product = await Product.findOne({id:req.body.id});

                if(!product) {
                    return res.status(404).json({
                        success: false,
                        message: 'Product not found',
                    });
                }

                //Get only the image file name if `product.image` contains a full URL.
                const imageName = product.image.split('/').pop(); //Extracts the file name
                const imagePath = path.join(__dirname, 'upload/images', imageName);

                

                //Delete the image file
                fs.unlink(imagePath, async (error) => {
                    if(error) {
                        console.error("Error while deleting the image file: ", error);
                    }
                    else {
                        console.log("Image file deleted successfull.");
                        //Delete the product from the database.
                        await Product.findOneAndDelete({ id: req.body.id });
                        res.json({
                            success: true,
                            name: req.body.name,
                        });
                    }
                });
            }
            catch(error) {
                console.log("Error while removing product: ", error);
                res.status(500).json({
                    success: false,
                    message: "Error while removing product",
                })
            }
        });


        //API endpoint to fetch all products.
        app.get('/allproducts', async (req,res) => {
            try {
                let products = await Product.find({});
                

                res.send(products); //Respond with list of all products.
            }
            catch(error) {
                console.log("Error while getting all products: ", error);
            }
        });

        //API endpoint to fetch the newest items (last 8 added).
        app.get('/newitems', async (req,res) => {
            try {
                let products = await Product.find({}); //Get all products.
                let newItems = products.slice(-8);
                console.log("New Items Fetched.");
                res.send(newItems);
            }
            catch(error) {
                console.log("Error while getting new items: ", error);
            }
        });

        /**
         * @TODO Create algorithm that compares the likes of 1 product to other products and shows the 3 most popular.
         */

        //API endpoint to fetch popular flavors (first 4 items).
        app.get('/popular', async (req,res) => {
            try {
                let products = await Product.find({}); //Get all products.
                let popular_flavors = products.slice(0,4);
                console.log("Popular Flavors Fetched.");
                res.send(popular_flavors);
            }
            catch(error) {
                console.log("Error while getting popular items: ", error);
            }
        });

        //API endpoint to add a review to a product
        app.post('/addreview', fetchUser, async (req,res) => {
            try {
                //Fetch the product which the review is being added to.
                let product = await Product.findOne({id:req.body.productId});
                console.log("product: ", product);

                if(!product) {
                    console.log("The product: "+ product +" is not found.");
                    return res.status(404).json({error: "Product not found"});
                }

                //Extract user ID from request (added by the middleware).
                let userId = req.user.id;

                //Generate a new review ID.
                let id = product.reviews.length > 0 ? product.reviews.slice(-1)[0].id + 1 : 1; //slice() method is used to return a shallow copy of a portion of an array. So, slice(-1) is used with a negative index, which means "get the last element of the array". This returns an array containing only the last product in the products array.
                

                //Create a new product with the provided values.
                const newReview = {
                    id: id,
                    name: req.body.name,
                    image: req.body.image,
                    rating: req.body.rating,
                    comment: req.body.comment,
                    user: userId,
                };

                product.reviews.push(newReview);

                //Save the product to the database.
                await product.save();
                console.log("A review as been saved.");


                await updateAverageRating(product.id);
                //Link saved review to user who created it.
                await Users.findByIdAndUpdate(userId, {$push: {reviews: product._id}}); //`findByIdAndUpdate(userId, updateObject)`. The `$push` is a MongoDB update operator. The `{reviews:` is the name of the array field within the user's document where reviews are stored. ` product._id}` is the unique ID of the product that was reviewed.

                //Respond with success.
                res.json({
                    success: true,
                    review: newReview
                });
            }

            catch (error) {
                console.error("IN THE CATCH", error);
                res.status(500).json({ success:false, message: "Server Error" });
            }
        });

        app.get('/productreviews/:productId', async (req,res) => {
            try {
                const productId = req.params.productId;
                let product = await Product.findOne({id:productId});

                res.status(200).json({
                    success: true,
                    reviews: product.reviews,
                });
            }
            catch(error) {
                console.log("Error getting product reviews: ", error);
            }
        });

    //#endregion

    //Define User schema and create Mongoose model.
    const userSchema = new mongoose.Schema({ 
        name: {
            type: String,
            lowercase: true,
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            required: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
        },
        cartData: {
            type: Object,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        reviews: [ //Storage for all reviews made by the user.
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            }
        ],
    });

    userSchema.pre("save", async function(next) {
        try {
            const user = this; //`this` refers to the document.
            if(user.isModified("password")) {
                console.log("hashing password...");
                user.password = await bcrypt.hash(user.password, saltRounds);
            }

            next();
        }
        catch(error) {
            console.log("Error occurred while hashing password: ", error);
        }
    })

    const Users = mongoose.model("Users", userSchema); //Create the Users model using the userSchema details.



    //#region - USER RELATED API ENDPOINTS
        //API endpoint for user registration.
        app.post('/signup', async (req,res) => {
            try {
                //Check if user already exists with the given email.
                let check = await Users.findOne({email:req.body.email});
                if(check) {
                    return res.status(400).json({success: false, errors: "Exisiting user found with that email!"});
                }

                //Create an empty cart with keys from 1 to 400 initialized to 0.
                let cart = {}; 
                for(let i = 0; i < 10; i++) {
                    cart[i] = 0;
                }

                //Create a new user with the provided details.
                const user = new Users({
                    name: req.body.name,
                    email: req.body.email,
                    password: req.body.password,
                    cartData: cart,
                });

                await user.save(); //Save the new user to the database.

                /** Explanation of `data` object
                 * This section creates an object named `data` that will be encoded into the JWT.
                 * 
                 * The `data` object contains a `user` property, which is itself an object with a single property, `id`.
                 * - `user.id` represents the unique identifier of the user in the database. It is used to associate requests or operations with a 
                specific user whenever they register or log in.
                 * 
                 * @PURPOSE
                 * - The `data` object serves as the payload for the JWT, which means it contains the information that will be encoded within the token.
                 * - Including the user's ID allows the server to identify the user when handling subsequent authenticated requests.
                 */
                const data = {
                    user: {
                        id: user.id,
                    }
                };

                /** Explanation of JWT token generation
                 * This section generates a JWT token using the jsonwebtoken library (`jwt`).
                 * The function `jwt.sign()` is used to create the JWT.
                 * 
                 * The function takes two main arguments:
                 * - @argument {Payload `data`}: The object that contains the information to be included in the token (in this case, the `data` object containing the user's ID).
                 * - @argument {Secret `process.env.JWT_SECRET`}: A secret key used to digitally sign the token. This key is securely stored in the `.env` file.
                 *  -The server uses this secret key when creating or verifying tokens to ensure they haven't been tampered with.
                 *  - In a production environment, it's crucial to use a strong and unpredictable secret key for security reasons.
                 */
                const token = jwt.sign(data, process.env.JWT_SECRET); //jwt.sign(payload, secret);

                //Respond with success and the generated JWT token.
                res.json({success: true, token});

                
            }

            catch(error) {
                console.log("User sign-up error occurred: ", error);
            }
        });



        //API Endpoint for user login.
        app.post('/login', async (req,res) => {
            try {
                //Find user by email.
                let user = await Users.findOne({email: req.body.email});
                if(user) {
                    //Compare provided password with stored password.
                    const passCompare = await bcrypt.compare(req.body.password, user.password);//Use bcrypt.compare to compare the hashing. Instead of direct comparison.
                    if(passCompare) {
                        //Generate JWT token if password matches.
                        const data = {
                            user: {
                                id: user.id,
                            },
                        };
                        const token = jwt.sign(data, process.env.JWT_SECRET);
                        res.json({success: true, token});
                    }

                    else {
                        res.json({success: false, errors: "Password Incorrect!"});
                    }
                }

                else {
                    res.json({success: false, errors: "Email does not exist!"});
                }
            }
            catch(error) {
                console.log("User login error occurred: ", error);
            }
        });

       

        //API endpoint to add a product to user's cart.
        app.post('/addtocart', fetchUser, async (req,res) => {
            try {
                let userData = await Users.findOne({_id: req.user.id}); //Wait for server to find a single user.
                userData.cartData[req.body.itemId] += 1;
                await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
            }
            catch(error) {
                console.log("Add to Cart error occurred: ", error);
            }
        });

        //API endpoint to remove a product from user's cart.
        app.post('/removefromcart', fetchUser, async (req,res) => {
            try {
                let userData = await Users.findOne({_id: req.user.id});
                if(userData.cartData[req.body.itemId] > 0) {
                    userData.cartData[req.body.itemId] -= 1;
                }
                await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
            }
            catch(error) {
                console.log("Remove from Cart error occurred: ", error);
            }
        });

        //API endpoint to get user's cart data.
        app.post('/getcart', fetchUser, async (req,res) => {
            try {
                let userData = await Users.findOne({_id: req.user.id});
                res.json(userData.cartData);
            }
            catch(error) {
                console.log("Get Cart error occurred: ", error);
            }
        });
        //#endregion

//#endregion



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


        const orderSchema = new mongoose.Schema({
            id: {
                type: String,
                lowercase: true,
                unique: true,
            },
            user: {
                type: mongoose.Schema.Types.ObjectId,
                required: false,
                ref: "users",
            },
            guest: {
                isGuest: {
                    type: Boolean,
                },
                email: {
                    type: String,
                    lowercase: true,
                },
            },
            cart: {
                type: Object,
            },
            subtotal: {
                type: Number,
            },
            tax: {
                type: Number,
            },
            date: {
                type: Date,
                default: Date().now,
            }
        });









        app.post('/create_order', rateLimiter, fetchUser, async (req, res) => {
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
            
        });

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

        app.post('/complete_order', async (req,res) => {
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
        });

        const get_access_token = () => {
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