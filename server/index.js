const port = 4000;

//Import necessary packages -> const varname = require("packagename");.
const express = require('express');
require('dotenv').config(); //Load environment variables.
const app = express();
const mongoose = require('mongoose'); //Allows connection to MongoDB
const multer = require('multer'); //Allows for image storage handling.
const fs = require('fs');
const path = require('path');
const cors = require('cors'); //Allows client (React) to access the backend.

const bodyParser = require('body-parser')
const helmet = require('helmet');
const environment = process.env.ENVIRONMENT;

//Import Routes
const productRoutes = require('./routes/productRoutes');
const pReviewRoutes = require('./routes/pReviewRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const imageRoutes = require('./routes/imageRoutes');
const Users = require('./models/userSchema');






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


//Database credentials and connection string.
let uri = process.env.MONGO_URI;



//Database connection with MongoDB
mongoose.connect(uri)
    .then(() => console.log("Connected to MongoDB."))
    .catch((error) => console.error("Error connecting to MongoDB: ", error));




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

    app.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    //Middleware to serve static images from the 'upload/images' folder.
    app.use('/images', express.static(path.join(__dirname, 'upload/images')));

    

//#endregion


//Use the routes as middleware
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/pReviews', pReviewRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/images', imageRoutes);


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
})
        


        









        

        