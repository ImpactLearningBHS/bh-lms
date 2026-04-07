'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

const BILLING_PLANS = [
  'Starter — up to 15',
  'Growth — up to 25',
  'Professional — up to 40',
  'Enterprise — up to 75',
  'Elite — 100+',
];

const LEVELS = [
  '1.0 - Outpatient','2.1 - Intensive Outpatient','2.5 - Partial Hospitalization',
  '3.1 - Clinically Managed Low-Intensity Residential',
  '3.3 - Clinically Managed Population-Specific High-Intensity Residential',
  '3.5 - Clinically Managed High-Intensity Residential',
  '3.7 - Medically Monitored Intensive Inpatient',
  '4.0 - Medically Managed Intensive Inpatient Services',
  'Psychiatric Rehabilitation Programs (PRP)','Outpatient Mental Health Clinic (OMHC)','Other'
];

export default function ManageOrgPage() {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [staff, setStaff] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editOrg, setEditOrg] = useState({});
  const [showAssign, setShowAssign] = useState(false);
  const [assignTrainingId, setAssignTrainingId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [removingStaffId, setRemovingStaffId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchOrg(), fetchStaff(), fetchTrainings(), fetchAssignments(), fetchCompletions()]);
    setLoading(false);
  };

  const fetchOrg = async () => {
    const { data } = await supabase.from('organizations').select('*').eq('id', id).single();
    if (data) { setOrg(data); setEditOrg({...data, types: data.type ? data.type.split(', ') : []}); }
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from('users').select('*').eq('organization_id', id).neq('role', 'Platform Admin');
    if (data) setStaff(data);
  };

  const fetchTrainings = async () => {
    const { data } = await supabase.from('trainings').select('*');
    if (data) setTrainings(data);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from('training_assignments').select('*').eq('organization_id', id);
    if (data) setAssignments(data);
  };

  const fetchCompletions = async () => {
    const { data: orgStaff } = await supabase.from('users').select('id').eq('organization_id', id);
    if (orgStaff && orgStaff.length > 0) {
      const staffIds = orgStaff.map(s => s.id);
      const { data } = await supabase.from('training_completions').select('*').in('user_id', staffIds);
      if (data) setCompletions(data);
    }
  };

  const saveOrgEdits = async () => {
    const { data } = await supabase.from('organizations').update({
      name: editOrg.name,
      phone: editOrg.phone,
      address: editOrg.address,
      city: editOrg.city,
      state: editOrg.state,
      zip: editOrg.zip,
      billing_plan: editOrg.billing_plan,
      status: editOrg.status,
      type: editOrg.types?.join(', '),
    }).eq('id', id).select();
    if (data) {
      setOrg(data[0]);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setEditing(false); }, 1500);
    }
  };

  const assignTraining = async () => {
    if (!assignTrainingId) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const targetTrainings = assignTrainingId === 'all' ? trainings : trainings.filter(t => t.id === assignTrainingId);
    const inserts = targetTrainings
      .filter(t => !assignments.some(a => a.training_id === t.id && a.organization_id === id))
      .map(t => ({ training_id: t.id, organization_id: id, due_date: dueDateStr, status: 'Active', assigned_at: new Date().toISOString() }));
    if (inserts.length === 0) {
      setAssignSuccess('Already assigned!');
    } else {
      const { data } = await supabase.from('training_assignments').insert(inserts).select();
      if (data) { setAssignments([...assignments, ...data]); setAssignSuccess(`✅ Assigned! Due ${dueDateStr}`); }
    }
    setTimeout(() => { setAssignSuccess(''); setShowAssign(false); setAssignTrainingId(''); }, 2500);
  };

  const removeStaff = async (staffId) => {
    const { error } = await supabase.from('users').delete().eq('id', staffId);
    if (!error) setStaff(staff.filter(s => s.id !== staffId));
    setRemovingStaffId(null);
  };

  const removeAssignment = async (assignmentId) => {
    const { error } = await supabase.from('training_assignments').delete().eq('id', assignmentId);
    if (!error) setAssignments(assignments.filter(a => a.id !== assignmentId));
  };

  const getComplianceRate = (trainingId) => {
    if (staff.length === 0) return 0;
    const completed = completions.filter(c => c.training_id === trainingId).length;
    return Math.round((completed / staff.length) * 100);
  };

  const overdueCount = assignments.filter(a =>
    a.due_date && new Date(a.due_date) < new Date() && !completions.some(c => c.training_id === a.training_id)
  ).length;

  const orgInitials = org?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'ORG';

  const statusStyle = (status) => {
    if (status === 'Active') return { bg: '#DCFCE7', color: '#16A34A' };
    if (status === 'Inactive') return { bg: '#FEE2E2', color: '#DC2626' };
    return { bg: '#FEF9C3', color: '#CA8A04' };
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'staff', label: `Staff (${staff.length})` },
    { id: 'trainings', label: `Trainings (${assignments.length})` },
    { id: 'completions', label: `Completions (${completions.length})` },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4" style={{backgroundColor: '#0D2035'}}>
        <img src="/ImpactWorkforce.png" alt="Impact Workforce" className="h-10" />
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.href = '/dashboard'}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{backgroundColor: 'rgba(255,255,255,0.1)', color: 'white'}}>
            ← Back to Dashboard
          </button>
          <button onClick={() => window.location.href = '/login'}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{backgroundColor: '#0D9488'}}>Log Out</button>
        </div>
      </div>

      <div className="flex flex-1">

        {/* Sidebar */}
        <div className="w-64 flex flex-col py-6 px-4 gap-1" style={{backgroundColor: '#0D2035'}}>
          <div className="px-4 mb-6 pb-6 border-b border-white/10">
            <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Managing Org</p>
            <p className="text-sm font-bold text-white">{org?.name}</p>
          </div>
          <p className="text-xs font-semibold uppercase px-4 mb-2" style={{color: '#6B7280'}}>Sections</p>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="text-left px-4 py-3 text-sm transition-colors rounded-lg"
              style={{
                borderLeft: activeTab === tab.id ? '4px solid #0D9488' : '4px solid transparent',
                color: activeTab === tab.id ? '#0D9488' : '#9CA3AF',
                fontWeight: activeTab === tab.id ? '700' : '500',
                backgroundColor: activeTab === tab.id ? 'rgba(13,148,136,0.1)' : 'transparent'
              }}>
              {tab.label}
            </button>
          ))}
          <div className="mt-auto px-4 pt-6 border-t border-white/10">
            <button onClick={() => window.location.href = '/dashboard'}
              className="text-sm font-medium w-full text-left" style={{color: '#6B7280'}}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8" style={{backgroundColor: '#F9FAFB'}}>

          {/* Org Header Card */}
          <div className="rounded-2xl p-6 mb-6 flex items-center justify-between" style={{backgroundColor: '#0D2035'}}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold"
                style={{backgroundColor: 'rgba(13,148,136,0.2)', color: '#0D9488'}}>
                {orgInitials}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white">{org?.name}</h1>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{backgroundColor: statusStyle(org?.status).bg, color: statusStyle(org?.status).color}}>
                    {org?.status || 'Active'}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{color: '#6B7280'}}>
                  {org?.city && org?.state ? `${org.city}, ${org.state}` : ''}
                  {org?.phone ? ` · ${org.phone}` : ''}
                  {org?.billing_plan ? ` · ${org.billing_plan}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.location.href = `/branch?impersonate_org=${id}&org_name=${encodeURIComponent(org?.name || '')}`}
                className="text-sm font-semibold px-4 py-2 rounded-lg"
                style={{backgroundColor: 'rgba(255,255,255,0.1)', color: 'white'}}>
                Impersonate
              </button>
              <button onClick={() => setEditing(true)}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                style={{backgroundColor: '#0D9488'}}>
                Edit Org
              </button>
              <button onClick={() => setShowAssign(true)}
                className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                style={{backgroundColor: '#0D9488'}}>
                ⚡ Assign Training
              </button>
            </div>
          </div>

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 overflow-y-auto" style={{backgroundColor: 'rgba(0,0,0,0.4)'}}>
              <div className="flex items-start justify-center min-h-screen pt-10 pb-10">
                <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl mx-4">
                  <h2 className="text-lg font-bold mb-6" style={{color: '#0D2035'}}>Edit Organization</h2>

                  <div className="grid grid-cols-2 gap-4">

                    {/* Basic Info */}
                    <div className="col-span-2">
                      <p className="text-xs font-bold uppercase mb-3" style={{color: '#0D9488'}}>Basic Info</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Organization Name</label>
                      <input type="text" value={editOrg.name || ''}
                        onChange={(e) => setEditOrg({...editOrg, name: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Phone Number</label>
                      <input type="tel" value={editOrg.phone || ''}
                        onChange={(e) => setEditOrg({...editOrg, phone: e.target.value})}
                        placeholder="(555) 555-5555"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Status</label>
                      <select value={editOrg.status || 'Active'}
                        onChange={(e) => setEditOrg({...editOrg, status: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Billing Plan</label>
                      <select value={editOrg.billing_plan || ''}
                        onChange={(e) => setEditOrg({...editOrg, billing_plan: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                        <option value="">— Select plan —</option>
                        {BILLING_PLANS.map(plan => <option key={plan}>{plan}</option>)}
                      </select>
                    </div>

                    {/* Address */}
                    <div className="col-span-2 mt-2">
                      <p className="text-xs font-bold uppercase mb-3" style={{color: '#0D9488'}}>Address</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Street Address</label>
                      <input type="text" value={editOrg.address || ''}
                        onChange={(e) => setEditOrg({...editOrg, address: e.target.value})}
                        placeholder="123 Main Street"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>City</label>
                      <input type="text" value={editOrg.city || ''}
                        onChange={(e) => setEditOrg({...editOrg, city: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>State</label>
                        <input type="text" value={editOrg.state || ''}
                          onChange={(e) => setEditOrg({...editOrg, state: e.target.value})}
                          placeholder="MD"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Zip</label>
                        <input type="text" value={editOrg.zip || ''}
                          onChange={(e) => setEditOrg({...editOrg, zip: e.target.value})}
                          placeholder="21201"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                      </div>
                    </div>

                    {/* Level of Care */}
                    <div className="col-span-2 mt-2">
                      <p className="text-xs font-bold uppercase mb-3" style={{color: '#0D9488'}}>Level of Care / Programs</p>
                      <div className="grid grid-cols-2 gap-2">
                        {LEVELS.map(level => (
                          <label key={level} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox"
                              checked={editOrg.types?.includes(level) || false}
                              onChange={(e) => {
                                const current = editOrg.types || [];
                                setEditOrg({...editOrg, types: e.target.checked ? [...current, level] : current.filter(t => t !== level)});
                              }} />
                            {level}
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>

                  {saveSuccess && (
                    <div className="mt-4 rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}>
                      <p className="text-sm font-medium" style={{color: '#16A34A'}}>✅ Changes saved!</p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button onClick={saveOrgEdits}
                      className="flex-1 py-2 rounded-lg text-white font-semibold text-sm"
                      style={{backgroundColor: '#0D9488'}}>Save Changes</button>
                    <button onClick={() => setEditing(false)}
                      className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assign Modal */}
          {showAssign && (
            <div className="fixed inset-0 z-50" style={{backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <h2 className="text-lg font-bold mb-2" style={{color: '#0D2035'}}>⚡ Assign Training</h2>
                <p className="text-sm mb-6" style={{color: '#6B7280'}}>Assigning to {org?.name} — due in 30 days.</p>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Select Training</label>
                  <select value={assignTrainingId} onChange={(e) => setAssignTrainingId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                    <option value="">-- Choose a training --</option>
                    <option value="all">⚡ All Trainings</option>
                    {trainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                {assignSuccess && (
                  <div className="mt-4 rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}>
                    <p className="text-sm font-medium" style={{color: '#16A34A'}}>{assignSuccess}</p>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button onClick={assignTraining} disabled={!assignTrainingId}
                    className="flex-1 py-2 rounded-lg text-white font-semibold text-sm"
                    style={{backgroundColor: assignTrainingId ? '#0D9488' : '#D1D5DB'}}>Assign</button>
                  <button onClick={() => { setShowAssign(false); setAssignTrainingId(''); }}
                    className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Staff', value: staff.length, sub: `${staff.filter(s => s.status === 'Active').length} active`, accent: '#0D9488' },
                  { label: 'Trainings Assigned', value: assignments.length, sub: assignments[0]?.due_date ? `Due ${assignments[0].due_date}` : 'No due date', accent: '#7C3AED' },
                  { label: 'Completions', value: completions.length, sub: staff.length > 0 ? `${Math.round((completions.length / Math.max(assignments.length * staff.length, 1)) * 100)}% rate` : '—', accent: '#16A34A' },
                  { label: 'Overdue', value: overdueCount, sub: overdueCount === 0 ? 'All on track' : 'Need attention', accent: overdueCount > 0 ? '#DC2626' : '#6B7280' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl shadow p-5"
                    style={{borderLeft: `4px solid ${stat.accent}`}}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>{stat.label}</p>
                    <p className="text-3xl font-bold mb-1" style={{color: stat.label === 'Overdue' && stat.value > 0 ? '#DC2626' : '#0D2035'}}>{stat.value}</p>
                    <p className="text-xs" style={{color: stat.accent}}>{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-base font-bold mb-4" style={{color: '#0D2035'}}>Recent Activity</h2>
                  {completions.length === 0 ? (
                    <p className="text-sm" style={{color: '#6B7280'}}>No activity yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {[...completions].reverse().slice(0, 5).map(c => (
                        <li key={c.id} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{backgroundColor: '#0D9488'}}></span>
                          <div>
                            <p className="text-sm font-medium" style={{color: '#0D2035'}}>{c.staff_name} completed "{c.training_title}"</p>
                            <p className="text-xs" style={{color: '#6B7280'}}>{c.completed_date}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-base font-bold mb-4" style={{color: '#0D2035'}}>Training Compliance</h2>
                  {assignments.length === 0 ? (
                    <p className="text-sm" style={{color: '#6B7280'}}>No trainings assigned yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map(a => {
                        const training = trainings.find(t => t.id === a.training_id);
                        const rate = getComplianceRate(a.training_id);
                        return (
                          <div key={a.id}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium" style={{color: '#0D2035'}}>{training?.title || '—'}</span>
                              <span className="text-sm font-bold" style={{color: rate === 100 ? '#16A34A' : '#0D9488'}}>
                                {completions.filter(c => c.training_id === a.training_id).length}/{staff.length}
                              </span>
                            </div>
                            <div className="rounded-full h-2" style={{backgroundColor: '#F3F4F6'}}>
                              <div className="h-2 rounded-full" style={{width: `${rate}%`, backgroundColor: rate === 100 ? '#16A34A' : '#0D9488'}}></div>
                            </div>
                            <p className="text-xs mt-1" style={{color: '#6B7280'}}>{rate}% complete</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STAFF ── */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-xl shadow p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                    <th className="text-left pb-3">Name</th>
                    <th className="text-left pb-3">Email</th>
                    <th className="text-left pb-3">Role</th>
                    <th className="text-left pb-3">Status</th>
                    <th className="text-left pb-3">Actions</th>
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
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{backgroundColor: member.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                            color: member.status === 'Active' ? '#16A34A' : '#DC2626'}}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {removingStaffId === member.id ? (
                          <div className="flex gap-2">
                            <button onClick={() => removeStaff(member.id)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                              style={{backgroundColor: '#DC2626'}}>Confirm</button>
                            <button onClick={() => setRemovingStaffId(null)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg text-gray-500 bg-gray-100">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setRemovingStaffId(member.id)}
                            className="text-xs font-semibold px-3 py-1 rounded-lg"
                            style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}>Remove</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TRAININGS ── */}
          {activeTab === 'trainings' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAssign(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#0D9488'}}>⚡ Assign Training</button>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Due Date</th>
                      <th className="text-left pb-3">Assigned At</th>
                      <th className="text-left pb-3">Compliance</th>
                      <th className="text-left pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.length === 0 ? (
                      <tr><td colSpan="5" className="py-6 text-center" style={{color: '#6B7280'}}>No trainings assigned yet.</td></tr>
                    ) : assignments.map(a => {
                      const training = trainings.find(t => t.id === a.training_id);
                      const rate = getComplianceRate(a.training_id);
                      return (
                        <tr key={a.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training?.title || '—'}</td>
                          <td className="py-3 text-gray-500">{a.due_date}</td>
                          <td className="py-3 text-gray-500">{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 rounded-full" style={{backgroundColor: '#F3F4F6'}}>
                                <div className="h-2 rounded-full" style={{width: `${rate}%`, backgroundColor: rate === 100 ? '#16A34A' : '#0D9488'}}></div>
                              </div>
                              <span className="text-xs" style={{color: '#6B7280'}}>{rate}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <button onClick={() => removeAssignment(a.id)}
                              className="text-xs font-semibold px-3 py-1 rounded-lg"
                              style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}>Remove</button>
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
          {activeTab === 'completions' && (
            <div className="bg-white rounded-xl shadow p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                    <th className="text-left pb-3">Staff Member</th>
                    <th className="text-left pb-3">Training</th>
                    <th className="text-left pb-3">Completed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {completions.length === 0 ? (
                    <tr><td colSpan="3" className="py-6 text-center" style={{color: '#6B7280'}}>No completions yet.</td></tr>
                  ) : completions.map(c => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-3 font-medium" style={{color: '#0D9488'}}>{c.staff_name}</td>
                      <td className="py-3 text-gray-500">{c.training_title}</td>
                      <td className="py-3 text-gray-500">{c.completed_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}