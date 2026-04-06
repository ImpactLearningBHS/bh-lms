'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function ManageOrgPage() {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [staff, setStaff] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Edit org state
  const [editing, setEditing] = useState(false);
  const [editOrg, setEditOrg] = useState({});

  // Assign training state
  const [showAssign, setShowAssign] = useState(false);
  const [assignTrainingId, setAssignTrainingId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  // Remove staff state
  const [removingStaffId, setRemovingStaffId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrg(),
      fetchStaff(),
      fetchTrainings(),
      fetchAssignments(),
      fetchCompletions(),
    ]);
    setLoading(false);
  };

  const fetchOrg = async () => {
    const { data } = await supabase.from('organizations').select('*').eq('id', id).single();
    if (data) { setOrg(data); setEditOrg(data); }
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
    if (orgStaff) {
      const staffIds = orgStaff.map(s => s.id);
      if (staffIds.length > 0) {
        const { data } = await supabase.from('training_completions').select('*').in('user_id', staffIds);
        if (data) setCompletions(data);
      }
    }
  };

  const saveOrgEdits = async () => {
    const { data } = await supabase.from('organizations').update({
      name: editOrg.name,
      email: editOrg.email,
      status: editOrg.status,
    }).eq('id', id).select();
    if (data) { setOrg(data[0]); setEditing(false); }
  };

  const assignTraining = async () => {
    if (!assignTrainingId) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const targetTrainings = assignTrainingId === 'all' ? trainings : trainings.filter(t => t.id === assignTrainingId);

    const inserts = targetTrainings
      .filter(t => !assignments.some(a => a.training_id === t.id && a.organization_id === id))
      .map(t => ({
        training_id: t.id,
        organization_id: id,
        due_date: dueDateStr,
        status: 'Active',
        assigned_at: new Date().toISOString(),
      }));

    if (inserts.length === 0) {
      setAssignSuccess('Already assigned!');
    } else {
      const { data } = await supabase.from('training_assignments').insert(inserts).select();
      if (data) {
        setAssignments([...assignments, ...data]);
        setAssignSuccess(`✅ Assigned! Due ${dueDateStr}`);
      }
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'staff', label: `Staff (${staff.length})` },
    { id: 'trainings', label: `Trainings (${assignments.length})` },
    { id: 'completions', label: `Completions (${completions.length})` },
  ];

  const statusStyle = (status) => {
    if (status === 'Active') return { bg: '#DCFCE7', color: '#16A34A' };
    if (status === 'Inactive') return { bg: '#FEE2E2', color: '#DC2626' };
    return { bg: '#FEF9C3', color: '#CA8A04' };
  };

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
            style={{backgroundColor: '#0D9488'}}>
            Log Out
          </button>
        </div>
      </div>

      <div className="flex-1 p-8" style={{backgroundColor: '#F9FAFB'}}>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{color: '#0D2035'}}>{org?.name}</h1>
            <p className="text-sm mt-1" style={{color: '#6B7280'}}>{org?.email} · {org?.type}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = `/branch?impersonate_org=${id}&org_name=${encodeURIComponent(org?.name || '')}`}
              className="text-sm font-semibold px-4 py-2 rounded-lg"
              style={{backgroundColor: '#F3F4F6', color: '#0D2035'}}>
              Impersonate
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
              style={{backgroundColor: '#0D9488'}}>
              Edit Org
            </button>
          </div>
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-content-center" style={{backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
              <h2 className="text-lg font-bold mb-6" style={{color: '#0D2035'}}>Edit Organization</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Organization Name</label>
                  <input type="text" value={editOrg.name || ''}
                    onChange={(e) => setEditOrg({...editOrg, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Contact Email</label>
                  <input type="email" value={editOrg.email || ''}
                    onChange={(e) => setEditOrg({...editOrg, email: e.target.value})}
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
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveOrgEdits}
                  className="flex-1 py-2 rounded-lg text-white font-semibold text-sm"
                  style={{backgroundColor: '#0D9488'}}>Save Changes</button>
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Training modal */}
        {showAssign && (
          <div className="fixed inset-0 z-50" style={{backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
              <h2 className="text-lg font-bold mb-2" style={{color: '#0D2035'}}>⚡ Assign Training</h2>
              <p className="text-sm mb-6" style={{color: '#6B7280'}}>Assigning to {org?.name} — due in 30 days.</p>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Select Training</label>
                <select value={assignTrainingId}
                  onChange={(e) => setAssignTrainingId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                  <option value="">-- Choose a training --</option>
                  <option value="all">⚡ All Trainings</option>
                  {trainings.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              {assignSuccess && (
                <div className="mt-4 rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}>
                  <p className="text-sm font-medium" style={{color: '#16A34A'}}>{assignSuccess}</p>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={assignTraining}
                  disabled={!assignTrainingId}
                  className="flex-1 py-2 rounded-lg text-white font-semibold text-sm"
                  style={{backgroundColor: assignTrainingId ? '#0D9488' : '#D1D5DB'}}>
                  Assign
                </button>
                <button onClick={() => { setShowAssign(false); setAssignTrainingId(''); }}
                  className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderBottom: activeTab === tab.id ? '2px solid #0D9488' : '2px solid transparent',
                color: activeTab === tab.id ? '#0D9488' : '#6B7280',
                marginBottom: '-1px',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Staff', value: staff.length },
              { label: 'Trainings Assigned', value: assignments.length },
              { label: 'Completions', value: completions.length },
              { label: 'Status', value: org?.status || 'Active', isStatus: true },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl shadow p-5">
                <p className="text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>{stat.label}</p>
                {stat.isStatus ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{backgroundColor: statusStyle(stat.value).bg, color: statusStyle(stat.value).color}}>
                    {stat.value}
                  </span>
                ) : (
                  <p className="text-3xl font-bold" style={{color: '#0D2035'}}>{stat.value}</p>
                )}
              </div>
            ))}
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
                        style={{
                          backgroundColor: member.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                          color: member.status === 'Active' ? '#16A34A' : '#DC2626'
                        }}>
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
                    <th className="text-left pb-3">Status</th>
                    <th className="text-left pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr><td colSpan="5" className="py-6 text-center" style={{color: '#6B7280'}}>No trainings assigned yet.</td></tr>
                  ) : assignments.map(a => {
                    const training = trainings.find(t => t.id === a.training_id);
                    return (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training?.title || '—'}</td>
                        <td className="py-3 text-gray-500">{a.due_date}</td>
                        <td className="py-3 text-gray-500">{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}>
                            {a.status || 'Active'}
                          </span>
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
  );
}