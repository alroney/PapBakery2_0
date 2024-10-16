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
