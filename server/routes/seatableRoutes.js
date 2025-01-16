const express = require('express');
const router = express.Router();
const { getAvailableTables, getBaseInfo, getTableData, fetchAndStoreNewBaseToken, runSQL, updateRows, calculate } = require('../controllers/seatableController');
const { testSTCMaps } = require('../controllers/seatableControllers/stcTestMap');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/baseinfo', getBaseInfo);
router.get('/table/:tableName', getTableData);
router.get('/refreshToken', fetchAndStoreNewBaseToken);
router.get('/test', testSTCMaps);

router.post('/runsql', runSQL);
router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;