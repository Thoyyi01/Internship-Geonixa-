import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../api';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0
  });

  const [transactions, setTransactions] = useState([]);

  const [form, setForm] = useState({
    amount: '',
    category: '',
    description: '',
    type: 'expense'
  });

  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || 'user123';
  const [userName, setUserName] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    fetchData();
    fetchUserProfile();
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const cachedName = localStorage.getItem('userName');
      if (cachedName && cachedName !== 'User' && cachedName !== 'Loading...') {
        setUserName(cachedName);
      } else {
        const res = await axios.get(`${BASE_URL}/api/auth/${userId}`);
        const nameToUse = res.data.name || 'User';
        setUserName(nameToUse);
        localStorage.setItem('userName', nameToUse);
      }
    } catch (error) {
      console.error('Error fetching profile', error);
      setUserName('User');
    }
  };

  const fetchData = async () => {
    try {
      const [summaryRes, txRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/transactions/summary/${userId}`),
        axios.get(`${BASE_URL}/api/transactions/${userId}`)
      ]);

      setSummary(summaryRes.data);
      setTransactions(txRes.data);

    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async () => {
    if (!form.amount || !form.category) {
      return alert('Please fill amount and category');
    }

    try {
      await axios.post(`${BASE_URL}/api/transactions`, {
        ...form,
        userId,
        amount: Number(form.amount)
      });

      setForm({
        amount: '',
        category: '',
        description: '',
        type: 'expense'
      });

      fetchData();

    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/transactions/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // Expense Transactions
  const expenseTransactions = transactions.filter(
    (t) => t.type === 'expense'
  );

  // Category Wise Expense
  const categoryMap = {};

  expenseTransactions.forEach((t) => {
    categoryMap[t.category] =
      (categoryMap[t.category] || 0) + t.amount;
  });

  // Pie Chart Data
  const pieData = {
    labels: Object.keys(categoryMap),
    datasets: [
      {
        data: Object.values(categoryMap),
        backgroundColor: [
          'hsl(265, 85%, 60%)',
          'hsl(355, 85%, 55%)',
          'hsl(145, 80%, 45%)',
          'hsl(35, 95%, 50%)',
          'hsl(190, 90%, 50%)',
          '#d946ef'
        ],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)'
      }
    ]
  };

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={styles.headerTitle}>💰 Finance Assistant</h2>
          <div style={styles.headerDivider} />
          <div style={styles.profileCard}>
            <div style={styles.profileAvatar}>{getUserInitials(userName)}</div>
            <div style={styles.profileInfo}>
              <span style={styles.profileName}>{userName || 'Loading...'}</span>
              <span style={styles.profileTier}>MEMBER TIER 1</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

          <button
            style={styles.themeBtn}
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            style={styles.navBtn}
            onClick={() => navigate('/chatbot')}
          >
            🤖 AI Chat
          </button>

          <button
            style={styles.navBtn}
            onClick={() => navigate('/budget')}
          >
            📊 Budget
          </button>

          <button
            style={styles.navBtn}
            onClick={() => navigate('/reports')}
          >
            📈 Reports
          </button>

          <button
            style={styles.logoutBtn}
            onClick={() => {
              localStorage.clear();
              navigate('/');
            }}
          >
            Logout
          </button>

        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={styles.mainContent} className="animate-fade-in">
        
        {/* SUMMARY CARDS */}
        <div style={styles.summaryGrid}>

          <div
            style={styles.summaryCardSuccess}
            className="glass-panel"
          >
            <p style={styles.cardLabel}>Total Income</p>
            <p style={styles.cardValueSuccess}>
              ₹{summary.totalIncome.toLocaleString()}
            </p>
          </div>

          <div
            style={styles.summaryCardDanger}
            className="glass-panel"
          >
            <p style={styles.cardLabel}>Total Expense</p>
            <p style={styles.cardValueDanger}>
              ₹{summary.totalExpense.toLocaleString()}
            </p>
          </div>

          <div
            style={styles.summaryCardPrimary}
            className="glass-panel"
          >
            <p style={styles.cardLabel}>Net Balance</p>
            <p style={styles.cardValuePrimary}>
              ₹{summary.balance.toLocaleString()}
            </p>
          </div>

        </div>

        {/* CHART + FORM */}
        <div style={styles.middleRow}>

          {/* PIE CHART */}
          <div style={styles.chartCard} className="glass-panel">
            <h3 style={styles.formTitle}>Expense Breakdown</h3>

            {expenseTransactions.length === 0 ? (
              <p style={styles.emptyText}>
                No expenses logged. Add transactions to see chart!
              </p>
            ) : (
              <div
                style={{
                  width: '100%',
                  maxWidth: '260px',
                  margin: '10px auto 0'
                }}
              >
                <Pie
                  data={pieData}
                  options={{
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: theme === 'dark' ? '#fff' : '#1a1c29',
                          font: {
                            family: 'Outfit',
                            size: 11
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* ADD TRANSACTION */}
          <div style={styles.formCard} className="glass-panel">
            <h3 style={styles.formTitle}>Add Transaction</h3>

            <div style={styles.formCol}>

              <input
                className="glass-input"
                placeholder="Amount (₹)"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value
                  })
                }
              />

              <input
                className="glass-input"
                placeholder="Category (Food, Travel...)"
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value
                  })
                }
              />

              <input
                className="glass-input"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value
                  })
                }
              />

              <select
                className="glass-input"
                style={{
                  ...styles.selectInput,
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='${theme === 'dark' ? 'white' : '%231a1c29'}' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`
                }}
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value
                  })
                }
              >
                <option value="expense" style={styles.optionStyle}>Expense</option>
                <option value="income" style={styles.optionStyle}>Income</option>
              </select>

              <button
                className="premium-btn"
                onClick={handleAdd}
                style={styles.addBtn}
              >
                + Add Transaction
              </button>

            </div>
          </div>

        </div>

        {/* TRANSACTIONS */}
        <div style={styles.listCard} className="glass-panel">
          <h3 style={styles.formTitle}>Recent Transactions</h3>

          {transactions.length === 0 ? (
            <p style={styles.emptyText}>
              No transactions yet. Add one above!
            </p>
          ) : (
            <div style={styles.txListContainer}>
              {transactions.map((tx) => (
                <div key={tx._id} style={styles.txItem}>

                  <div style={styles.txLeft}>

                    <span
                      style={{
                        ...styles.txDot,
                        background:
                          tx.type === 'income'
                            ? 'var(--success)'
                            : 'var(--danger)',
                        boxShadow:
                          tx.type === 'income'
                            ? '0 0 8px var(--success)'
                            : '0 0 8px var(--danger)'
                      }}
                    />

                    <div>
                      <p style={styles.txCategory}>
                        {tx.category}
                      </p>

                      <p style={styles.txDesc}>
                        {tx.description || 'No description'}
                      </p>
                    </div>

                  </div>

                  <div style={styles.txRight}>

                    <p
                      style={{
                        ...styles.txAmount,
                        color:
                          tx.type === 'income'
                            ? 'var(--success)'
                            : 'var(--danger)'
                      }}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      ₹{tx.amount.toLocaleString()}
                    </p>

                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(tx._id)}
                    >
                      🗑
                    </button>

                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'transparent',
    paddingBottom: '40px'
  },

  header: {
    background: 'var(--header-bg)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--header-border)',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },

  headerTitle: {
    background: 'var(--header-title-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '-0.02em'
  },

  navBtn: {
    background: 'var(--nav-btn-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--nav-btn-border)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },

  logoutBtn: {
    background: 'var(--logout-btn-bg)',
    color: 'var(--danger)',
    border: '1px solid var(--logout-btn-border)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },

  themeBtn: {
    background: 'var(--nav-btn-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--nav-btn-border)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.2s',
    padding: 0
  },

  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '24px'
  },

  summaryCardSuccess: {
    padding: '24px',
    borderLeft: '4px solid var(--success)',
    transition: 'transform 0.2s'
  },

  summaryCardDanger: {
    padding: '24px',
    borderLeft: '4px solid var(--danger)',
    transition: 'transform 0.2s'
  },

  summaryCardPrimary: {
    padding: '24px',
    borderLeft: '4px solid var(--primary)',
    transition: 'transform 0.2s'
  },

  cardLabel: {
    margin: 0,
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },

  cardValueSuccess: {
    margin: '12px 0 0',
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--success)',
    textShadow: '0 0 10px var(--success-glow)'
  },

  cardValueDanger: {
    margin: '12px 0 0',
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--danger)',
    textShadow: '0 0 10px var(--danger-glow)'
  },

  cardValuePrimary: {
    margin: '12px 0 0',
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--primary)',
    textShadow: '0 0 10px var(--primary-glow)'
  },

  middleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px'
  },

  chartCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column'
  },

  formCard: {
    padding: '24px',
  },

  formTitle: {
    margin: '0 0 20px',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    borderBottom: '1px solid var(--header-border)',
    paddingBottom: '12px'
  },

  formCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },

  selectInput: {
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '18px'
  },

  optionStyle: {
    background: 'var(--option-bg)',
    color: 'var(--option-color)'
  },

  addBtn: {
    width: '100%',
    marginTop: '6px'
  },

  listCard: {
    padding: '24px',
  },

  txListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  txItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    background: 'var(--tx-item-bg)',
    border: '1px solid var(--tx-item-border)',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.2s',
  },

  txLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  txDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0
  },

  txCategory: {
    margin: 0,
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '14px'
  },

  txDesc: {
    margin: '3px 0 0',
    color: 'var(--text-secondary)',
    fontSize: '12px'
  },

  txRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  txAmount: {
    margin: 0,
    fontWeight: '700',
    fontSize: '15px'
  },

  deleteBtn: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
    transition: 'all 0.2s'
  },

  emptyText: {
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: '14px'
  },

  headerDivider: {
    width: '1px',
    height: '24px',
    background: 'var(--header-divider)'
  },

  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  profileAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: '13px',
    boxShadow: '0 0 10px rgba(0, 198, 255, 0.2)'
  },

  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px'
  },

  profileName: {
    color: 'var(--text-primary)',
    fontSize: '13.5px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
    lineHeight: '1.2'
  },

  profileTier: {
    color: 'var(--text-muted)',
    fontSize: '9.5px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    lineHeight: '1.2'
  }
};

export default Dashboard;