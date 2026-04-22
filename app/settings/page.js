'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
    setLoading(false);
  };

  const saveSection = async (section, fields) => {
    setSaving(section);
    const updates = {};
    fields.forEach(f => { updates[f] = settings[f]; });
    const { error } = await supabase.from('settings').update(updates).eq('id', settings.id);
    setSaving('');
    if (!error) {
      setSaved(section);
      setTimeout(() => setSaved(''), 2500);
    }
  };

  const toggle = (field) => setSettings({...settings, [field]: !settings[field]});

  const SaveButton = ({ section, fields }) => (
    <button
      onClick={() => saveSection(section, fields)}
      className="text-sm font-semibold px-4 py-1.5 rounded-lg text-white"
      style={{backgroundColor: saved === section ? '#16A34A' : '#0D9488'}}>
      {saving === section ? 'Saving...' : saved === section ? '✅ Saved!' : 'Save'}
    </button>
  );

  const Toggle = ({ field, label, description }) => (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{backgroundColor: '#F9FAFB'}}>
      <div>
        <p className="text-sm font-semibold" style={{color: '#0D2035'}}>{label}</p>
        <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>{description}</p>
      </div>
      <button onClick={() => toggle(field)}
        className="flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ml-4"
        style={{backgroundColor: settings[field] ? '#0D9488' : '#E5E7EB'}}>
        <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
          style={{left: settings[field] ? '20px' : '4px'}}></span>
      </button>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
      <p className="text-gray-400">Loading settings...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
<div className="flex items-center justify-between px-6 py-0" style={{backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', height: '56px'}}>
  <div className="flex items-center gap-2">
    <div style={{width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" fillOpacity="0.9"/>
        <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="#0D9488"/>
      </svg>
    </div>
    <span className="font-bold tracking-tight" style={{fontSize: '15px', letterSpacing: '-0.01em', color: '#0D2035'}}>Impact Workforce</span>
    <span className="text-xs font-medium px-2 py-0.5 rounded-full ml-1" style={{backgroundColor: 'rgba(13,148,136,0.12)', color: '#0D9488'}}>Admin</span>
  </div>
  <div className="flex items-center gap-3">
    <span className="text-xs" style={{color: '#6B7280'}}>impactlearningbhs@gmail.com</span>
    <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80" style={{backgroundColor: '#0D2035', color: 'white', border: 'none', borderRadius: '8px'}}>
      Log Out
    </button>
  </div>
</div>

      <div className="flex flex-1">

        {/* Sidebar */}
        <div className="w-64 flex flex-col py-6 px-4 gap-1" style={{backgroundColor: '#0D2035'}}>
          <div className="px-4 mb-6 pb-6 border-b border-white/10">
            <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Platform Admin</p>
            <p className="text-sm font-bold text-white">Administrator</p>
          </div>
          <p className="text-xs font-semibold uppercase px-4 mb-2" style={{color: '#6B7280'}}>Platform</p>
          {[
            { id: 'dashboard', label: 'Admin Dashboard' },
            { id: 'organizations', label: 'All Organizations' },
            { id: 'trainings', label: 'Training Library' },
            { id: 'assignments', label: 'Assignments' },
            { id: 'completions', label: 'Completions' },
            { id: 'settings', label: 'Settings' },
          ].map(item => (
            <button key={item.id}
              onClick={() => item.id !== 'settings' ? window.location.href = '/dashboard' : null}
              className="text-left px-4 py-3 text-sm transition-colors rounded-lg"
              style={{
                borderLeft: item.id === 'settings' ? '4px solid #0D9488' : '4px solid transparent',
                color: item.id === 'settings' ? '#0D9488' : '#9CA3AF',
                fontWeight: item.id === 'settings' ? '700' : '500',
                backgroundColor: item.id === 'settings' ? 'rgba(13,148,136,0.1)' : 'transparent'
              }}>
              {item.label}
            </button>
          ))}
          <div className="mt-auto px-4 pt-6 border-t border-white/10">
            <button onClick={() => window.location.href = '/login'}
              className="text-sm font-medium w-full text-left" style={{color: '#6B7280'}}>Sign Out</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8" style={{backgroundColor: '#F9FAFB'}}>
          <h1 className="text-2xl font-bold mb-1" style={{color: '#0D2035'}}>Settings</h1>
          <p className="text-sm mb-8" style={{color: '#6B7280'}}>Manage your platform configuration</p>

          <div className="space-y-6 max-w-3xl">

            {/* Platform Info */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{color: '#0D2035'}}>Platform Info</h2>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Name, contact, and support details</p>
                </div>
                <SaveButton section="platform" fields={['platform_name','support_email','website','phone']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Platform Name</label>
                  <input type="text" value={settings.platform_name || ''}
                    onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Support Email</label>
                  <input type="email" value={settings.support_email || ''}
                    onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Website</label>
                  <input type="text" value={settings.website || ''}
                    onChange={(e) => setSettings({...settings, website: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Phone</label>
                  <input type="tel" value={settings.phone || ''}
                    onChange={(e) => setSettings({...settings, phone: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
              </div>
            </div>

            {/* Admin Account */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{color: '#0D2035'}}>Admin Account</h2>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Your name and email</p>
                </div>
                <SaveButton section="admin" fields={['admin_name','admin_email']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Full Name</label>
                  <input type="text" value={settings.admin_name || ''}
                    onChange={(e) => setSettings({...settings, admin_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Email</label>
                  <input type="email" value={settings.admin_email || ''}
                    onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
              </div>
            </div>

            {/* Training Defaults */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{color: '#0D2035'}}>Training Defaults</h2>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Default settings for assigned trainings</p>
                </div>
                <SaveButton section="training" fields={['default_due_days']} />
              </div>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Default Due Days</label>
                <div className="flex items-center gap-3">
                  <input type="number" min="1" max="365" value={settings.default_due_days || 30}
                    onChange={(e) => setSettings({...settings, default_due_days: parseInt(e.target.value)})}
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                  <span className="text-sm" style={{color: '#6B7280'}}>days after assignment</span>
                </div>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{color: '#0D2035'}}>Email Notifications</h2>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Control what emails get sent automatically</p>
                </div>
                <SaveButton section="notifications" fields={['reminders_enabled','welcome_emails_enabled','capacity_warnings_enabled']} />
              </div>
              <div className="space-y-3">
                <Toggle field="reminders_enabled" label="Training reminders"
                  description="Send staff reminders 7 and 14 days before due date" />
                <Toggle field="welcome_emails_enabled" label="Welcome emails"
                  description="Send welcome email when new staff are added" />
                <Toggle field="capacity_warnings_enabled" label="Capacity warnings"
                  description="Email me when an org reaches 90% staff capacity" />
              </div>
            </div>

            {/* Legal */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{color: '#0D2035'}}>Terms & Privacy</h2>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Links shown in emails and footer</p>
                </div>
                <SaveButton section="legal" fields={['terms_url','privacy_url']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Terms of Service URL</label>
                  <input type="url" value={settings.terms_url || ''}
                    onChange={(e) => setSettings({...settings, terms_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Privacy Policy URL</label>
                  <input type="url" value={settings.privacy_url || ''}
                    onChange={(e) => setSettings({...settings, privacy_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold" style={{color: '#0D2035'}}>Maintenance Mode</h2>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Take the platform offline temporarily</p>
                </div>
                <SaveButton section="maintenance" fields={['maintenance_mode']} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border"
                style={{backgroundColor: settings.maintenance_mode ? '#FEF2F2' : '#F9FAFB',
                  borderColor: settings.maintenance_mode ? '#FECACA' : '#E5E7EB'}}>
                <div>
                  <p className="text-sm font-semibold" style={{color: settings.maintenance_mode ? '#DC2626' : '#0D2035'}}>
                    {settings.maintenance_mode ? '🔴 Maintenance mode is ON' : '🟢 Platform is live'}
                  </p>
                  <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>
                    {settings.maintenance_mode
                      ? 'Users will see a maintenance message when they try to log in'
                      : 'All users can log in and access the platform normally'}
                  </p>
                </div>
                <button onClick={() => toggle('maintenance_mode')}
                  className="flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ml-4"
                  style={{backgroundColor: settings.maintenance_mode ? '#DC2626' : '#E5E7EB'}}>
                  <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                    style={{left: settings.maintenance_mode ? '20px' : '4px'}}></span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}