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
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser")
const helmet = require('helmet');

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


    


    //#region - PRODUCT RELATED API ENDPOINTS
        

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
        
       

        
        //#endregion

//#endregion



        


        









        

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