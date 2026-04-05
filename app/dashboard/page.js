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
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [newTraining, setNewTraining] = useState({title: '', category: 'All Staff', recurrence: 'Annual', description: '', status: 'Active'});

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'impactlearningbhs@gmail.com') {
      window.location.href = '/login';
    } else {
      setIsAuthorized(true);
      fetchOrganizations();
      fetchTrainings();
      fetchCompletions();
    }
  };

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*');
    if (data) setOrganizations(data);
  };
  const fetchCompletions = async () => {
    const { data, error } = await supabase.from('training_completions').select('*');
    console.log('Completions:', data, error);
    if (data) setCompletions(data);
  };

  const fetchTrainings = async () => {
    const { data } = await supabase.from('trainings').select('*');
    if (data) setTrainings(data);
  };

  const saveTraining = async (training) => {
    const { data } = await supabase.from('trainings').insert([{
      title: training.title,
      category: training.category,
      recurrence: training.recurrence,
      description: training.description,
      status: training.status
    }]).select();
    if (data) {
      setTrainings([...trainings, data[0]]);
      setShowAddTraining(false);
      setNewTraining({title: '', category: 'All Staff', recurrence: 'Annual', description: '', status: 'Active'});
    }
  };

  const saveOrganization = async (org) => {
    const { data } = await supabase.from('organizations').insert([{
      name: org.name,
      type: org.types?.join(', '),
      email: org.email,
      status: org.status
    }]).select();
    if (data) setOrganizations([...organizations, data[0]]);
  };

  const navItems = [
    { id: 'dashboard', label: 'Admin Dashboard' },
    { id: 'organizations', label: 'All Organizations' },
    { id: 'trainings', label: 'Training Library' },
    { id: 'completions', label: 'Completions' },
    { id: 'settings', label: 'Settings' },
  ];

  const levels = [
    '1.0 - Outpatient',
    '2.1 - Intensive Outpatient',
    '2.5 - Partial Hospitalization',
    '3.1 - Clinically Managed Low-Intensity Residential',
    '3.3 - Clinically Managed Population-Specific High-Intensity Residential',
    '3.5 - Clinically Managed High-Intensity Residential',
    '3.7 - Medically Monitored Intensive Inpatient',
    '4.0 - Medically Managed Intensive Inpatient Services',
    'Psychiatric Rehabilitation Programs (PRP)',
    'Outpatient Mental Health Clinic (OMHC)',
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
          <span className="text-sm font-medium text-white">Platform Admin</span>
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
            <p className="text-xs font-semibold uppercase mb-1 text-gray-400">Platform Admin</p>
            <p className="text-sm font-bold" style={{color: '#6B2737'}}>Administrator</p>
            <p className="text-xs text-gray-400">All Organizations</p>
          </div>
          <p className="text-xs font-semibold uppercase px-4 mb-2 text-gray-400">Platform</p>
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
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold" style={{color: '#6B2737'}}>Admin Dashboard</h1>
                <button
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#22C55E'}}
                >
                  Assign Training to Organizations
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-6">Overview of all organizations — platform-wide view</p>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Organizations</p>
                  <p className="text-3xl font-bold" style={{color: '#6B2737'}}>{organizations.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Total Staff</p>
                  <p className="text-3xl font-bold" style={{color: '#6B2737'}}>0</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Overdue</p>
                  <p className="text-3xl font-bold text-red-500">0</p>
                  <p className="text-xs text-gray-400">Require action</p>
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Training Library</p>
                  <p className="text-3xl font-bold" style={{color: '#6B2737'}}>{trainings.length}</p>
                  <p className="text-xs text-gray-400">Ready to assign</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-lg font-bold mb-4" style={{color: '#6B2737'}}>Organization Overview</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase border-b">
                      <th className="text-left pb-3">Organization</th>
                      <th className="text-left pb-3">Type</th>
                      <th className="text-left pb-3">Staff</th>
                      <th className="text-left pb-3">Trainings</th>
                      <th className="text-left pb-3">Compliance</th>
                      <th className="text-left pb-3">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-gray-400">No organizations yet.</td>
                      </tr>
                    ) : (
                      organizations.map(org => (
                        <tr key={org.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{org.name}</td>
                          <td className="py-3 text-gray-500">{org.type}</td>
                          <td className="py-3 text-gray-500">0</td>
                          <td className="py-3 text-gray-500">0</td>
                          <td className="py-3 text-gray-500">0%</td>
                          <td className="py-3 text-gray-500">0</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{color: '#6B2737'}}>Training Assignment Status</h2>
                  <button
                    className="text-sm font-semibold px-3 py-1 rounded-lg text-white"
                    style={{backgroundColor: '#22C55E'}}
                  >
                    + Assign
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase border-b">
                    <th className="text-left pb-3">Training</th>
                      <th className="text-left pb-3">Staff Member</th>
                      <th className="text-left pb-3">Completed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-6 text-center text-gray-400">No completions yet.</td>
                      </tr>
                    ) : (
                      completions.map(completion => (
                        <tr key={completion.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{completion.training_title}</td>
                          <td className="py-3 text-gray-500">{completion.staff_name}</td>
                          <td className="py-3 text-gray-500">{completion.completed_date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activePage === 'organizations' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#6B2737'}}>All Organizations</h1>
                <button
                  onClick={() => setShowAddOrg(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#22C55E'}}
                >
                  + Add Organization
                </button>
              </div>

              {showAddOrg && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#6B2737'}}>New Organization</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Organization Name</label>
                      <input
                        type="text"
                        value={newOrg.name}
                        onChange={(e) => setNewOrg({...newOrg, name: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={newOrg.email}
                        onChange={(e) => setNewOrg({...newOrg, email: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                      <select
                        value={newOrg.status}
                        onChange={(e) => setNewOrg({...newOrg, status: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Level of Care (select all that apply)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {levels.map(level => (
                          <label key={level} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newOrg.types?.includes(level) || false}
                              onChange={(e) => {
                                const current = newOrg.types || [];
                                if (e.target.checked) {
                                  setNewOrg({...newOrg, types: [...current, level]});
                                } else {
                                  setNewOrg({...newOrg, types: current.filter(t => t !== level)});
                                }
                              }}
                            />
                            {level}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        saveOrganization(newOrg);
                        setNewOrg({name: '', types: [], email: '', status: 'Active'});
                        setShowAddOrg(false);
                      }}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                      style={{backgroundColor: '#22C55E'}}
                    >
                      Save Organization
                    </button>
                    <button
                      onClick={() => setShowAddOrg(false)}
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
                      <th className="text-left pb-3">Organization</th>
                      <th className="text-left pb-3">Type</th>
                      <th className="text-left pb-3">Contact</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-400">No organizations yet.</td>
                      </tr>
                    ) : (
                      organizations.map(org => (
                        <tr key={org.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{org.name}</td>
                          <td className="py-3 text-gray-500">{org.type}</td>
                          <td className="py-3 text-gray-500">{org.email}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: org.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                                color: org.status === 'Active' ? '#16A34A' : '#DC2626'
                              }}
                            >
                              {org.status}
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
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold" style={{color: '#6B2737'}}>Training Library</h1>
                <button
                  onClick={() => setShowAddTraining(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                  style={{backgroundColor: '#22C55E'}}
                >
                  + Add Training
                </button>
              </div>

              {showAddTraining && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#6B2737'}}>New Training</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Training Name</label>
                      <input
                        type="text"
                        value={newTraining.title}
                        onChange={(e) => setNewTraining({...newTraining, title: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                      <select
                        value={newTraining.category}
                        onChange={(e) => setNewTraining({...newTraining, category: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      >
                        <option>All Staff</option>
                        <option>Direct Service Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Recurrence</label>
                      <select
                        value={newTraining.recurrence}
                        onChange={(e) => setNewTraining({...newTraining, recurrence: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                      >
                        <option>New Hire</option>
                        <option>Annual</option>
                        <option>New Hire + Annual</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                      <textarea
                        value={newTraining.description}
                        onChange={(e) => setNewTraining({...newTraining, description: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => saveTraining(newTraining)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                      style={{backgroundColor: '#22C55E'}}
                    >
                      Save Training
                    </button>
                    <button
                      onClick={() => setShowAddTraining(false)}
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
                      <th className="text-left pb-3">Training Name</th>
                      <th className="text-left pb-3">Category</th>
                      <th className="text-left pb-3">Recurrence</th>
                      <th className="text-left pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-gray-400">No trainings yet. Add one to get started.</td>
                      </tr>
                    ) : (
                      trainings.map(training => (
                        <tr key={training.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#6B2737'}}>{training.title}</td>
                          <td className="py-3 text-gray-500">{training.category}</td>
                          <td className="py-3 text-gray-500">{training.recurrence}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: training.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                                color: training.status === 'Active' ? '#16A34A' : '#DC2626'
                              }}
                            >
                              {training.status || 'Active'}
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

          {activePage === 'completions' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{color: '#6B2737'}}>Completions</h1>
              <p className="text-gray-500">Completion tracking coming soon.</p>
            </div>
          )}

          {activePage === 'settings' && (
            <div>
              <h1 className="text-2xl font-bold mb-6" style={{color: '#6B2737'}}>Settings</h1>
              <p className="text-gray-500">Settings coming soon.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}