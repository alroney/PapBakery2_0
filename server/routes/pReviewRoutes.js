const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authMiddleware');
const { productReviews, addReview } = require('../controllers/pReviewController');



router.post('/add', authenticateUser, addReview);
router.get('/reviews/:productId', productReviews);

module.exports = router;