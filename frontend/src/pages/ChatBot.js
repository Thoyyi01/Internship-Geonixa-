import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../api';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hello! I'm your Finance Assistant AI. Ask me anything about your spending!",
      suggestions: [
        "How much did I spend this month?",
        "Which category is highest?",
        "How can I save more?",
        "What is my balance?",
        "Show my expense breakdown",
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const navigate = useNavigate();
  const bottomRef = useRef(null);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async () => {
    try {
      const [txRes, sumRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/transactions/${userId}`),
        axios.get(`${BASE_URL}/api/transactions/summary/${userId}`)
      ]);
      setTransactions(txRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // NLP engine — keyword matching against financial data
  const processQuery = (query) => {
    const q = query.toLowerCase().trim();
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');

    // Category map
    const categoryMap = {};
    expenses.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    // --- INTENT: Balance ---
    if (q.includes('balance') || q.includes('left') || q.includes('remaining') || q.includes('how much do i have')) {
      return {
        text: `Your current balance is ₹${summary.balance.toLocaleString()}.\n\nTotal Income: ₹${summary.totalIncome.toLocaleString()}\nTotal Expense: ₹${summary.totalExpense.toLocaleString()}\nNet Balance: ₹${summary.balance.toLocaleString()}`,
        type: 'info'
      };
    }

    // --- INTENT: Total spending ---
    if (q.includes('spend') || q.includes('spent') || q.includes('expense') || q.includes('total expense')) {
      if (transactions.length === 0) {
        return { text: "You have no expenses recorded yet. Add some transactions from the Dashboard!", type: 'info' };
      }
      const lines = sortedCategories.map(([cat, amt]) =>
        `• ${cat}: ₹${amt.toLocaleString()}`
      ).join('\n');
      return {
        text: `You have spent a total of ₹${summary.totalExpense.toLocaleString()} across ${expenses.length} transactions:\n\n${lines}`,
        type: 'chart',
        chartData: buildPieData(categoryMap)
      };
    }

    // --- INTENT: Highest category ---
    if (q.includes('highest') || q.includes('most') || q.includes('largest') || q.includes('top category') || q.includes('biggest')) {
      if (sortedCategories.length === 0) return { text: "No expense categories found yet.", type: 'info' };
      const [topCat, topAmt] = sortedCategories[0];
      const pct = ((topAmt / summary.totalExpense) * 100).toFixed(1);
      return {
        text: `Your highest spending category is "${topCat}" at ₹${topAmt.toLocaleString()}, which is ${pct}% of your total expenses.\n\nTop 3 categories:\n${sortedCategories.slice(0, 3).map(([c, a], i) => `${i + 1}. ${c} — ₹${a.toLocaleString()}`).join('\n')}`,
        type: 'chart',
        chartData: buildPieData(categoryMap)
      };
    }

    // --- INTENT: Income ---
    if (q.includes('income') || q.includes('earn') || q.includes('salary') || q.includes('how much did i earn')) {
      if (income.length === 0) return { text: "No income transactions found. Add your income from the Dashboard!", type: 'info' };
      const incomeList = income.map(t => `• ${t.category}: ₹${t.amount.toLocaleString()}`).join('\n');
      return {
        text: `Your total income is ₹${summary.totalIncome.toLocaleString()} from ${income.length} transaction(s):\n\n${incomeList}`,
        type: 'success'
      };
    }

    // --- INTENT: Save more / savings advice ---
    if (q.includes('save') || q.includes('saving') || q.includes('reduce') || q.includes('cut') || q.includes('advice') || q.includes('suggest') || q.includes('tip')) {
      const suggestions = [];
      if (summary.totalExpense === 0) {
        return { text: "Add some transactions first, then I can give you personalized savings tips!", type: 'info' };
      }
      sortedCategories.forEach(([cat, amt]) => {
        const pct = (amt / summary.totalExpense) * 100;
        if (pct > 40) suggestions.push(`⚠️ ${cat} takes up ${pct.toFixed(0)}% of your budget. Try reducing it by 10-15%.`);
        if (cat.toLowerCase() === 'food' && amt > 8000) suggestions.push(`🍔 Food spending of ₹${amt.toLocaleString()} is high. Try meal prepping to save ₹2,000-3,000/month.`);
        if (cat.toLowerCase() === 'shopping' && amt > 5000) suggestions.push(`🛍️ Shopping at ₹${amt.toLocaleString()} — try a 30-day no-shopping challenge to reset habits.`);
        if (cat.toLowerCase() === 'entertainment' && amt > 3000) suggestions.push(`🎬 Entertainment at ₹${amt.toLocaleString()} — consider cheaper alternatives like free streaming.`);
        if (cat.toLowerCase() === 'travel' && amt > 5000) suggestions.push(`🚗 Travel spending of ₹${amt.toLocaleString()} — carpooling or public transport could save ₹1,500+/month.`);
      });
      if (summary.balance > 0) suggestions.push(`✅ You're saving ₹${summary.balance.toLocaleString()} this month. Try investing 20% of it in a SIP or FD.`);
      if (suggestions.length === 0) suggestions.push("✅ Your spending looks balanced! Keep tracking expenses and aim to save at least 20% of your income.");
      return {
        text: `Here are your personalized savings suggestions:\n\n${suggestions.join('\n\n')}`,
        type: 'success'
      };
    }

    // --- INTENT: Show breakdown / pie chart ---
    if (q.includes('breakdown') || q.includes('chart') || q.includes('category') || q.includes('categories') || q.includes('show') || q.includes('distribution')) {
      if (expenses.length === 0) return { text: "No expense data to show. Add transactions from the Dashboard!", type: 'info' };
      const lines = sortedCategories.map(([cat, amt]) => {
        const pct = ((amt / summary.totalExpense) * 100).toFixed(1);
        return `• ${cat}: ₹${amt.toLocaleString()} (${pct}%)`;
      }).join('\n');
      return {
        text: `Here's your expense breakdown:\n\n${lines}`,
        type: 'chart',
        chartData: buildPieData(categoryMap)
      };
    }

    // --- INTENT: Transactions count / list ---
    if (q.includes('transaction') || q.includes('history') || q.includes('list') || q.includes('recent')) {
      if (transactions.length === 0) return { text: "No transactions found. Start adding from the Dashboard!", type: 'info' };
      const recent = transactions.slice(-5).reverse();
      const lines = recent.map(t =>
        `• ${t.category} — ${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString()} (${t.description || 'No description'})`
      ).join('\n');
      return {
        text: `You have ${transactions.length} total transaction(s). Here are your 5 most recent:\n\n${lines}`,
        type: 'info'
      };
    }

    // --- INTENT: Specific category query ---
    const allCategories = [...new Set(transactions.map(t => t.category.toLowerCase()))];
    for (const cat of allCategories) {
      if (q.includes(cat)) {
        const catTx = transactions.filter(t => t.category.toLowerCase() === cat);
        const total = catTx.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0);
        return {
          text: `Category "${catTx[0].category}" summary:\n\n• Total transactions: ${catTx.length}\n• Total amount: ₹${Math.abs(total).toLocaleString()}\n• Latest: ₹${catTx[catTx.length - 1].amount.toLocaleString()} (${catTx[catTx.length - 1].description || 'No description'})`,
          type: 'info'
        };
      }
    }

    // --- INTENT: Budget ---
    if (q.includes('budget')) {
      const budgets = JSON.parse(localStorage.getItem('budgets') || '{}');
      if (Object.keys(budgets).length === 0) return { text: "You haven't set any budgets yet. Go to the Budget page to set limits!", type: 'info' };
      const lines = Object.entries(budgets).map(([cat, limit]) => {
        const spent = categoryMap[cat] || 0;
        const status = spent > limit ? '🔴 Exceeded' : spent > limit * 0.8 ? '🟠 Warning' : '🟢 Good';
        return `• ${cat}: Spent ₹${spent.toLocaleString()} of ₹${limit.toLocaleString()} — ${status}`;
      }).join('\n');
      return { text: `Your budget status:\n\n${lines}`, type: 'info' };
    }

    // --- INTENT: Greetings ---
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('good morning') || q.includes('good evening')) {
      return {
        text: `Hello! 👋 I'm your AI Finance Assistant. I can help you with:\n\n• Spending analysis\n• Category breakdown\n• Savings suggestions\n• Budget status\n• Income summary\n\nWhat would you like to know?`,
        type: 'info',
        suggestions: [
          "How much did I spend this month?",
          "Which category is highest?",
          "How can I save more?",
          "Show my expense breakdown",
        ]
      };
    }

    // --- INTENT: Help ---
    if (q.includes('help') || q.includes('what can you') || q.includes('commands')) {
      return {
        text: `I can answer these types of questions:\n\n💰 "What is my balance?"\n💸 "How much did I spend this month?"\n📊 "Show my expense breakdown"\n🏆 "Which category is highest?"\n💡 "How can I save more?"\n💼 "What is my total income?"\n📋 "Show recent transactions"\n🎯 "What is my food budget status?"`,
        type: 'info',
        suggestions: [
          "What is my balance?",
          "Show my expense breakdown",
          "How can I save more?",
          "Show recent transactions",
        ]
      };
    }

    // --- DEFAULT ---
    return {
      text: `I didn't quite understand that. Try asking:\n\n• "How much did I spend?"\n• "Which category is highest?"\n• "How can I save more?"\n• "What is my balance?"\n• "Show my expense breakdown"\n\nOr type "help" to see all commands.`,
      type: 'default',
      suggestions: [
        "How much did I spend?",
        "What is my balance?",
        "How can I save more?",
      ]
    };
  };

  const buildPieData = (categoryMap) => ({
    labels: Object.keys(categoryMap),
    datasets: [{
      data: Object.values(categoryMap),
      backgroundColor: [
        'hsl(265, 85%, 60%)',
        'hsl(355, 85%, 55%)',
        'hsl(145, 80%, 45%)',
        'hsl(35, 95%, 50%)',
        'hsl(190, 90%, 50%)',
        '#d946ef',
        '#00BCD4',
        '#FF5722'
      ],
      borderWidth: 1,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    }]
  });

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);

    await fetchData(); // always fresh data
    setTimeout(() => {
      const response = processQuery(query);
      setMessages(prev => [...prev, { role: 'bot', ...response }]);
      setLoading(false);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
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
          <button style={styles.navBtn} onClick={() => navigate('/budget')}>📊 Budget</button>
          <button style={styles.navBtn} onClick={() => navigate('/reports')}>📈 Reports</button>
          <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
        </div>
      </div>

      <div style={styles.chatWrapper} className="chat-wrapper-mobile">
        {/* Sidebar */}
        <div style={styles.sidebar} className="glass-panel sidebar-mobile">
          <div style={styles.sidebarTitle}>💡 Try asking</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {[
              "How much did I spend?",
              "Which category is highest?",
              "How can I save more?",
              "What is my balance?",
              "Show my expense breakdown",
              "What is my total income?",
              "Show recent transactions",
              "What is my budget status?",
            ].map((q, i) => (
              <button key={i} className="sidebar-btn-hover" style={styles.sidebarBtn} onClick={() => sendMessage(q)}>
                {q}
              </button>
            ))}
          </div>

          {/* Summary card */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryTitle}>📊 Quick Stats</div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Income</span>
              <span style={{ ...styles.summaryVal, color: 'var(--success)', textShadow: '0 0 8px var(--success-glow)' }}>₹{summary.totalIncome.toLocaleString()}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Expense</span>
              <span style={{ ...styles.summaryVal, color: 'var(--danger)', textShadow: '0 0 8px var(--danger-glow)' }}>₹{summary.totalExpense.toLocaleString()}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Balance</span>
              <span style={{ ...styles.summaryVal, color: 'var(--primary)', textShadow: '0 0 8px var(--primary-glow)' }}>₹{summary.balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={styles.chatArea} className="glass-panel chat-area-mobile">
          <div style={styles.messageList}>
            {messages.map((msg, idx) => (
              <div key={idx} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ ...styles.msgRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'bot' && (
                    <div style={styles.avatar}>🤖</div>
                  )}
                  <div style={{
                    ...styles.bubble,
                    ...(msg.role === 'user' ? styles.userBubble : styles.botBubble)
                  }}>
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: line === '' ? '6px 0' : '2px 0', fontSize: '14px', lineHeight: '1.6' }}>{line}</p>
                    ))}

                    {/* Pie chart if provided */}
                    {msg.chartData && (
                      <div style={{ width: '220px', margin: '12px auto 0' }}>
                        <Pie data={msg.chartData} options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#1a1c29',
                                font: { family: 'Outfit', size: 11 }
                              }
                            },
                            tooltip: {
                              titleFont: { family: 'Outfit' },
                              bodyFont: { family: 'Outfit' }
                            }
                          }
                        }} />
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div style={styles.userAvatar}>👤</div>
                  )}
                </div>

                {/* Suggestion chips */}
                {msg.suggestions && (
                  <div style={styles.suggestions}>
                    {msg.suggestions.map((s, i) => (
                      <button key={i} className="chip-hover" style={styles.chip} onClick={() => sendMessage(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={styles.msgRow} className="animate-fade-in">
                <div style={styles.avatar}>🤖</div>
                <div style={styles.botBubble}>
                  <div style={styles.dots}>
                    <span style={{ ...styles.dot, animationDelay: '0s' }} />
                    <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                    <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={styles.inputBar}>
            <input
              className="glass-input"
              style={styles.input}
              placeholder="Ask me about your finances... (Press Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="send-btn-hover"
              style={{ ...styles.sendBtn, opacity: input.trim() ? 1 : 0.5 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              Send ➤
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
        
        .sidebar-btn-hover {
          transition: var(--transition) !important;
        }
        .sidebar-btn-hover:hover {
          background: var(--card-bg-hover) !important;
          border-color: var(--card-border-hover) !important;
          color: var(--text-primary) !important;
          transform: translateX(4px);
        }
        .chip-hover {
          transition: var(--transition) !important;
        }
        .chip-hover:hover {
          background: var(--primary) !important;
          color: #fff !important;
          border-color: var(--primary-hover) !important;
          box-shadow: 0 0 10px var(--primary-glow) !important;
          transform: translateY(-2px);
        }
        .send-btn-hover {
          transition: var(--transition) !important;
        }
        .send-btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px var(--primary-glow);
          filter: brightness(1.1);
        }
        
        @media (max-width: 768px) {
          .chat-wrapper-mobile {
            flex-direction: column !important;
            height: auto !important;
            gap: 16px !important;
            padding: 16px !important;
          }
          .sidebar-mobile {
            width: 100% !important;
            height: auto !important;
          }
          .chat-area-mobile {
            height: 500px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  
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
  
  chatWrapper: {
    display: 'flex',
    flex: 1,
    gap: '24px',
    height: 'calc(100vh - 74px)',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  
  sidebar: {
    width: '280px',
    background: 'var(--sidebar-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'hidden',
    flexShrink: 0,
    height: '100%',
  },
  
  sidebarTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    borderBottom: '1px solid var(--header-border)',
    paddingBottom: '8px'
  },
  
  sidebarBtn: {
    background: 'var(--nav-btn-bg)',
    border: '1px solid var(--nav-btn-border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    textAlign: 'left',
    lineHeight: '1.4',
    fontFamily: 'inherit',
  },
  
  summaryCard: {
    marginTop: 'auto',
    background: 'var(--tx-item-bg)',
    border: '1px solid var(--tx-item-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px'
  },
  
  summaryTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '12px',
    borderBottom: '1px solid var(--header-border)',
    paddingBottom: '6px'
  },
  
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0'
  },
  
  summaryLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  
  summaryVal: {
    fontSize: '14px',
    fontWeight: '700'
  },
  
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--card-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--card-border)',
    borderRadius: 'var(--radius-lg)',
    height: '100%',
  },
  
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px'
  },
  
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), #8a3ffc)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
    boxShadow: '0 0 10px rgba(138, 63, 252, 0.4)'
  },
  
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0
  },
  
  bubble: {
    maxWidth: '70%',
    padding: '14px 18px',
    wordBreak: 'break-word',
    boxSizing: 'border-box',
  },
  
  botBubble: {
    background: 'var(--card-bg-hover)',
    border: '1px solid var(--card-border)',
    borderRadius: '16px 16px 16px 0px',
    color: 'var(--text-primary)',
  },
  
  userBubble: {
    background: 'linear-gradient(135deg, var(--primary), #8a3ffc)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px 16px 0px 16px',
    boxShadow: '0 4px 15px var(--primary-glow)',
  },
  
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginLeft: '46px',
    marginTop: '6px',
  },
  
  chip: {
    background: 'var(--nav-btn-bg)',
    border: '1px solid var(--nav-btn-border)',
    borderRadius: '99px',
    padding: '6px 14px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  
  inputBar: {
    padding: '16px 24px',
    background: 'var(--header-bg)',
    borderTop: '1px solid var(--header-border)',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  
  input: {
    flex: 1,
    borderRadius: '99px',
    paddingRight: '20px',
  },
  
  sendBtn: {
    background: 'linear-gradient(135deg, var(--primary), #8a3ffc)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '99px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  
  dots: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
    padding: '4px 0'
  },
  
  dot: {
    width: '8px',
    height: '8px',
    background: 'var(--primary)',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite ease-in-out',
    boxShadow: '0 0 8px var(--primary-glow)'
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

export default Chatbot;