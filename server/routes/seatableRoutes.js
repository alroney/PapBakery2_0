const express = require('express');
const router = express.Router();
const { getAvailableTables } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);

module.exports = router;