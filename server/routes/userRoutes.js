const express = require('express');
const router = express.Router();
const { signup, login, me } = require('../controllers/userController');
const authenticateUser = require('../middlewares/authMiddleware');

router.get('/me', authenticateUser, me)

router.post('/login', login);
router.post('/signup', signup);

module.exports = router;