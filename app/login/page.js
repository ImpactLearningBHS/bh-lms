'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

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

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', data.user.id)
      .single();

    const role = userData?.role;

    if (role === 'Platform Admin' || data.user.email === 'impactlearningbhs@gmail.com') {
      window.location.href = '/dashboard';
    } else if (role === 'Branch Admin') {
      window.location.href = '/branch';
    } else {
      window.location.href = '/staff';
    }

    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    await supabase.auth.resetPasswordForEmail(email);
    setResetSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#0D2035'}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Form area */}
<div className="px-8 py-8">
  <div className="mb-6 pb-6 border-b border-gray-100">
  <img src="/ImpactWorkforce.png" alt="Impact Workforce" style={{height: '80px', display: 'block', margin: '0 auto', objectFit: 'contain', objectPosition: 'center'}} />
  </div>
  <h2 className="text-lg font-bold mb-1" style={{color: '#0D2035'}}>Welcome back</h2>
  <p className="text-sm mb-6" style={{color: '#6B7280'}}>Sign in to access your portal</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color: '#6B7280'}}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-black bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide" style={{color: '#6B7280'}}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowReset(!showReset)}
                  className="text-xs font-medium"
                  style={{color: '#0D9488'}}>
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-black bg-white focus:outline-none"
                required
              />
            </div>

            {showReset && (
              <div className="rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}>
                {resetSent ? (
                  <p className="text-sm" style={{color: '#16A34A'}}>Password reset email sent! Check your inbox.</p>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm" style={{color: '#16A34A'}}>Send reset link to {email || 'your email'}?</p>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs font-semibold px-3 py-1 rounded-lg text-white flex-shrink-0"
                      style={{backgroundColor: '#0D9488'}}>
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold mt-2"
              style={{backgroundColor: loading ? '#6B7280' : '#0D9488'}}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Trust badges */}
          <div className="flex items-center gap-2 mt-6 mb-4">
            <div style={{flex: 1, height: '1px', backgroundColor: '#E5E7EB'}}></div>
            <span className="text-xs" style={{color: '#9CA3AF'}}>SECURE LOGIN</span>
            <div style={{flex: 1, height: '1px', backgroundColor: '#E5E7EB'}}></div>
          </div>

          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#0D9488" strokeWidth="1.5"/>
                <path d="M5 7l1.5 1.5L9 5.5" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-xs" style={{color: '#6B7280'}}>HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="6" width="10" height="7" rx="2" stroke="#0D9488" strokeWidth="1.5"/>
                <path d="M4 6V4a3 3 0 016 0v2" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-xs" style={{color: '#6B7280'}}>256-bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 text-center border-t border-gray-100" style={{backgroundColor: '#FAFAFA'}}>
          <p className="text-xs" style={{color: '#9CA3AF'}}>© 2026 Impact Workforce Systems LLC</p>
        </div>

      </div>
    </div>
  );
}