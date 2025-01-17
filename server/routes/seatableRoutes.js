const express = require('express');
const router = express.Router();
const { getAvailableTables, getTableData, runSQL, updateRows, calculate } = require('../controllers/seatableController');
const { getBaseInfo } = require('../controllers/seatableControllers/stTokenController');
const { testSTCMaps } = require('../controllers/seatableControllers/stcTestMap');
const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/table/:tableName', getTableData);
router.get('/test', testSTCMaps);

router.post('/runsql', runSQL);
router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;