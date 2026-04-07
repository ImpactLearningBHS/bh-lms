'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const BILLING_PLANS = {
  'Starter — up to 15': 15,
  'Growth — up to 25': 25,
  'Professional — up to 40': 40,
  'Enterprise — up to 75': 75,
  'Elite — 100+': 999,
};

export default function BranchPage() {
  const [activePage, setActivePage] = useState('dashboard');
  const [orgName, setOrgName] = useState('Branch Admin');
  const [orgData, setOrgData] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [staff, setStaff] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [trainings, setTrainings] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [newStaff, setNewStaff] = useState({full_name: '', email: '', role: 'Therapist', hire_date: '', status: 'Active'});

  useEffect(() => { checkBranchAuth(); }, []);

  const checkBranchAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    setIsAuthorized(true);
    const params = new URLSearchParams(window.location.search);
    const impersonateOrgId = params.get('impersonate_org');
    const impersonateOrgName = params.get('org_name');
    if (impersonateOrgId) {
      setIsImpersonating(true);
      setOrgId(impersonateOrgId);
      setOrgName(decodeURIComponent(impersonateOrgName || 'Organization'));
      fetchOrgData(impersonateOrgId);
      fetchStaff(impersonateOrgId);
      fetchAssignments(impersonateOrgId);
      fetchTrainings();
      fetchCompletions(impersonateOrgId);
    } else {
      await fetchCurrentUser();
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('users').select('*, organizations(*)').eq('auth_id', user.id).single();
      if (data) {
        setCurrentUser(data);
        setOrgId(data.organization_id);
        setOrgName(data.organizations?.name || 'Branch Admin');
        setOrgData(data.organizations);
        fetchStaff(data.organization_id);
        fetchAssignments(data.organization_id);
        fetchTrainings();
        fetchCompletions(data.organization_id);
      }
    }
  };

  const fetchOrgData = async (oId) => {
    if (!oId) return;
    const { data } = await supabase.from('organizations').select('*').eq('id', oId).single();
    if (data) setOrgData(data);
  };

  const fetchStaff = async (oId) => {
    if (!oId) return;
    const { data } = await supabase.from('users').select('*').eq('organization_id', oId).neq('role', 'Platform Admin');
    if (data) setStaff(data);
  };

  const fetchTrainings = async () => {
    const { data } = await supabase.from('trainings').select('*');
    if (data) setTrainings(data);
  };

  const fetchAssignments = async (oId) => {
    if (!oId) return;
    const { data } = await supabase.from('training_assignments').select('*').eq('organization_id', oId).eq('status', 'Active');
    if (data) setAssignments(data);
  };

  const fetchCompletions = async (oId) => {
    if (!oId) return;
    const { data: orgStaff } = await supabase.from('users').select('id').eq('organization_id', oId);
    if (orgStaff && orgStaff.length > 0) {
      const staffIds = orgStaff.map(s => s.id);
      const { data } = await supabase.from('training_completions').select('*').in('user_id', staffIds);
      if (data) setCompletions(data);
    }
  };

  // Capacity helpers
  const getPlanLimit = (plan) => BILLING_PLANS[plan] || 999;
  const planLimit = getPlanLimit(orgData?.billing_plan);
  const isAtLimit = staff.length >= planLimit;
  const isNearLimit = !isAtLimit && planLimit < 999 && (staff.length / planLimit) >= 0.9;

  const getAssignedTrainingsForRole = (role) => {
    const assignedTrainingIds = assignments.map(a => a.training_id);
    const assignedTrainings = trainings.filter(t => assignedTrainingIds.includes(t.id));
    const directCareRoles = ['Therapist', 'BHT', 'PMHNP', 'Clinical Supervisor', 'Peer Support Specialist', 'PRP Case Worker'];
    return directCareRoles.includes(role) ? assignedTrainings : assignedTrainings.filter(t => t.category === 'All Staff');
  };

  const getStaffCompletionCount = (staffId) => completions.filter(c => c.user_id === staffId).length;
  const getInitials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';

  const overdueAssignments = assignments.filter(a =>
    a.due_date && new Date(a.due_date) < new Date() &&
    !completions.some(c => c.training_id === a.training_id)
  );

  const saveStaff = async (member) => {
    if (!orgId) { alert('Error: Could not determine your organization.'); return; }
    if (isAtLimit) return;
    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        full_name: member.full_name, email: member.email, role: member.role,
        hire_date: member.hire_date, status: member.status, organization_id: orgId
      })
    });
    const result = await response.json();
    if (result.success) {
      setStaff([...staff, result.user]);
      setShowAddStaff(false);
      setNewStaff({full_name: '', email: '', role: 'Therapist', hire_date: '', status: 'Active'});
    } else {
      alert('Error creating user: ' + result.error);
    }
  };

  const printCertificate = (completion) => {
    const win = window.open('', '_blank');
    const completionDate = new Date(completion.completed_date).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    const expiryDate = new Date(new Date(completion.completed_date).setFullYear(new Date(completion.completed_date).getFullYear() + 1)).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
    win.document.write(`<!DOCTYPE html><html><head><title>Certificate</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Georgia,serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:30px;}.certificate{border:8px solid #0D2035;border-radius:16px;padding:48px 40px;width:100%;max-width:600px;text-align:center;position:relative;overflow:hidden;background:white;}.bg-shapes{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}.inner-box{border:2px solid #0D9488;border-radius:10px;padding:36px 48px;position:relative;background:rgba(250,250,247,0.75);}.logo-area{margin-bottom:14px;}.logo-area img{height:44px;object-fit:contain;}h1{font-size:30px;color:#0D2035;margin-bottom:4px;}.subtitle{font-family:Arial,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#6B7280;margin-bottom:10px;}.divider{width:60px;height:3px;background:#0D9488;margin:12px auto;border-radius:2px;}.main-content{display:flex;flex-direction:column;align-items:center;gap:16px;margin:18px 0;}.separator{width:60px;height:2px;background:#0D9488;opacity:0.4;}.label{font-family:Arial,sans-serif;font-size:10px;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}.staff-name{font-size:28px;color:#0D2035;font-style:italic;}.training-title{font-size:18px;font-weight:bold;color:#0D9488;font-family:Arial,sans-serif;}.details{display:flex;justify-content:space-around;margin-top:20px;padding-top:16px;border-top:1px solid rgba(13,148,136,0.3);font-family:Arial,sans-serif;}.detail-label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#6B7280;margin-bottom:4px;}.detail-value{font-size:13px;color:#0D2035;font-weight:bold;}.watermark{position:absolute;bottom:14px;right:24px;font-family:Arial,sans-serif;font-size:9px;color:#D1D5DB;}@media print{body{padding:0;}}</style></head><body><div class="certificate"><svg class="bg-shapes" xmlns="http://www.w3.org/2000/svg"><circle cx="5%" cy="20%" r="90" fill="#0D9488" opacity="0.2"/><circle cx="95%" cy="80%" r="110" fill="#0D2035" opacity="0.15"/><circle cx="92%" cy="10%" r="60" fill="#0D9488" opacity="0.18"/><circle cx="8%" cy="90%" r="70" fill="#0D2035" opacity="0.12"/></svg><div class="inner-box"><div class="logo-area"><img src="${window.location.origin}/ImpactWorkforce.png" alt="Impact Workforce"/></div><p class="subtitle">Certificate of Completion</p><h1>Achievement Award</h1><div class="divider"></div><div class="main-content"><div><p class="label">This certifies that</p><p class="staff-name">${completion.staff_name}</p></div><div class="separator"></div><div><p class="label">Has successfully completed</p><p class="training-title">${completion.training_title}</p></div></div><div class="details"><div><p class="detail-label">Organization</p><p class="detail-value">${orgName}</p></div><div><p class="detail-label">Completion Date</p><p class="detail-value">${completionDate}</p></div><div><p class="detail-label">Valid Through</p><p class="detail-value">${expiryDate}</p></div></div></div><p class="watermark">Impact Workforce Systems LLC © ${new Date().getFullYear()}</p></div><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'staff', label: 'My Staff' },
    { id: 'trainings', label: 'Trainings' },
    { id: 'completions', label: 'Completions' },
  ];

  const roles = ['Therapist','BHT','PMHNP','Clinical Supervisor','Peer Support Specialist','PRP Case Worker','Administration','Compliance Officer','Billing Specialist','Other'];

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4" style={{backgroundColor: '#0D2035'}}>
        <img src="/ImpactWorkforce.png" alt="Impact Workforce" className="h-10" />
        <div className="flex items-center gap-4">
          {isImpersonating && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{backgroundColor: '#7C3AED', color: 'white'}}>
              👁 Impersonating: {orgName}
            </span>
          )}
          <span className="text-sm font-medium text-white">{orgName}</span>
          {isImpersonating ? (
            <button onClick={() => window.location.href = '/dashboard'}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white"
              style={{backgroundColor: '#7C3AED'}}>← Exit Impersonation</button>
          ) : (
            <button onClick={() => window.location.href = '/login'}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white"
              style={{backgroundColor: '#0D9488'}}>Log Out</button>
          )}
        </div>
      </div>

      <div className="flex flex-1">

        {/* Sidebar */}
        <div className="w-64 flex flex-col py-6 px-4 gap-1" style={{backgroundColor: '#0D2035'}}>
          <div className="px-4 mb-6 pb-6 border-b border-white/10">
            <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>{isImpersonating ? 'Impersonating' : 'Branch Admin'}</p>
            <p className="text-sm font-bold text-white">{orgName}</p>
            {currentUser?.full_name && !isImpersonating && (
              <p className="text-xs mt-1" style={{color: '#6B7280'}}>{currentUser.full_name}</p>
            )}
            {orgData?.billing_plan && (
              <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{backgroundColor: 'rgba(13,148,136,0.2)', color: '#0D9488'}}>
                {orgData.billing_plan}
              </span>
            )}
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
            {isImpersonating ? (
              <button onClick={() => window.location.href = '/dashboard'}
                className="text-sm font-medium w-full text-left" style={{color: '#7C3AED'}}>← Exit Impersonation</button>
            ) : (
              <button onClick={() => window.location.href = '/login'}
                className="text-sm font-medium w-full text-left" style={{color: '#6B7280'}}>Sign Out</button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8" style={{backgroundColor: '#F9FAFB'}}>

          {/* ── DASHBOARD ── */}
          {activePage === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{color: '#0D2035'}}>Branch Dashboard</h1>
              <p className="text-sm mb-6" style={{color: '#6B7280'}}>Overview of {orgName}</p>

              {/* Capacity warning */}
              {isAtLimit && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6 flex items-center gap-3">
                  <span>🔒</span>
                  <div>
                    <p className="text-sm font-bold text-red-700">Staff Limit Reached</p>
                    <p className="text-sm text-red-600">You've reached your {orgData?.billing_plan} limit ({staff.length}/{planLimit} staff). Please contact Impact Workforce to upgrade your plan.</p>
                  </div>
                </div>
              )}
              {isNearLimit && !isAtLimit && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 mb-6 flex items-center gap-3">
                  <span>⚠️</span>
                  <div>
                    <p className="text-sm font-bold" style={{color: '#92400E'}}>Approaching Staff Limit</p>
                    <p className="text-sm text-orange-700">You're at {staff.length}/{planLimit} staff on your {orgData?.billing_plan} plan. Contact Impact Workforce to upgrade before you hit the limit.</p>
                  </div>
                </div>
              )}

              {/* Overdue banner */}
              {overdueAssignments.length > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 mb-6 flex items-center gap-3">
                  <span>🚨</span>
                  <div>
                    <p className="text-sm font-bold" style={{color: '#92400E'}}>Attention Needed</p>
                    <p className="text-sm text-orange-700">{overdueAssignments.length} training{overdueAssignments.length > 1 ? 's are' : ' is'} overdue — staff need to complete them ASAP</p>
                  </div>
                </div>
              )}

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Staff', value: `${staff.length}${planLimit < 999 ? `/${planLimit}` : ''}`, sub: `${staff.filter(s => s.status === 'Active').length} active`, accent: '#0D9488' },
                  { label: 'Trainings Assigned', value: assignments.length, sub: assignments[0]?.due_date ? `Due ${assignments[0].due_date}` : 'No due date', accent: '#7C3AED' },
                  { label: 'Completions', value: completions.length, sub: staff.length > 0 ? `${Math.round((completions.length / Math.max(assignments.length * staff.length, 1)) * 100)}% rate` : '—', accent: '#16A34A' },
                  { label: 'Overdue', value: overdueAssignments.length, sub: overdueAssignments.length === 0 ? 'All on track' : 'Need attention', accent: overdueAssignments.length > 0 ? '#DC2626' : '#6B7280' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl shadow p-5"
                    style={{borderLeft: `4px solid ${stat.accent}`}}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>{stat.label}</p>
                    <p className="text-3xl font-bold mb-1" style={{color: stat.label === 'Overdue' && stat.value > 0 ? '#DC2626' : '#0D2035'}}>{stat.value}</p>
                    <p className="text-xs" style={{color: stat.accent}}>{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Staff completion status */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-base font-bold mb-5" style={{color: '#0D2035'}}>Staff Completion Status</h2>
                {staff.length === 0 ? (
                  <p className="text-sm" style={{color: '#6B7280'}}>No staff yet.</p>
                ) : (
                  <div className="space-y-3">
                    {staff.map(member => {
                      const completed = getStaffCompletionCount(member.id);
                      const total = assignments.length;
                      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                      const initials = getInitials(member.full_name);
                      const isGood = pct === 100;
                      const isNone = pct === 0;
                      const avatarBg = isGood ? '#DCFCE7' : isNone ? '#FEE2E2' : '#EEF2FF';
                      const avatarColor = isGood ? '#16A34A' : isNone ? '#DC2626' : '#7C3AED';
                      const badgeBg = isGood ? '#DCFCE7' : isNone ? '#FEE2E2' : '#EEF2FF';
                      const badgeColor = isGood ? '#16A34A' : isNone ? '#DC2626' : '#7C3AED';
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded-xl"
                          style={{backgroundColor: '#F9FAFB'}}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{backgroundColor: avatarBg, color: avatarColor}}>
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{color: '#0D2035'}}>{member.full_name}</p>
                              <p className="text-xs" style={{color: '#6B7280'}}>{member.role}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 rounded-full"
                            style={{backgroundColor: badgeBg, color: badgeColor}}>
                            {completed}/{total} done
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STAFF ── */}
          {activePage === 'staff' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#0D2035'}}>My Staff</h1>
                {!isAtLimit ? (
                  <button onClick={() => setShowAddStaff(true)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                    style={{backgroundColor: '#0D9488'}}>+ Add Staff</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-2 rounded-lg"
                      style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}>
                      🔒 Plan limit reached
                    </span>
                  </div>
                )}
              </div>

              {/* Locked state banner */}
              {isAtLimit && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 mb-6 text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="text-lg font-bold text-red-700 mb-2">Staff Limit Reached</h3>
                  <p className="text-sm text-red-600 mb-4">
                    Your organization is on the <strong>{orgData?.billing_plan}</strong> plan which allows up to <strong>{planLimit} staff members</strong>. You currently have <strong>{staff.length}</strong>.
                  </p>
                  <p className="text-sm text-red-600">
                    To add more staff, please contact <strong>Impact Workforce</strong> to upgrade your plan.
                  </p>
                  <a href="mailto:impactlearningbhs@gmail.com"
                    className="inline-block mt-4 px-6 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{backgroundColor: '#0D9488'}}>
                    Contact Us to Upgrade
                  </a>
                </div>
              )}

              {/* Near limit warning */}
              {isNearLimit && !isAtLimit && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 mb-6">
                  <p className="text-sm font-bold" style={{color: '#92400E'}}>⚠️ Approaching Staff Limit</p>
                  <p className="text-sm text-orange-700 mt-1">You're at {staff.length}/{planLimit} staff. Contact Impact Workforce before you hit your limit.</p>
                </div>
              )}

              {showAddStaff && !isAtLimit && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>New Staff Member</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Full Name</label>
                      <input type="text" value={newStaff.full_name}
                        onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Email</label>
                      <input type="email" value={newStaff.email}
                        onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Role</label>
                      <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        {roles.map(role => <option key={role}>{role}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Hire Date</label>
                      <input type="date" value={newStaff.hire_date}
                        onChange={(e) => setNewStaff({...newStaff, hire_date: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Status</label>
                      <select value={newStaff.status} onChange={(e) => setNewStaff({...newStaff, status: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => saveStaff(newStaff)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                      style={{backgroundColor: '#0D9488'}}>Save Staff Member</button>
                    <button onClick={() => setShowAddStaff(false)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Name</th>
                      <th className="text-left pb-3">Email</th>
                      <th className="text-left pb-3">Role</th>
                      <th className="text-left pb-3">Hire Date</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr><td colSpan="5" className="py-6 text-center" style={{color: '#6B7280'}}>No staff yet.</td></tr>
                    ) : staff.map(member => (
                      <tr key={member.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium" style={{color: '#0D9488'}}>{member.full_name}</td>
                        <td className="py-3 text-gray-500">{member.email}</td>
                        <td className="py-3 text-gray-500">{member.role}</td>
                        <td className="py-3 text-gray-500">{member.hire_date}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{backgroundColor: member.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                              color: member.status === 'Active' ? '#16A34A' : '#DC2626'}}>
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TRAININGS ── */}
          {activePage === 'trainings' && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#0D2035'}}>Trainings</h1>
              <p className="text-sm mb-6" style={{color: '#6B7280'}}>Trainings assigned to your organization</p>
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training Name</th>
                      <th className="text-left pb-3">Category</th>
                      <th className="text-left pb-3">Recurrence</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAssignedTrainingsForRole(currentUser?.role || 'Branch Admin').length === 0 ? (
                      <tr><td colSpan="4" className="py-6 text-center" style={{color: '#6B7280'}}>No trainings assigned yet.</td></tr>
                    ) : getAssignedTrainingsForRole(currentUser?.role || 'Branch Admin').map(training => {
                      const isCompleted = completions.some(c => c.training_id === training.id && c.user_id === currentUser?.id);
                      const assignment = assignments.find(a => a.training_id === training.id);
                      return (
                        <tr key={training.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training.title}</td>
                          <td className="py-3 text-gray-500">{training.category}</td>
                          <td className="py-3 text-gray-500">{training.recurrence}</td>
                          <td className="py-3">
                            {isCompleted ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold"
                                style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}>Completed</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button onClick={() => window.location.href = `/quiz?training_id=${training.id}&title=${encodeURIComponent(training.title)}`}
                                  className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                                  style={{backgroundColor: '#0D9488'}}>Take Quiz</button>
                                {assignment?.due_date && <span className="text-xs" style={{color: '#6B7280'}}>Due {assignment.due_date}</span>}
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

          {/* ── COMPLETIONS ── */}
          {activePage === 'completions' && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#0D2035'}}>Completions</h1>
              <p className="text-sm mb-6" style={{color: '#6B7280'}}>Track training completions for your staff</p>
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Staff Member</th>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Completed Date</th>
                      <th className="text-left pb-3">Status</th>
                      <th className="text-left pb-3">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr><td colSpan="5" className="py-6 text-center" style={{color: '#6B7280'}}>No completions recorded yet.</td></tr>
                    ) : completions.map(completion => (
                      <tr key={completion.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium" style={{color: '#0D9488'}}>{completion.staff_name}</td>
                        <td className="py-3 text-gray-500">{completion.training_title}</td>
                        <td className="py-3 text-gray-500">{completion.completed_date}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}>Completed</span>
                        </td>
                        <td className="py-3">
                          <button onClick={() => printCertificate(completion)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                            style={{backgroundColor: '#0D2035'}}>🖨 Print</button>
                        </td>
                      </tr>
                    ))}
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