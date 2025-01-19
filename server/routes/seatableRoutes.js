const express = require('express');
const router = express.Router();
const { runSQL, updateRows, calculate } = require('../controllers/seatableController');
const { testSTCMaps } = require('../controllers/seatableControllers/stcTestMap');
const { getAvailableTables, getTableData } = require('../controllers/seatableControllers/stDataController');
// const checkAuth = require('../middlewares/seatableMiddleware');

router.get('/tables', getAvailableTables);
router.get('/table/:tableName', getTableData);
router.get('/test', testSTCMaps);

router.post('/runsql', runSQL);
router.post('/calculate', calculate);

router.put('/update', updateRows);

module.exports = router;