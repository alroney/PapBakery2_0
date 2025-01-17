const express = require('express');
const router = express.Router();
const { fetchStoredToken, storeNewToken } = require('../controllers/tokenController');

router.get('/fetchToken', fetchStoredToken);

router.post('/storeToken', storeNewToken);