const express = require('express');
const router = express.Router();
const { getAvailableTables, getBaseInfo, getTableData } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/baseinfo', getBaseInfo);
router.get('/table/:tableName', getTableData);

module.exports = router;