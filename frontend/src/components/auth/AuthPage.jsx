import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Bot, ClipboardList, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'AI Requirement Analysis'
  },
  {
    icon: Bot,
    title: 'Multi-Agent Planning'
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics'
  }
];

export default function AuthPage({ login }) {
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Project Manager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const showToast = (message, type = 'info') => {
    window.dispatchEvent(new CustomEvent('pm-toast', { detail: { message, type } }));
  };

  async function submit(e) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = mode === 'login' ? { email, password } : { name, email, password, role };
      const { data } = await axios.post(API + url, body);
      const token = data?.data?.token || data?.token || data?.accessToken || data?.access_token;
      const userObj = data?.data?.user || data?.user || { name: name || 'User', email, role };
      login(token, userObj);
      showToast(mode === 'login' ? 'Welcome back' : 'Account created successfully', 'info');
      nav('/workspace');
    } catch (err) {
      let errorMsg = err.response?.data?.message || err.message;
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        errorMsg = 'Backend server is not running. Please try again later.';
      } else if (err.response?.status === 401 || String(errorMsg).toLowerCase().includes('invalid')) {
        errorMsg = 'Invalid email or password.';
      } else if (String(errorMsg).toLowerCase().includes('mongo') || String(errorMsg).toLowerCase().includes('database')) {
        errorMsg = 'Database is not connected. Please contact your administrator.';
      }
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" aria-hidden="true" />
      <div className="auth-glow auth-glow-a" aria-hidden="true" />
      <div className="auth-glow auth-glow-b" aria-hidden="true" />

      <div className="auth-layout">
        <motion.section
          className="auth-hero"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="auth-logo-mark">
            <Sparkles size={28} />
          </div>
          <h1 className="auth-title">
            <span className="auth-title-gradient">AI-Powered</span>
            <span>Project Management Copilot</span>
          </h1>
          <p className="auth-subtitle">
            Convert client requirements into tasks, timelines, risks, team allocation, reports, and dashboards using AI agents.
          </p>
          <div className="auth-feature-grid">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="auth-feature-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                >
                  <div className="auth-feature-icon">
                    <Icon size={20} />
                  </div>
                  <div className="auth-feature-title">{feature.title}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="auth-card glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="auth-alert" role="alert">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={submit}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <label className="auth-field">
                <span>Name</span>
                <input
                  className="input"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Role</span>
                <select className="input" value={role} onChange={e => setRole(e.target.value)} required>
                  <option>Admin</option>
                  <option>Project Manager</option>
                  <option>Developer</option>
                  <option>Viewer</option>
                </select>
              </label>
              <button type="submit" className="btn auth-submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </motion.section>
      </div>
    </div>
  );
}
