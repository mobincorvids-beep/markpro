import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data || res.data.user || res.data);
    } catch {
      ['accessToken','refreshToken','token'].forEach(k => localStorage.removeItem(k));
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const d   = res.data.data || res.data;
    const at  = d.accessToken || d.token;
    localStorage.setItem('accessToken', at);
    localStorage.setItem('token', at);
    if (d.refreshToken) localStorage.setItem('refreshToken', d.refreshToken);
    setUser(d.user);
    return d.user;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const d   = res.data.data || res.data;
    const at  = d.accessToken || d.token;
    localStorage.setItem('accessToken', at);
    localStorage.setItem('token', at);
    if (d.refreshToken) localStorage.setItem('refreshToken', d.refreshToken);
    setUser(d.user);
    return d.user;
  };

  /** Signs in with a provider identity token that the server verifies. */
  const socialLogin = async (provider, credential, name) => {
    const res = await api.post(`/auth/social/${provider}`, { credential, name });
    const d   = res.data.data || res.data;
    const at  = d.accessToken || d.token;
    localStorage.setItem('accessToken', at);
    localStorage.setItem('token', at);
    if (d.refreshToken) localStorage.setItem('refreshToken', d.refreshToken);
    setUser(d.user);
    return d.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    ['accessToken','refreshToken','token'].forEach(k => localStorage.removeItem(k));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, socialLogin, logout, refreshUser: fetchMe, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
export default AuthContext;
