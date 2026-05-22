const Transaction = require('../models/Transaction');

// Add Transaction
const addTransaction = async (req, res) => {
  try {
    const { userId, amount, category, description, type } = req.body;
    const transaction = new Transaction({
      userId,
      amount,
      category,
      description,
      type,
    });
    await transaction.save();
    res.json({ message: 'Transaction Added', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error adding transaction', error });
  }
};

// Get All Transactions
const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
};

// Delete Transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    await Transaction.findByIdAndDelete(id);
    res.json({ message: 'Transaction Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting transaction', error });
  }
};

// Get Summary (total income, total expense)
const getSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting summary', error });
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  deleteTransaction,
  getSummary
};