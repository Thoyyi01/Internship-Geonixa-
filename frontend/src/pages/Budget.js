import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../api';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function Budget() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [newBudget, setNewBudget] = useState({ category: '', limit: '' });
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
    fetchTransactions();
    fetchUserProfile();
    const saved = localStorage.getItem('budgets');
    if (saved) setBudgets(JSON.parse(saved));
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

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/transactions/${userId}`);
      setTransactions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const saveBudget = () => {
    if (!newBudget.category || !newBudget.limit) return alert('Fill both fields');
    const trimmed = newBudget.category.trim();
    if (!trimmed) return alert('Fill both fields');
    const normalizedCategory = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    const updated = { ...budgets, [normalizedCategory]: Number(newBudget.limit) };
    setBudgets(updated);
    localStorage.setItem('budgets', JSON.stringify(updated));
    setNewBudget({ category: '', limit: '' });
  };

  const deleteBudget = (category) => {
    const updated = { ...budgets };
    delete updated[category];
    setBudgets(updated);
    localStorage.setItem('budgets', JSON.stringify(updated));
  };

  const getSpent = (category) =>
    transactions
      .filter(t => t.type === 'expense' && t.category && category && t.category.trim().toLowerCase() === category.trim().toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);

  // Category Icon helper matching standard names
  const getCategoryIcon = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('dining') || cat.includes('restaurant') || cat.includes('cafe')) return '🍔';
    if (cat.includes('shopping') || cat.includes('store') || cat.includes('clothes')) return '🛍️';
    if (cat.includes('transport') || cat.includes('travel') || cat.includes('cab') || cat.includes('lyft') || cat.includes('uber') || cat.includes('car')) return '🚗';
    if (cat.includes('health') || cat.includes('medical') || cat.includes('dental') || cat.includes('doctor') || cat.includes('gym') || cat.includes('fitness')) return '🏥';
    if (cat.includes('utility') || cat.includes('bill') || cat.includes('electricity') || cat.includes('verizon') || cat.includes('phone') || cat.includes('internet') || cat.includes('bills')) return '⚡';
    if (cat.includes('salary') || cat.includes('income') || cat.includes('earn')) return '💰';
    if (cat.includes('education') || cat.includes('school') || cat.includes('book')) return '📚';
    if (cat.includes('entertainment') || cat.includes('movie') || cat.includes('game')) return '🎬';
    if (cat.includes('house') || cat.includes('housing') || cat.includes('rent') || cat.includes('home')) return '🏠';
    return '💸';
  };

  // Spend Category Distribution calculations
  const categoryMap = {};
  transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
    const trimmedCat = t.category.trim();
    if (trimmedCat) {
      const cat = trimmedCat.charAt(0).toUpperCase() + trimmedCat.slice(1).toLowerCase();
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
    }
  });

  const totalSpent = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);
  const hasExpenses = totalSpent > 0;

  // Visual doughnut fallbacks ONLY if user has absolutely no transactions in their account
  const displayCategoryMap = hasExpenses ? categoryMap : {
    'Food & Dining': 138.60,
    'Housing': 1919.98,
    'Utilities & Bills': 306.48,
    'Entertainment': 161.20,
    'Health & Fitness': 724.51
  };

  const displayTotalSpent = Object.values(displayCategoryMap).reduce((sum, val) => sum + val, 0);

  const doughnutData = {
    labels: Object.keys(displayCategoryMap),
    datasets: [
      {
        data: Object.values(displayCategoryMap),
        backgroundColor: [
          '#ff3b6b', // Food & Dining
          '#3b82f6', // Housing
          '#10b981', // Utilities & Bills
          '#f59e0b', // Entertainment
          '#8b5cf6', // Health & Fitness
          '#ec4899',
          '#06b6d4'
        ],
        borderWidth: 0,
        hoverOffset: 4,
        cutout: '75%',
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        titleFont: { family: 'Outfit', size: 13 },
        bodyFont: { family: 'Outfit', size: 12 },
        callbacks: {
          label: (context) => ` ${context.label}: ₹${context.raw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        }
      }
    }
  };

  // Strictly dynamic active warnings from real user budgets
  const activeWarnings = [];
  Object.entries(budgets).forEach(([category, limit]) => {
    const spent = getSpent(category);
    if (spent > limit) {
      activeWarnings.push({
        category,
        exceededAmount: spent - limit
      });
    }
  });

  const hasBudgets = Object.keys(budgets).length > 0;

  return (
    <div style={styles.container}>
      {/* Navbar Header */}
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
          <button style={styles.navBtn} onClick={() => navigate('/dashboard')}>🏠 Dashboard</button>
          <button style={styles.navBtn} onClick={() => navigate('/chatbot')}>🤖 AI Chat</button>
          <button style={styles.navBtn} onClick={() => navigate('/reports')}>📈 Reports</button>
          <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
        </div>
      </div>

      <div style={styles.content} className="animate-fade-in">
        <h2 style={styles.pageTitle}>📊 Budget Manager</h2>

        {/* Set Monthly Budget Section */}
        <div style={styles.card} className="glass-panel">
          <h3 style={styles.cardTitle}>Set Monthly Budget</h3>
          <div style={styles.formRow}>
            <input className="glass-input" placeholder="Category (Food, Housing...)"
              value={newBudget.category}
              style={{ flex: 1, minWidth: '160px' }}
              onChange={e => setNewBudget({ ...newBudget, category: e.target.value })} />
            <input className="glass-input" placeholder="Monthly Limit (₹)"
              type="number" value={newBudget.limit}
              style={{ flex: 1, minWidth: '160px' }}
              onChange={e => setNewBudget({ ...newBudget, limit: e.target.value })} />
            <button className="premium-btn" onClick={saveBudget}>Set Budget</button>
          </div>
        </div>

        {/* Top section: Doughnut Distribution & Warnings */}
        <div style={styles.topRow} className="budget-top-row">
          {/* Spend Category Distribution Card */}
          <div style={styles.chartCard} className="glass-panel">
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitleNoBorder}>Spend Category Distribution</h3>
              <span style={styles.cardSubtitle}>Aggregated Purchases</span>
            </div>
            
            <div style={styles.chartContainer}>
              <div style={styles.doughnutWrapper}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div style={styles.doughnutCenterText}>
                  <span style={styles.doughnutCenterLabel}>TOTAL SPENT</span>
                  <span style={styles.doughnutCenterValue}>
                    ₹{displayTotalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Allocation Warnings Card */}
          <div style={styles.warningsCard} className="glass-panel">
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitleNoBorder}>Budget Allocation Warnings</h3>
            </div>

            <div style={styles.warningsList}>
              {!hasBudgets ? (
                <div style={styles.infoBox}>
                  <span style={styles.infoIcon}>ℹ️</span>
                  <div>
                    <h4 style={styles.infoTitle}>No Budgets Set Yet</h4>
                    <p style={styles.infoText}>Set a monthly limit above to track your spending caps and see alerts.</p>
                  </div>
                </div>
              ) : activeWarnings.length === 0 ? (
                <div style={styles.successBox}>
                  <span style={styles.successIcon}>✅</span>
                  <div>
                    <h4 style={styles.successTitle}>All Budgets on Track</h4>
                    <p style={styles.successText}>Excellent! Spends across all defined categories are within your set limits.</p>
                  </div>
                </div>
              ) : (
                activeWarnings.map((warn, i) => (
                  <div key={i} style={styles.warningItem} className="warning-item-hover">
                    <div style={styles.warningLeft}>
                      <span style={styles.warningIcon}>⚠️</span>
                      <span style={styles.warningAlertText}>Overspending alert!</span>
                    </div>
                    <div style={styles.warningMiddle}>
                      Your outgoings in <strong style={{ color: 'var(--text-primary)' }}>{warn.category}</strong>
                    </div>
                    <div style={styles.warningRight}>
                      have exceeded your cap limit by <strong style={{ color: '#ff3b6b' }}>₹{warn.exceededAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> .
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Category Envelope Planners */}
        <div style={{ marginTop: '36px' }}>
          <h2 style={styles.sectionTitle}>Category Envelope Planners</h2>
          
          {!hasBudgets ? (
            <div style={styles.emptyCard} className="glass-panel">
              <p style={{ fontSize: '48px', margin: '0 0 16px', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>📭</p>
              <h4 style={styles.emptyText}>No Budgets Set Yet</h4>
              <p style={styles.emptySubText}>Set a monthly limit in the form above to start tracking your category envelopes.</p>
            </div>
          ) : (
            <div style={styles.plannersGrid} className="planners-grid">
              {Object.entries(budgets).map(([category, limit]) => {
                const spent = getSpent(category);
                const pct = Math.round((spent / limit) * 100);
                const isOver = spent > limit;
                const progressWidth = Math.min(pct, 100);
                const remaining = Math.max(limit - spent, 0);

                return (
                  <div key={category} style={styles.plannerCard} className="glass-panel planner-card-hover">
                    <div style={styles.plannerTop}>
                      <div style={styles.plannerLeft}>
                        <span style={styles.plannerIcon}>{getCategoryIcon(category)}</span>
                        <h4 style={styles.plannerCategoryName}>{category}</h4>
                      </div>
                      <div style={styles.plannerRight}>
                        <span style={styles.plannerAmountText}>
                          ₹{spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span style={styles.plannerLimitText}> of ₹{limit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      </div>
                    </div>

                    {/* Sleek Custom Progress Bar */}
                    <div style={styles.progressTrack}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${progressWidth}%`,
                        background: isOver ? '#ff3b6b' : '#3b82f6',
                        boxShadow: isOver ? '0 0 8px rgba(255, 59, 107, 0.4)' : '0 0 8px rgba(59, 130, 246, 0.4)'
                      }} />
                    </div>

                    <div style={styles.plannerFooter}>
                      <span style={styles.plannerFooterLeft}>{pct}% consumed</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={styles.plannerFooterRight}>
                          ₹{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining
                        </span>
                        <button style={styles.deleteBtn} className="delete-btn-hover" onClick={() => deleteBudget(category)} title="Delete Budget">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .warning-item-hover {
          transition: var(--transition) !important;
        }
        .warning-item-hover:hover {
          background: rgba(255, 55, 95, 0.05) !important;
          transform: translateY(-1px);
        }
        .planner-card-hover {
          transition: var(--transition) !important;
        }
        .planner-card-hover:hover {
          transform: translateY(-2px);
          background: var(--card-bg-hover) !important;
          border-color: var(--card-border-hover) !important;
        }
        .delete-btn-hover {
          transition: var(--transition) !important;
        }
        .delete-btn-hover:hover {
          color: var(--danger) !important;
          background: rgba(255, 55, 95, 0.1) !important;
          border-color: hsla(355, 85%, 55%, 0.3) !important;
        }
        @media (max-width: 992px) {
          .budget-top-row {
            flex-direction: column !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 576px) {
          .planners-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'transparent', paddingBottom: '40px' },
  
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
  
  content: { maxWidth: '1200px', margin: '0 auto', padding: '24px' },
  
  pageTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '24px',
    letterSpacing: '-0.02em'
  },
  
  card: { padding: '24px', marginBottom: '24px' },
  
  cardTitle: {
    margin: '0 0 20px',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    borderBottom: '1px solid var(--header-border)',
    paddingBottom: '12px'
  },

  cardTitleNoBorder: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em'
  },

  cardSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  
  formRow: { display: 'flex', gap: '14px', flexWrap: 'wrap' },

  topRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    width: '100%'
  },

  chartCard: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '440px'
  },

  warningsCard: {
    flex: 1.1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '440px'
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '28px'
  },

  chartContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: '260px'
  },

  doughnutWrapper: {
    position: 'relative',
    width: '260px',
    height: '260px'
  },

  doughnutCenterText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },

  doughnutCenterLabel: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: '4px'
  },

  doughnutCenterValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em'
  },

  warningsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflowY: 'auto',
    flex: 1
  },

  warningItem: {
    background: 'rgba(255, 55, 95, 0.02)',
    border: '1px solid var(--tx-item-border)',
    borderLeft: '4px solid #ff3b6b',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },

  warningLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  warningIcon: {
    fontSize: '16px'
  },

  warningAlertText: {
    fontWeight: '700',
    fontSize: '13.5px',
    color: '#ff3b6b'
  },

  warningMiddle: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)'
  },

  warningRight: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    textAlign: 'right'
  },

  sectionTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '20px',
    letterSpacing: '-0.02em'
  },

  plannersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
    gap: '20px'
  },

  plannerCard: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '140px'
  },

  plannerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },

  plannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  plannerIcon: {
    fontSize: '20px'
  },

  plannerCategoryName: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em'
  },

  plannerRight: {
    textAlign: 'right'
  },

  plannerAmountText: {
    fontSize: '14.5px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },

  plannerLimitText: {
    color: 'var(--text-muted)',
    fontSize: '13.5px',
    fontWeight: '500'
  },

  progressTrack: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '99px',
    height: '8px',
    marginBottom: '16px',
    width: '100%',
    overflow: 'hidden'
  },

  progressFill: {
    height: '100%',
    borderRadius: '99px',
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
  },

  plannerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  plannerFooterLeft: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },

  plannerFooterRight: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },

  deleteBtn: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '3px 7px',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  infoBox: {
    background: 'rgba(59, 130, 246, 0.02)',
    border: '1px solid rgba(59, 130, 246, 0.08)',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '10px'
  },
  infoIcon: {
    fontSize: '24px'
  },
  infoTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  infoText: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },

  successBox: {
    background: 'rgba(16, 185, 129, 0.02)',
    border: '1px solid rgba(16, 185, 129, 0.08)',
    borderLeft: '4px solid #10b981',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '10px'
  },
  successIcon: {
    fontSize: '24px'
  },
  successTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  successText: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },

  emptyCard: {
    padding: '48px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px'
  },
  emptyText: {
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 8px'
  },
  emptySubText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    margin: 0
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

export default Budget;