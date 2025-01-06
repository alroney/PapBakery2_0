const express = require('express');
const router = express.Router();
const { getBaseInfo } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/base-info', getBaseInfo);

module.exports = router;