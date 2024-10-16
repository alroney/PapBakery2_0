/**
 * This file will contain all the backend code.
 */

const port = 4000;
//const [name of variable] = require("[name of package]");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json()); //Any request that is received from response will be automatically passed through json.
app.use(cors()); //This will allow the reactjs project to connect to express app on the specificed port (4000).


