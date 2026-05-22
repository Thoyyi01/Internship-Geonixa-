import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../api';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  console.log("BASE_URL:", BASE_URL);
  console.log("FORM DATA:", form);

  try {
    const res = await axios.post(
      `${BASE_URL}/api/auth/login`,
      form
    );

    console.log("LOGIN RESPONSE:", res.data);

    localStorage.setItem('userId', res.data.userId);
    localStorage.setItem('userName', res.data.name || '');

    navigate('/dashboard');

  } catch (error) {

    console.log("LOGIN ERROR:", error);
    console.log("ERROR RESPONSE:", error.response);

    setMessage(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Login failed'
    );
  }
};

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in glow-pulse" style={styles.card}>
        <h2 style={styles.title}>💰 Finance Assistant</h2>
        <h3 style={styles.subtitle}>Welcome Back</h3>
        {message && <p style={styles.message}>{message}</p>}
        
        <div style={styles.formGroup}>
          <input className="glass-input" type="email" name="email"
            placeholder="Email Address" onChange={handleChange} style={styles.inputWidth} />
          <input className="glass-input" type="password" name="password"
            placeholder="Password" onChange={handleChange} style={styles.inputWidth} />
        </div>

        <button className="premium-btn" onClick={handleSubmit} style={styles.buttonWidth}>
          Sign In
        </button>

        <p style={styles.link}>
          Don't have an account?{' '}
          <span style={styles.linkText} onClick={() => navigate('/register')}>
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    padding: '40px 32px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  title: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, #ffffff 30%, var(--text-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.03em'
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    margin: '-8px 0 0 0',
    fontWeight: 400,
    fontSize: '14px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  inputWidth: {
    width: '100%'
  },
  buttonWidth: {
    width: '100%',
    marginTop: '8px'
  },
  message: {
    color: 'var(--danger)',
    textAlign: 'center',
    margin: 0,
    fontSize: '14px',
    background: 'var(--danger-bg)',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid hsla(355, 85%, 55%, 0.1)'
  },
  link: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    margin: 0,
    fontSize: '14px'
  },
  linkText: {
    color: 'var(--primary)',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'underline',
    transition: 'color 0.2s',
    marginLeft: '4px'
  },
};

export default Login;