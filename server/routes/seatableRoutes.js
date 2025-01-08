const express = require('express');
const router = express.Router();
const { getAvailableTables, getBaseInfo } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/baseinfo', getBaseInfo);

module.exports = router;