'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function StaffPage() {
  const [activePage, setActivePage] = useState('trainings');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [trainings, setTrainings] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [completions, setCompletions] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('*, organizations(name)')
      .eq('auth_id', user.id)
      .single();
    if (!data) {
      window.location.href = '/login';
      return;
    }
    setCurrentUser(data);
    setOrgName(data.organizations?.name || '');
    setIsAuthorized(true);
    fetchTrainings();
    fetchAssignments(data.organization_id);
    fetchCompletions(data.id);
  };

  const fetchTrainings = async () => {
    const { data } = await supabase.from('trainings').select('*');
    if (data) setTrainings(data);
  };

  const fetchAssignments = async (orgId) => {
    if (!orgId) return;
    const { data } = await supabase
      .from('training_assignments')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'Active');
    if (data) setAssignments(data);
  };

  const fetchCompletions = async (userId) => {
    if (!userId) return;
    const { data } = await supabase
      .from('training_completions')
      .select('*')
      .eq('user_id', userId);
    if (data) setCompletions(data);
  };

  const getAssignedTrainingsForRole = (role) => {
    const assignedTrainingIds = assignments.map(a => a.training_id);
    const assignedTrainings = trainings.filter(t => assignedTrainingIds.includes(t.id));
    const directCareRoles = ['Therapist', 'BHT', 'PMHNP', 'Clinical Supervisor', 'Peer Support Specialist', 'PRP Case Worker'];
    if (directCareRoles.includes(role)) {
      return assignedTrainings;
    } else {
      return assignedTrainings.filter(t => t.category === 'All Staff');
    }
  };

  const printCertificate = (completion) => {
    const win = window.open('', '_blank');
    const completionDate = new Date(completion.completed_date).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    const expiryDate = new Date(new Date(completion.completed_date).setFullYear(new Date(completion.completed_date).getFullYear() + 1)).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 30px; }
          .certificate { border: 8px solid #0D2035; border-radius: 16px; padding: 48px 40px; width: 100%; max-width: 600px; text-align: center; position: relative; overflow: hidden; background: white; }
          .bg-shapes { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
          .inner-box { border: 2px solid #0D9488; border-radius: 10px; padding: 36px 32px; position: relative; background: rgba(250,250,247,0.75); }
          .logo-area { margin-bottom: 14px; }
          .logo-area img { height: 44px; object-fit: contain; }
          .subtitle { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #6B7280; margin-bottom: 10px; }
          h1 { font-size: 28px; color: #0D2035; margin-bottom: 4px; }
          .divider { width: 60px; height: 3px; background: #0D9488; margin: 12px auto; border-radius: 2px; }
          .main-content { display: flex; flex-direction: column; align-items: center; gap: 16px; margin: 18px 0; }
          .separator { width: 60px; height: 2px; background: #0D9488; opacity: 0.4; }
          .label { font-family: Arial, sans-serif; font-size: 10px; color: #6B7280; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
          .staff-name { font-size: 28px; color: #0D2035; font-style: italic; }
          .training-title { font-size: 18px; font-weight: bold; color: #0D9488; font-family: Arial, sans-serif; }
          .details { display: flex; justify-content: space-around; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(13,148,136,0.3); font-family: Arial, sans-serif; }
          .detail-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #6B7280; margin-bottom: 4px; }
          .detail-value { font-size: 13px; color: #0D2035; font-weight: bold; }
          .watermark { position: absolute; bottom: 14px; right: 24px; font-family: Arial, sans-serif; font-size: 9px; color: #D1D5DB; letter-spacing: 1px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <svg class="bg-shapes" xmlns="http://www.w3.org/2000/svg">
            <circle cx="5%" cy="20%" r="90" fill="#0D9488" opacity="0.2"/>
            <circle cx="95%" cy="80%" r="110" fill="#0D2035" opacity="0.15"/>
            <circle cx="92%" cy="10%" r="60" fill="#0D9488" opacity="0.18"/>
            <circle cx="8%" cy="90%" r="70" fill="#0D2035" opacity="0.12"/>
            <rect x="80%" y="20%" width="90" height="90" rx="12" fill="#0D9488" opacity="0.15" transform="rotate(25 85 40)"/>
            <rect x="1%" y="40%" width="70" height="70" rx="12" fill="#0D2035" opacity="0.12" transform="rotate(-20 30 70)"/>
            <circle cx="93%" cy="45%" r="25" fill="#0D9488" opacity="0.18"/>
            <circle cx="7%" cy="55%" r="20" fill="#0D9488" opacity="0.15"/>
          </svg>
          <div class="inner-box">
            <div class="logo-area">
              <img src="${window.location.origin}/ImpactWorkforce.png" alt="Impact Workforce" />
            </div>
            <p class="subtitle">Certificate of Completion</p>
            <h1>Achievement Award</h1>
            <div class="divider"></div>
            <div class="main-content">
              <div>
                <p class="label">This certifies that</p>
                <p class="staff-name">${completion.staff_name}</p>
              </div>
              <div class="separator"></div>
              <div>
                <p class="label">Has successfully completed</p>
                <p class="training-title">${completion.training_title}</p>
              </div>
            </div>
            <div class="details">
              <div>
                <p class="detail-label">Organization</p>
                <p class="detail-value">${orgName}</p>
              </div>
              <div>
                <p class="detail-label">Completion Date</p>
                <p class="detail-value">${completionDate}</p>
              </div>
              <div>
                <p class="detail-label">Valid Through</p>
                <p class="detail-value">${expiryDate}</p>
              </div>
            </div>
          </div>
          <p class="watermark">Impact Workforce Systems LLC © ${new Date().getFullYear()}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const navItems = [
    { id: 'trainings', label: 'My Trainings' },
    { id: 'completions', label: 'My Completions' },
  ];

  const myTrainings = getAssignedTrainingsForRole(currentUser?.role || 'Other');
  const completedCount = myTrainings.filter(t => completions.some(c => c.training_id === t.id)).length;
  const pendingCount = myTrainings.length - completedCount;

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
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
  </div>
  <div className="flex items-center gap-3">
    <span className="text-xs" style={{color: '#6B7280'}}>{currentUser?.full_name}</span>
    <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80" style={{backgroundColor: '#0D2035', color: 'white', border: 'none', borderRadius: '8px'}}>Log Out</button>
  </div>
</div>

      <div className="flex flex-1">

        {/* Sidebar */}
        <div className="w-64 flex flex-col py-6 px-4 gap-1" style={{backgroundColor: '#0D2035'}}>
          <div className="px-4 mb-6 pb-6 border-b border-white/10">
            <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Staff Portal</p>
            <p className="text-sm font-bold text-white">{currentUser?.full_name}</p>
            <p className="text-xs" style={{color: '#6B7280'}}>{currentUser?.role} · {orgName}</p>
          </div>
          <p className="text-xs font-semibold uppercase px-4 mb-2" style={{color: '#6B7280'}}>Menu</p>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              className="text-left px-4 py-3 text-sm transition-colors rounded-lg"
              style={{
                borderLeft: activePage === item.id ? '4px solid #0D9488' : '4px solid transparent',
                color: activePage === item.id ? '#0D9488' : '#9CA3AF',
                fontWeight: activePage === item.id ? '700' : '500',
                backgroundColor: activePage === item.id ? 'rgba(13,148,136,0.1)' : 'transparent'
              }}>
              {item.label}
            </button>
          ))}
          <div className="mt-auto px-4 pt-6 border-t border-white/10">
            <button onClick={() => window.location.href = '/login'}
              className="text-sm font-medium w-full text-left" style={{color: '#6B7280'}}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8" style={{backgroundColor: '#F9FAFB'}}>

          {/* ── MY TRAININGS ── */}
          {activePage === 'trainings' && (
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{color: '#0D2035'}}>My Trainings</h1>
              <p className="text-sm mb-6" style={{color: '#6B7280'}}>Trainings assigned to you by your organization</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Assigned</p>
                  <p className="text-3xl font-bold" style={{color: '#0D2035'}}>{myTrainings.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Completed</p>
                  <p className="text-3xl font-bold" style={{color: '#0D9488'}}>{completedCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Pending</p>
                  <p className="text-3xl font-bold text-red-500">{pendingCount}</p>
                </div>
              </div>

              {/* Training list */}
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Category</th>
                      <th className="text-left pb-3">Due Date</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTrainings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center" style={{color: '#6B7280'}}>
                          No trainings assigned yet.
                        </td>
                      </tr>
                    ) : myTrainings.map(training => {
                      const isCompleted = completions.some(c => c.training_id === training.id);
                      const assignment = assignments.find(a => a.training_id === training.id);
                      return (
                        <tr key={training.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D2035'}}>{training.title}</td>
<td className="py-3 text-gray-500">{training.category}</td>
<td className="py-3 text-gray-500">{assignment?.due_date || '—'}</td>
<td className="py-3">
  {isCompleted ? (
    <div className="flex items-center gap-2">
      <span className="px-2 py-1 rounded-full text-xs font-semibold"
        style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}>
        Completed
      </span>
      <button
        onClick={() => window.location.href = `/branch/trainings/${training.id}`}
        className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
        style={{backgroundColor: '#0D2035'}}>
        View Training
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <button
        onClick={() => window.location.href = `/branch/trainings/${training.id}`}
        className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
        style={{backgroundColor: '#0D2035'}}>
        View Training
      </button>
      {training.has_quiz && (
        <button
          onClick={() => window.location.href = `/quiz?training_id=${training.id}&title=${encodeURIComponent(training.title)}`}
          className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
          style={{backgroundColor: '#0D9488'}}>
          Take Quiz
        </button>
      )}
    </div>
  )}
</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MY COMPLETIONS ── */}
          {activePage === 'completions' && (
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{color: '#0D2035'}}>My Completions</h1>
              <p className="text-sm mb-6" style={{color: '#6B7280'}}>Your completed trainings and certificates</p>

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Completed Date</th>
                      <th className="text-left pb-3">Valid Through</th>
                      <th className="text-left pb-3">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center" style={{color: '#6B7280'}}>
                          No completions yet. Complete a training to get started!
                        </td>
                      </tr>
                    ) : completions.map(completion => {
                      const expiryDate = new Date(new Date(completion.completed_date).setFullYear(new Date(completion.completed_date).getFullYear() + 1)).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
                      return (
                        <tr key={completion.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{completion.training_title}</td>
                          <td className="py-3 text-gray-500">{completion.completed_date}</td>
                          <td className="py-3 text-gray-500">{expiryDate}</td>
                          <td className="py-3">
                            <button
                              onClick={() => printCertificate(completion)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                              style={{backgroundColor: '#0D2035'}}>
                              🖨 Print
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}