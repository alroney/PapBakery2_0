const port = 4000;

//const [name of variable] = require("[name of package]");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

//Database variables
const username = encodeURIComponent("alrpapb");
const password = encodeURIComponent("c3ZVpLGPJ4kCXC");
const cluster = "cluster0";
const project = "Papbakery";
let uri = `mongodb+srv://${username}:${password}@${cluster}.ci6fw.mongodb.net/${project}`;

app.use(express.json()); //Any request that is received from response will be automatically passed through json.
app.use(cors()); //This will allow the reactjs project to connect to express app on the specificed port (4000).

//Database connection with MongoDB
mongoose.connect(uri);

