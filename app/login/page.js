'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [tab, setTab] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Look up the user's role in the users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', data.user.id)
      .single();

    const role = userData?.role;

    if (role === 'Platform Admin' || email === 'impactlearningbhs@gmail.com') {
      window.location.href = '/dashboard';
    } else if (role === 'Branch Admin') {
      window.location.href = '/branch';
    } else {
      // All other roles (Therapist, BHT, etc.) go to staff portal
      window.location.href = '/staff';
    }

    setLoading(false);
  };

  const tabs = [
    { id: 'admin', label: 'Platform Admin' },
    { id: 'branch', label: 'Branch Admin' },
    { id: 'staff', label: 'Staff' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#0D2035'}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">

        <div className="mb-4 flex justify-center">
          <img src="/ImpactWorkforce.png" alt="Impact Workforce" className="h-20" />
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg mb-6 p-1" style={{backgroundColor: '#F3F4F6'}}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 text-sm font-medium transition-colors rounded-md"
              style={{
                backgroundColor: tab === t.id ? 'white' : 'transparent',
                color: tab === t.id ? '#0D2035' : '#9CA3AF',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: tab === t.id ? '600' : '400'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm text-black focus:outline-none"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 rounded-lg text-sm font-semibold"
            style={{backgroundColor: loading ? '#6B7280' : '#0D9488'}}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={async () => {
                if (!email) {
                  setError('Please enter your email address first.');
                  return;
                }
                await supabase.auth.resetPasswordForEmail(email);
                setResetSent(true);
              }}
              className="text-sm"
              style={{color: '#0D9488'}}
            >
              Forgot your password?
            </button>
            {resetSent && (
              <p className="text-sm mt-2" style={{color: '#0D9488'}}>
                Password reset email sent! Check your inbox.
              </p>
            )}
          </div>
        </form>

        <p className="text-center text-xs mt-4" style={{color: '#9CA3AF'}}>
          © 2026 Impact Workforce Systems LLC
        </p>
      </div>
    </div>
  );
}