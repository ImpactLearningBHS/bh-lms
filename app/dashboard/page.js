'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function DashboardPage() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({name: '', types: [], email: '', status: 'Active'});
  const [trainings, setTrainings] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAssignTraining, setShowAssignTraining] = useState(false);
  const [newTraining, setNewTraining] = useState({title: '', category: 'All Staff', recurrence: 'Annual', description: '', status: 'Active'});
  const [newAssignment, setNewAssignment] = useState({training_id: '', organization_id: 'all'});
  const [assignSuccess, setAssignSuccess] = useState('');
  const [snapshot, setSnapshot] = useState({
    totalOrgs: 0, activeOrgs: 0, totalUsers: 0,
    trainingsInLibrary: 0, trainingsAssigned: 0, completionRate: 0,
  });

  useEffect(() => { checkAdmin(); }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'impactlearningbhs@gmail.com') {
      window.location.href = '/login';
    } else {
      setIsAuthorized(true);
      fetchAll();
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchOrganizations(), fetchTrainings(), fetchCompletions(), fetchAllUsers(), fetchAssignments()]);
  };

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*');
    if (data) setOrganizations(data);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) setAllUsers(data);
  };

  const fetchCompletions = async () => {
    const { data } = await supabase.from('training_completions').select('*');
    if (data) setCompletions(data);
  };

  const fetchTrainings = async () => {
    const { data } = await supabase.from('trainings').select('*');
    if (data) setTrainings(data);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from('training_assignments').select('*');
    if (data) setAssignments(data);
  };

  const saveAssignment = async () => {
    if (!newAssignment.training_id) return;
  
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const now = new Date().toISOString();
  
    const targetOrgs = newAssignment.organization_id === 'all'
      ? organizations
      : organizations.filter(o => o.id === newAssignment.organization_id);
  
    const targetTrainings = newAssignment.training_id === 'all'
      ? trainings
      : trainings.filter(t => t.id === newAssignment.training_id);
  
    const inserts = [];
    for (const org of targetOrgs) {
      for (const training of targetTrainings) {
        const alreadyAssigned = assignments.some(
          a => a.training_id === training.id && a.organization_id === org.id
        );
        if (!alreadyAssigned) {
          inserts.push({
            training_id: training.id,
            organization_id: org.id,
            due_date: dueDateStr,
            status: 'Active',
            assigned_at: now,
          });
        }
      }
    }
  
    if (inserts.length === 0) {
      setAssignSuccess('All selected trainings are already assigned.');
      setTimeout(() => setAssignSuccess(''), 3000);
      return;
    }
  
    const { data, error } = await supabase.from('training_assignments').insert(inserts).select();
    if (data) {
      setAssignments([...assignments, ...data]);
      const trainingLabel = newAssignment.training_id === 'all' ? 'All Trainings' : trainings.find(t => t.id === newAssignment.training_id)?.title;
      const orgLabel = newAssignment.organization_id === 'all' ? 'all organizations' : targetOrgs[0]?.name;
      setAssignSuccess(`✅ "${trainingLabel}" assigned to ${orgLabel} — due ${dueDateStr}`);
      setTimeout(() => {
        setAssignSuccess('');
        setShowAssignTraining(false);
        setNewAssignment({training_id: '', organization_id: 'all'});
      }, 3000);
    }
  };
  useEffect(() => {
    const totalAssigned = assignments.length;
    const completionRate = totalAssigned > 0 ? Math.round((completions.length / totalAssigned) * 100) : 0;
    setSnapshot({
      totalOrgs: organizations.length,
      activeOrgs: organizations.filter(o => getOrgStatus(o) === 'Active').length,
      totalUsers: allUsers.length,
      trainingsInLibrary: trainings.length,
      trainingsAssigned: totalAssigned,
      completionRate,
    });
  }, [organizations, allUsers, completions, trainings, assignments]);

  const getOrgStatus = (org) => {
    const orgUsers = allUsers.filter(u => u.organization_id === org.id);
    if (orgUsers.length === 0) return 'Not Set Up';
    return 'Active';
  };

  const getOrgUserCount = (orgId) => allUsers.filter(u => u.organization_id === orgId).length;

  const getOrgCompletions = (orgId) => {
    const ids = allUsers.filter(u => u.organization_id === orgId).map(u => u.id);
    return completions.filter(c => ids.includes(c.user_id)).length;
  };

  const getLastActivity = (orgId) => {
    const ids = allUsers.filter(u => u.organization_id === orgId).map(u => u.id);
    const orgC = completions.filter(c => ids.includes(c.user_id));
    if (!orgC.length) return 'No activity';
    const latest = orgC.sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];
    const days = Math.floor((new Date() - new Date(latest.completed_date)) / 86400000);
    return days === 0 ? 'Today' : `${days} days ago`;
  };

  const getOrgAssignments = (orgId) => assignments.filter(a => a.organization_id === orgId).length;

  const statusStyle = (status) => {
    if (status === 'Active') return { bg: '#DCFCE7', color: '#16A34A' };
    if (status === 'Inactive') return { bg: '#FEE2E2', color: '#DC2626' };
    return { bg: '#FEF9C3', color: '#CA8A04' };
  };

  const handleImpersonate = (org) => {
    window.location.href = `/branch?impersonate_org=${org.id}&org_name=${encodeURIComponent(org.name)}`;
  };

  const handleManageOrg = (org) => {
    window.location.href = `/dashboard/org/${org.id}`;
  };

  const saveTraining = async (training) => {
    const { data } = await supabase.from('trainings').insert([{
      title: training.title, category: training.category,
      recurrence: training.recurrence, description: training.description, status: training.status
    }]).select();
    if (data) {
      setTrainings([...trainings, data[0]]);
      setShowAddTraining(false);
      setNewTraining({title: '', category: 'All Staff', recurrence: 'Annual', description: '', status: 'Active'});
    }
  };

  const saveOrganization = async (org) => {
    const { data } = await supabase.from('organizations').insert([{
      name: org.name, type: org.types?.join(', '), email: org.email, status: org.status
    }]).select();
    if (data) setOrganizations([...organizations, data[0]]);
  };

  const navItems = [
    { id: 'dashboard', label: 'Admin Dashboard' },
    { id: 'organizations', label: 'All Organizations' },
    { id: 'trainings', label: 'Training Library' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'completions', label: 'Completions' },
    { id: 'settings', label: 'Settings' },
  ];

  const levels = [
    '1.0 - Outpatient','2.1 - Intensive Outpatient','2.5 - Partial Hospitalization',
    '3.1 - Clinically Managed Low-Intensity Residential',
    '3.3 - Clinically Managed Population-Specific High-Intensity Residential',
    '3.5 - Clinically Managed High-Intensity Residential',
    '3.7 - Medically Monitored Intensive Inpatient',
    '4.0 - Medically Managed Intensive Inpatient Services',
    'Psychiatric Rehabilitation Programs (PRP)','Outpatient Mental Health Clinic (OMHC)','Other'
  ];

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
          <span className="text-sm font-medium text-white">Platform Admin</span>
          <button onClick={() => window.location.href = '/login'}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{backgroundColor: '#0D9488'}}>Log Out</button>
        </div>
      </div>

      <div className="flex flex-1">

        {/* Sidebar */}
        <div className="w-64 flex flex-col py-6 px-4 gap-1" style={{backgroundColor: '#0D2035'}}>
          <div className="px-4 mb-6 pb-6 border-b border-white/10">
            <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Platform Admin</p>
            <p className="text-sm font-bold text-white">Administrator</p>
            <p className="text-xs" style={{color: '#6B7280'}}>All Organizations</p>
          </div>
          <p className="text-xs font-semibold uppercase px-4 mb-2" style={{color: '#6B7280'}}>Platform</p>
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

          {/* ── DASHBOARD ── */}
          {activePage === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{color: '#0D2035'}}>Admin Dashboard</h1>
              <p className="text-sm mb-8" style={{color: '#6B7280'}}>Platform-wide overview — business health, not compliance.</p>

              {/* Quick Actions */}
              <div className="flex gap-3 mb-8 flex-wrap">
                {[
                  { label: '+ Create Organization', action: () => { setActivePage('organizations'); setShowAddOrg(true); } },
                  { label: '+ Add Training', action: () => { setActivePage('trainings'); setShowAddTraining(true); } },
                  { label: '⚡ Assign Training', action: () => setShowAssignTraining(true) },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                    style={{backgroundColor: '#0D9488'}}>
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Assign Training Modal */}
              {showAssignTraining && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.4)'}}>
                  <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                    <h2 className="text-lg font-bold mb-1" style={{color: '#0D2035'}}>⚡ Assign Training</h2>
                    <p className="text-sm mb-6" style={{color: '#6B7280'}}>Due date auto-set to 30 days. Annual recurrence applies after completion.</p>

                    <div className="space-y-4">
                    <div>
  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Select Training</label>
  <select
    value={newAssignment.training_id}
    onChange={(e) => setNewAssignment({...newAssignment, training_id: e.target.value})}
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
    <option value="">-- Choose a training --</option>
    <option value="all">⚡ All Trainings</option>
    {trainings.map(t => (
      <option key={t.id} value={t.id}>{t.title}</option>
    ))}
  </select>
</div>

                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Assign To</label>
                        <select
                          value={newAssignment.organization_id}
                          onChange={(e) => setNewAssignment({...newAssignment, organization_id: e.target.value})}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                          <option value="all">All Organizations</option>
                          {organizations.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-lg p-3" style={{backgroundColor: '#F0FDF4'}}>
                        <p className="text-xs font-semibold" style={{color: '#16A34A'}}>
                          📅 Due date will be set to {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 30);
                            return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
                          })()}
                        </p>
                      </div>

                      {assignSuccess && (
                        <div className="rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}>
                          <p className="text-sm font-medium" style={{color: '#16A34A'}}>{assignSuccess}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={saveAssignment}
                        disabled={!newAssignment.training_id}
                        className="flex-1 py-2 rounded-lg text-white font-semibold text-sm"
                        style={{backgroundColor: newAssignment.training_id ? '#0D9488' : '#D1D5DB',
                          cursor: newAssignment.training_id ? 'pointer' : 'not-allowed'}}>
                        Assign Training
                      </button>
                      <button onClick={() => { setShowAssignTraining(false); setNewAssignment({training_id: '', organization_id: 'all'}); setAssignSuccess(''); }}
                        className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attention Needed */}
              {(() => {
                const notSetUp = organizations.filter(o => getOrgStatus(o) === 'Not Set Up');
                if (!notSetUp.length) return null;
                return (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 mb-8">
                    <p className="text-sm font-bold mb-3" style={{color: '#92400E'}}>🚨 Attention Needed</p>
                    <ul className="space-y-1">
                      {notSetUp.length > 0 && <li className="text-sm text-orange-700">• {notSetUp.length} organization{notSetUp.length > 1 ? 's' : ''} not fully set up (no users added)</li>}
                    </ul>
                  </div>
                );
              })()}

              {/* Platform Snapshot */}
              <h2 className="text-xs font-bold uppercase mb-4" style={{color: '#6B7280'}}>Platform Snapshot</h2>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Organizations', value: snapshot.totalOrgs },
                  { label: 'Active Orgs', value: snapshot.activeOrgs },
                  { label: 'Total Users', value: snapshot.totalUsers },
                  { label: 'Trainings in Library', value: snapshot.trainingsInLibrary },
                  { label: 'Trainings Assigned', value: snapshot.trainingsAssigned },
                  { label: 'Completion Rate', value: `${snapshot.completionRate}%` },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl shadow p-5">
                    <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>{stat.label}</p>
                    <p className="text-3xl font-bold" style={{color: '#0D2035'}}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Org Management Table */}
              <div className="bg-white rounded-xl shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{color: '#0D2035'}}>Organization Management</h2>
                  <button onClick={() => { setActivePage('organizations'); setShowAddOrg(true); }}
                    className="text-sm font-semibold px-3 py-1 rounded-lg text-white"
                    style={{backgroundColor: '#0D9488'}}>+ Add Organization</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Organization</th>
                      <th className="text-left pb-3">Users</th>
                      <th className="text-left pb-3">Assigned</th>
                      <th className="text-left pb-3">Completions</th>
                      <th className="text-left pb-3">Last Activity</th>
                      <th className="text-left pb-3">Status</th>
                      <th className="text-left pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr><td colSpan="7" className="py-6 text-center" style={{color: '#6B7280'}}>No organizations yet.</td></tr>
                    ) : organizations.map(org => {
                      const status = getOrgStatus(org);
                      const s = statusStyle(status);
                      return (
                        <tr key={org.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{org.name}</td>
                          <td className="py-3 text-gray-500">{getOrgUserCount(org.id)}</td>
                          <td className="py-3 text-gray-500">{getOrgAssignments(org.id)}</td>
                          <td className="py-3 text-gray-500">{getOrgCompletions(org.id)}</td>
                          <td className="py-3 text-gray-500">{getLastActivity(org.id)}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{backgroundColor: s.bg, color: s.color}}>{status}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button onClick={() => handleManageOrg(org)}
                                className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                                style={{backgroundColor: '#0D2035'}}>Manage</button>
                              <button onClick={() => handleImpersonate(org)}
                                className="text-xs font-semibold px-3 py-1 rounded-lg"
                                style={{backgroundColor: '#F3F4F6', color: '#0D2035'}}>Impersonate</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>System Activity Feed</h2>
                {completions.length === 0 ? (
                  <p className="text-sm" style={{color: '#6B7280'}}>No recent activity.</p>
                ) : (
                  <ul className="space-y-3">
                    {[...completions].reverse().slice(0, 10).map(c => (
                      <li key={c.id} className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: '#0D9488'}}></span>
                        <span className="text-gray-700">
                          <span className="font-medium">{c.staff_name}</span> completed <span className="font-medium">"{c.training_title}"</span>
                        </span>
                        <span className="ml-auto text-xs" style={{color: '#6B7280'}}>{c.completed_date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── ORGANIZATIONS ── */}
          {activePage === 'organizations' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#0D2035'}}>All Organizations</h1>
                <button onClick={() => setShowAddOrg(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#0D9488'}}>+ Add Organization</button>
              </div>

              {showAddOrg && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>New Organization</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Organization Name</label>
                      <input type="text" value={newOrg.name}
                        onChange={(e) => setNewOrg({...newOrg, name: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Contact Email</label>
                      <input type="email" value={newOrg.email}
                        onChange={(e) => setNewOrg({...newOrg, email: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Status</label>
                      <select value={newOrg.status} onChange={(e) => setNewOrg({...newOrg, status: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        <option>Active</option><option>Inactive</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase mb-2" style={{color: '#6B7280'}}>Level of Care</label>
                      <div className="grid grid-cols-2 gap-2">
                        {levels.map(level => (
                          <label key={level} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={newOrg.types?.includes(level) || false}
                              onChange={(e) => {
                                const current = newOrg.types || [];
                                setNewOrg({...newOrg, types: e.target.checked ? [...current, level] : current.filter(t => t !== level)});
                              }} />
                            {level}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => { saveOrganization(newOrg); setNewOrg({name:'',types:[],email:'',status:'Active'}); setShowAddOrg(false); }}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                      style={{backgroundColor: '#0D9488'}}>Save Organization</button>
                    <button onClick={() => setShowAddOrg(false)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Organization</th>
                      <th className="text-left pb-3">Type</th>
                      <th className="text-left pb-3">Contact</th>
                      <th className="text-left pb-3">Users</th>
                      <th className="text-left pb-3">Status</th>
                      <th className="text-left pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr><td colSpan="6" className="py-6 text-center" style={{color: '#6B7280'}}>No organizations yet.</td></tr>
                    ) : organizations.map(org => {
                      const status = getOrgStatus(org);
                      const s = statusStyle(status);
                      return (
                        <tr key={org.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{org.name}</td>
                          <td className="py-3 text-gray-500">{org.type}</td>
                          <td className="py-3 text-gray-500">{org.email}</td>
                          <td className="py-3 text-gray-500">{getOrgUserCount(org.id)}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{backgroundColor: s.bg, color: s.color}}>{status}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button onClick={() => handleManageOrg(org)}
                                className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                                style={{backgroundColor: '#0D2035'}}>Manage</button>
                              <button onClick={() => handleImpersonate(org)}
                                className="text-xs font-semibold px-3 py-1 rounded-lg"
                                style={{backgroundColor: '#F3F4F6', color: '#0D2035'}}>Impersonate</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TRAININGS ── */}
          {activePage === 'trainings' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#0D2035'}}>Training Library</h1>
                <button onClick={() => setShowAddTraining(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#0D9488'}}>+ Add Training</button>
              </div>

              {showAddTraining && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>New Training</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Training Name</label>
                      <input type="text" value={newTraining.title}
                        onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Category</label>
                      <select value={newTraining.category} onChange={(e) => setNewTraining({...newTraining, category: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        <option>All Staff</option><option>Direct Service Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Recurrence</label>
                      <select value={newTraining.recurrence} onChange={(e) => setNewTraining({...newTraining, recurrence: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        <option>New Hire</option><option>Annual</option><option>New Hire + Annual</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Description</label>
                      <textarea value={newTraining.description}
                        onChange={(e) => setNewTraining({...newTraining, description: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" rows={3} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => saveTraining(newTraining)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                      style={{backgroundColor: '#0D9488'}}>Save Training</button>
                    <button onClick={() => setShowAddTraining(false)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}

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
                    {trainings.length === 0 ? (
                      <tr><td colSpan="4" className="py-6 text-center" style={{color: '#6B7280'}}>No trainings yet.</td></tr>
                    ) : trainings.map(training => (
                      <tr key={training.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training.title}</td>
                        <td className="py-3 text-gray-500">{training.category}</td>
                        <td className="py-3 text-gray-500">{training.recurrence}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{backgroundColor: training.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                              color: training.status === 'Active' ? '#16A34A' : '#DC2626'}}>
                            {training.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ASSIGNMENTS ── */}
          {activePage === 'assignments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#0D2035'}}>Assignments</h1>
                <button onClick={() => setShowAssignTraining(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#0D9488'}}>⚡ Assign Training</button>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Organization</th>
                      <th className="text-left pb-3">Due Date</th>
                      <th className="text-left pb-3">Assigned At</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.length === 0 ? (
                      <tr><td colSpan="5" className="py-6 text-center" style={{color: '#6B7280'}}>No assignments yet. Use ⚡ Assign Training to get started.</td></tr>
                    ) : assignments.map(a => {
                      const training = trainings.find(t => t.id === a.training_id);
                      const org = organizations.find(o => o.id === a.organization_id);
                      return (
                        <tr key={a.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training?.title || '—'}</td>
                          <td className="py-3 text-gray-500">{org?.name || '—'}</td>
                          <td className="py-3 text-gray-500">{a.due_date}</td>
                          <td className="py-3 text-gray-500">{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}>
                              {a.status || 'Active'}
                            </span>
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
              <h1 className="text-2xl font-bold mb-6" style={{color: '#0D2035'}}>Completions</h1>
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Staff Member</th>
                      <th className="text-left pb-3">Completed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr><td colSpan="3" className="py-6 text-center" style={{color: '#6B7280'}}>No completions yet.</td></tr>
                    ) : completions.map(c => (
                      <tr key={c.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium" style={{color: '#0D9488'}}>{c.training_title}</td>
                        <td className="py-3 text-gray-500">{c.staff_name}</td>
                        <td className="py-3 text-gray-500">{c.completed_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activePage === 'settings' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{color: '#0D2035'}}>Settings</h1>
              <p style={{color: '#6B7280'}}>Settings coming soon.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}