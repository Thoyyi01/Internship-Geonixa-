const express = require('express');
const {
  addTransaction,
  getTransactions,
  deleteTransaction,
  getSummary
} = require('../controllers/transactionController');

const router = express.Router();

router.post('/', addTransaction);
router.get('/:userId', getTransactions);
router.delete('/:id', deleteTransaction);
router.get('/summary/:userId', getSummary);

module.exports = router;