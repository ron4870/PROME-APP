import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [needsChange, setNeedsChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState({ text: '', type: '' });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    const token = localStorage.getItem('token') || localStorage.getItem('jwtToken');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (redirectUrl && isAuthenticated && token) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      window.location.href = `${redirectUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        if (data.user.needsPasswordChange) {
          setNeedsChange(true);
        } else {
          setAuth(data.user, data.token);
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = params.get('redirect');
          if (redirectUrl) {
            const separator = redirectUrl.includes('?') ? '&' : '?';
            window.location.href = `${redirectUrl}${separator}token=${encodeURIComponent(data.token)}`;
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, oldPassword: password, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        // Automatically login after password change
        const loginRes = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: newPassword })
        });
        const loginData = await loginRes.json();
        
        if (loginRes.ok) {
          setAuth(loginData.user, loginData.token);
          const params = new URLSearchParams(window.location.search);
          const redirectUrl = params.get('redirect');
          if (redirectUrl) {
            const separator = redirectUrl.includes('?') ? '&' : '?';
            window.location.href = `${redirectUrl}${separator}token=${encodeURIComponent(loginData.token)}`;
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordMsg({ text: '', type: '' });
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok) {
        setForgotPasswordMsg({ text: 'A temporary password has been sent to your email.', type: 'success' });
      } else {
        setForgotPasswordMsg({ text: data.error || 'Unknown Email', type: 'error' });
      }
    } catch (err) {
      setForgotPasswordMsg({ text: 'Connection failed. Please try again.', type: 'error' });
    }
    setIsLoading(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '1rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        <div className="glass-panel">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}
            >
              <img src="/prome.png" alt="PROME Consultants Logo" style={{ height: '60px' }} />
            </motion.div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>PROME Portal</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {showForgotPassword 
                ? 'Reset your password' 
                : needsChange 
                  ? 'Action required to secure your account' 
                  : 'Sign in to access the intranet'}
            </p>
          </div>

          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group mb-6">
                <label className="form-label" htmlFor="reset-email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    id="reset-email"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {forgotPasswordMsg.text && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    style={{ 
                      marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', 
                      backgroundColor: forgotPasswordMsg.type === 'error' ? '#fee2e2' : '#dcfce3', 
                      color: forgotPasswordMsg.type === 'error' ? '#991b1b' : '#166534', 
                      fontSize: '0.875rem' 
                    }}
                  >
                    {forgotPasswordMsg.text}
                  </motion.div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary w-full mb-4"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Temporary Password'}
              </motion.button>
              
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : !needsChange ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-6">
                <label className="form-label" htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    id="password"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="text-error mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary w-full"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
              
              <div className="text-center" style={{ marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(true)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          ) : (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleChangePassword}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-6">
                <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="text-error mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary w-full"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Updating...</span>
                ) : (
                  <span>Update Password & Continue</span>
                )}
              </motion.button>
            </motion.form>
          )}

        </div>
      </motion.div>
    </div>
  );
}
