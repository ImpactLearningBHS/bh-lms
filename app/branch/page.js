'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function BranchPage() {
  const [activePage, setActivePage] = useState('dashboard');
  const [orgName, setOrgName] = useState('Branch Admin');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [trainings, setTrainings] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [newStaff, setNewStaff] = useState({full_name: '', email: '', role: 'Therapist', hire_date: '', status: 'Active'});
  useEffect(() => {
    checkBranchAuth();
    fetchCurrentUser();
    fetchStaff();
    fetchTrainings();
    fetchCompletions();
  }, []);

  const checkBranchAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
    } else {
      setIsAuthorized(true);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*, organizations(name)')
        .eq('auth_id', user.id)
        .single();
      if (data) {
        setCurrentUser(data);
        setOrgName(data.organizations?.name || 'Branch Admin');
      }
    }
  };

  const fetchStaff = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', user.id)
      .single();

    if (me?.organization_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', me.organization_id)
.neq('role', 'Platform Admin');
      if (data) setStaff(data);
    }
  };

  const fetchTrainings = async () => {
    const { data } = await supabase.from('trainings').select('*');
    if (data) setTrainings(data);
  };

  const fetchCompletions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: me } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', user.id)
      .single();

    if (me?.organization_id) {
      const { data: orgStaff } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', me.organization_id);

      if (orgStaff) {
        const staffIds = orgStaff.map(s => s.id);
        const { data } = await supabase
          .from('training_completions')
          .select('*')
          .in('user_id', staffIds);
        if (data) setCompletions(data);
      }
    }
  };

  const markComplete = async (training) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('training_completions').insert([{
      training_id: training.id,
      user_id: currentUser?.id,
      staff_name: currentUser?.full_name,
      training_title: training.title,
      completed_date: today
    }]).select();
    if (data) {
      setCompletions([...completions, data[0]]);
    }
  };

  const getTrainingsForRole = (role) => {
    const directCareRoles = ['Therapist', 'BHT', 'PMHNP', 'Clinical Supervisor', 'Peer Support Specialist', 'PRP Case Worker'];
    if (directCareRoles.includes(role)) {
      return trainings;
    } else {
      return trainings.filter(t => t.category === 'All Staff');
    }
  };

  const saveStaff = async (member) => {
    if (!currentUser?.organization_id) {
      alert('Error: Could not determine your organization. Please refresh and try again.');
      return;
    }

    const response = await fetch('/api/create-user', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        hire_date: member.hire_date,
        status: member.status,
        organization_id: currentUser.organization_id
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'staff', label: 'My Staff' },
    { id: 'trainings', label: 'Trainings' },
    { id: 'completions', label: 'Completions' },
  ];

  const roles = [
    'Therapist',
    'BHT',
    'PMHNP',
    'Clinical Supervisor',
    'Peer Support Specialist',
    'PRP Case Worker',
    'Administration',
    'Compliance Officer',
    'Billing Specialist',
    'Other'
  ];

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#FDF6F0'}}>
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#FDF6F0'}}>

      <div className="flex items-center justify-between px-8 py-4" style={{backgroundColor: '#9B4757'}}>
        <img src="/ImpactLearningTransparent" alt="Impact Workforce" className="h-20" />
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">{orgName}</span>
          <button
            onClick={() => window.location.href = '/login'}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{backgroundColor: '#22C55E', color: 'white'}}
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="flex flex-1">

        <div className="w-64 flex flex-col py-6 px-4 gap-1 bg-white" style={{boxShadow: '2px 0 8px rgba(0,0,0,0.06)'}}>
          <div className="px-4 mb-6 pb-6 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase mb-1 text-gray-400">Branch Admin</p>
            <p className="text-sm font-bold" style={{color: '#6B2737'}}>{orgName}</p>
          </div>
          <p className="text-xs font-semibold uppercase px-4 mb-2 text-gray-400">Menu</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="text-left px-4 py-3 text-sm transition-colors"
              style={{
                borderLeft: activePage === item.id ? '4px solid #6B2737' : '4px solid transparent',
                color: activePage === item.id ? '#6B2737' : '#6B6B6B',
                fontWeight: activePage === item.id ? '700' : '500',
                backgroundColor: activePage === item.id ? '#FDF0F2' : 'transparent'
              }}
            >
              {item.label}
            </button>
          ))}
          <div className="mt-auto px-4 pt-6 border-t border-gray-100">
            <button
              onClick={() => window.location.href = '/login'}
              className="text-sm font-medium w-full text-left text-gray-400"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex-1 p-8">

          {activePage === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#6B2737'}}>Branch Dashboard</h1>
              <p className="text-gray-400 text-sm mb-6">Overview of your organization</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Total Staff</p>
                  <p className="text-3xl font-bold" style={{color: '#6B2737'}}>{staff.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Trainings Assigned</p>
                  <p className="text-3xl font-bold" style={{color: '#6B2737'}}>0</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Overdue</p>
                  <p className="text-3xl font-bold text-red-500">0</p>
                </div>
              </div>
            </div>
          )}

          {activePage === 'staff' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#6B2737'}}>My Staff</h1>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#22C55E'}}
                >
                  + Add Staff
                </button>
              </div>

              {showAddStaff && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#6B2737'}}>New Staff Member</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newStaff.full_name}
                        onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Role</label>
                      <select
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      >
                        {roles.map(role => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hire Date</label>
                      <input
                        type="date"
                        value={newStaff.hire_date}
                        onChange={(e) => setNewStaff({...newStaff, hire_date: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                      <select
                        value={newStaff.status}
                        onChange={(e) => setNewStaff({...newStaff, status: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => saveStaff(newStaff)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                      style={{backgroundColor: '#22C55E'}}
                    >
                      Save Staff Member
                    </button>
                    <button
                      onClick={() => setShowAddStaff(false)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase border-b">
                      <th className="text-left pb-3">Name</th>
                      <th className="text-left pb-3">Email</th>
                      <th className="text-left pb-3">Role</th>
                      <th className="text-left pb-3">Hire Date</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-gray-400">No staff yet. Add one to get started.</td>
                      </tr>
                    ) : (
                      staff.map(member => (
                        <tr key={member.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{member.full_name}</td>
                          <td className="py-3 text-gray-500">{member.email}</td>
                          <td className="py-3 text-gray-500">{member.role}</td>
                          <td className="py-3 text-gray-500">{member.hire_date}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: member.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                                color: member.status === 'Active' ? '#16A34A' : '#DC2626'
                              }}
                            >
                              {member.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

{activePage === 'trainings' && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#6B2737'}}>Trainings</h1>
              <p className="text-gray-400 text-sm mb-6">All required trainings for your organization</p>

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase border-b">
                      <th className="text-left pb-3">Training Name</th>
                      <th className="text-left pb-3">Category</th>
                      <th className="text-left pb-3">Recurrence</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                  {trainings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-400">No trainings assigned yet.</td>
                      </tr>
                    ) : (
                      getTrainingsForRole(currentUser?.role || 'Other').map(training => {
                        const isCompleted = completions.some(c => 
                          c.training_id === training.id
                        );
                        return (
                        <tr key={training.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{training.title}</td>
                          <td className="py-3 text-gray-500">{training.category}</td>
                          <td className="py-3 text-gray-500">{training.recurrence}</td>
                          <td className="py-3">
                            {isCompleted ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold"
                                style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}
                              >
                                Completed
                              </span>
                            ) : (
                              <button
                                onClick={() => window.location.href = `/quiz?training_id=${training.id}&title=${encodeURIComponent(training.title)}`}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                                style={{backgroundColor: '#22C55E'}}
                              >
                                Take Quiz
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

{activePage === 'completions' && (
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#6B2737'}}>Completions</h1>
              <p className="text-gray-400 text-sm mb-6">Track training completions for your staff</p>

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase border-b">
                      <th className="text-left pb-3">Staff Member</th>
                      <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Completed Date</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-400">No completions recorded yet.</td>
                      </tr>
                    ) : (
                      completions.map(completion => (
                        <tr key={completion.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{completion.staff_name}</td>
                          <td className="py-3 text-gray-500">{completion.training_title}</td>
                          <td className="py-3 text-gray-500">{completion.completed_date}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A'
                              }}
                            >
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
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