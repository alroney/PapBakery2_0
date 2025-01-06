const express = require('express');
const router = express.Router();
const { getBaseToken } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/base-token', getBaseToken);

module.exports = router;