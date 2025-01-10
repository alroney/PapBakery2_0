const express = require('express');
const router = express.Router();
const { getAvailableTables, getBaseInfo, getTableData, fetchAndStoreNewBaseToken, runSQL, updateRows } = require('../controllers/seatableController');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/baseinfo', getBaseInfo);
router.get('/table/:tableName', getTableData);
router.get('/refreshToken', fetchAndStoreNewBaseToken);

router.post('/runsql', runSQL);

router.put('/update', updateRows);

module.exports = router;