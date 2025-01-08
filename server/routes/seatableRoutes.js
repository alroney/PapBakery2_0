const express = require('express');
const router = express.Router();
const { getMetadata } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/metadata', getMetadata);

module.exports = router;