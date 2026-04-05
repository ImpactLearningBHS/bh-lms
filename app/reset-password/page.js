'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const error = hashParams.get('error');
    if (error) {
      setError('This reset link has expired. Please request a new one.');
    }
    if (accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#0D2035'}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="mb-6 flex justify-center">
          <img src="/ImpactWorkforce.png" alt="Impact Workforce" className="h-12" />
        </div>
        {success ? (
          <div className="text-center">
            <p className="text-lg font-semibold mb-2" style={{color: '#0D9488'}}>Password updated successfully!</p>
            <p className="text-sm text-gray-500">Redirecting you to login...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4" style={{color: '#0D2035'}}>Set New Password</h2>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none bg-white" required />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full text-white py-2 rounded-lg text-sm font-semibold"
              style={{backgroundColor: loading ? '#6B7280' : '#0D9488'}}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
        <p className="text-center text-xs mt-6" style={{color: '#9CA3AF'}}>© 2026 Impact Workforce Systems LLC</p>
      </div>
    </div>
  );
}