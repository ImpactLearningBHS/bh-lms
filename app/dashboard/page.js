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

export default function DashboardPage() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '', types: [], phone: '', status: 'Active',
    adminName: '', adminEmail: '',
    address: '', city: '', state: '', zip: '',
    billing_plan: 'Starter — up to 15'
  });
  const [trainings, setTrainings] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAssignTraining, setShowAssignTraining] = useState(false);
  const [newTraining, setNewTraining] = useState({
    title: '', category: 'All Staff', recurrence: 'Annual',
    description: '', status: 'Active',
    content_type: 'video', content_text: '',
  });
  const [videoFile, setVideoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [newAssignment, setNewAssignment] = useState({training_id: '', organization_id: 'all'});
  const [assignSuccess, setAssignSuccess] = useState('');
  const [platformSettings, setPlatformSettings] = useState({ default_due_days: 15, support_email: 'impactlearningbhs@gmail.com' });

  // Edit training state
  const [editingTraining, setEditingTraining] = useState(null);
  const [editVideoFile, setEditVideoFile] = useState(null);
  const [editPdfFile, setEditPdfFile] = useState(null);
  const [editUploadProgress, setEditUploadProgress] = useState('');
  const [editSaved, setEditSaved] = useState(false);
  const [editTab, setEditTab] = useState('content');

  // Quiz question state
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [questionsSaved, setQuestionsSaved] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [manualMode, setManualMode] = useState(false);
  const [manualQuestions, setManualQuestions] = useState([]);

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
    await Promise.all([fetchOrganizations(), fetchTrainings(), fetchCompletions(), fetchAllUsers(), fetchAssignments(), fetchSettings()]);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setPlatformSettings(data);
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase.from('organizations').select('*');
    if (error) console.error('Org fetch error:', error.message);
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

  const fetchExistingQuestions = async (trainingId) => {
    const { data } = await supabase
      .from('questions')
      .select('*, answers(*)')
      .eq('training_id', trainingId);
    if (data) setExistingQuestions(data);
  };

  const getPlanLimit = (plan) => BILLING_PLANS[plan] || 999;

  const getOrgCapacityStatus = (org) => {
    const count = getOrgUserCount(org.id);
    const limit = getPlanLimit(org.billing_plan);
    const pct = limit === 999 ? 0 : (count / limit) * 100;
    if (count >= limit) return 'at_limit';
    if (pct >= 90) return 'near_limit';
    return 'ok';
  };

  const saveAssignment = async () => {
    if (!newAssignment.training_id) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (platformSettings.default_due_days || 15));
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const now = new Date().toISOString();
    const targetOrgs = newAssignment.organization_id === 'all' ? organizations : organizations.filter(o => o.id === newAssignment.organization_id);
    const targetTrainings = newAssignment.training_id === 'all' ? trainings : trainings.filter(t => t.id === newAssignment.training_id);
    const inserts = [];
    for (const org of targetOrgs) {
      for (const training of targetTrainings) {
        const alreadyAssigned = assignments.some(a => a.training_id === training.id && a.organization_id === org.id);
        if (!alreadyAssigned) inserts.push({ training_id: training.id, organization_id: org.id, due_date: dueDateStr, status: 'Active', assigned_at: now });
      }
    }
    if (inserts.length === 0) {
      setAssignSuccess('All selected trainings are already assigned.');
      setTimeout(() => setAssignSuccess(''), 3000);
      return;
    }
    const { data } = await supabase.from('training_assignments').insert(inserts).select();
    if (data) {
      setAssignments([...assignments, ...data]);
      const trainingLabel = newAssignment.training_id === 'all' ? 'All Trainings' : trainings.find(t => t.id === newAssignment.training_id)?.title;
      const orgLabel = newAssignment.organization_id === 'all' ? 'all organizations' : targetOrgs[0]?.name;
      setAssignSuccess(`✅ "${trainingLabel}" assigned to ${orgLabel} — due ${dueDateStr}`);
      setTimeout(() => { setAssignSuccess(''); setShowAssignTraining(false); setNewAssignment({training_id: '', organization_id: 'all'}); }, 3000);
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

  const handleImpersonate = (org) => window.location.href = `/branch?impersonate_org=${org.id}&org_name=${encodeURIComponent(org.name)}`;
  const handleManageOrg = (org) => window.location.href = `/dashboard/org/${org.id}`;

  const openEditModal = (training) => {
    setEditingTraining({...training});
    setEditTab('content');
    setGeneratedQuestions([]);
    setQuestionsSaved(false);
    setManualMode(false);
    setManualQuestions([]);
    fetchExistingQuestions(training.id);
  };

  const generateQuestions = async () => {
    const content = editingTraining.content_text || editingTraining.description || editingTraining.title;
    if (!content) {
      alert('Please add text content to the training first before generating questions.');
      return;
    }
    setGeneratingQuestions(true);
    setGeneratedQuestions([]);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTraining.title, content, count: questionCount })
      });
      const parsed = await response.json();
      setGeneratedQuestions(parsed.questions || []);
    } catch (err) {
      console.error('Question generation error:', err);
      alert('Failed to generate questions. Please try again.');
    }
    setGeneratingQuestions(false);
  };

  const saveQuestions = async (questionsToSave) => {
    if (!questionsToSave || questionsToSave.length === 0) return;
    setSavingQuestions(true);
    const { data: existingQs } = await supabase.from('questions').select('id').eq('training_id', editingTraining.id);
    if (existingQs?.length > 0) {
      const ids = existingQs.map(q => q.id);
      await supabase.from('answers').delete().in('question_id', ids);
      await supabase.from('questions').delete().eq('training_id', editingTraining.id);
    }
    for (const q of questionsToSave) {
      const { data: qData } = await supabase.from('questions').insert([{
        training_id: editingTraining.id,
        question: q.question
      }]).select().single();
      if (qData) {
        await supabase.from('answers').insert(
          q.answers.map(a => ({
            question_id: qData.id,
            answer_text: a.text || a.answer_text,
            is_correct: a.correct !== undefined ? a.correct : a.is_correct
          }))
        );
      }
    }
    await fetchExistingQuestions(editingTraining.id);
    setSavingQuestions(false);
    setQuestionsSaved(true);
    setGeneratedQuestions([]);
    setManualQuestions([]);
    setManualMode(false);
    setTimeout(() => setQuestionsSaved(false), 3000);
  };

  const updateGeneratedQuestion = (qIndex, field, value) => {
    const updated = [...generatedQuestions];
    updated[qIndex] = {...updated[qIndex], [field]: value};
    setGeneratedQuestions(updated);
  };

  const updateGeneratedAnswer = (qIndex, aIndex, field, value) => {
    const updated = [...generatedQuestions];
    const answers = [...updated[qIndex].answers];
    if (field === 'correct' && value === true) {
      answers.forEach((a, i) => { answers[i] = {...a, correct: i === aIndex}; });
    } else {
      answers[aIndex] = {...answers[aIndex], [field]: value};
    }
    updated[qIndex] = {...updated[qIndex], answers};
    setGeneratedQuestions(updated);
  };

  const removeGeneratedQuestion = (qIndex) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== qIndex));
  };

  const saveTraining = async (training) => {
    setUploadProgress('Saving training...');
    let video_url = null;
    let content_pdf_url = null;

    if (videoFile && (training.content_type === 'video' || training.content_type === 'both')) {
      setUploadProgress('Uploading video...');
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: videoError } = await supabase.storage.from('training-videos').upload(fileName, videoFile);
      if (videoError) { alert('Video upload failed: ' + videoError.message); setUploadProgress(''); return; }
      const { data: { publicUrl } } = supabase.storage.from('training-videos').getPublicUrl(fileName);
      video_url = publicUrl;
    }

    if (pdfFile && (training.content_type === 'readable' || training.content_type === 'both')) {
      setUploadProgress('Uploading PDF...');
      const fileName = `${Date.now()}.pdf`;
      const { error: pdfError } = await supabase.storage.from('training-pdfs').upload(fileName, pdfFile);
      if (pdfError) { alert('PDF upload failed: ' + pdfError.message); setUploadProgress(''); return; }
      const { data: { publicUrl } } = supabase.storage.from('training-pdfs').getPublicUrl(fileName);
      content_pdf_url = publicUrl;
    }

    setUploadProgress('Saving to database...');
    const { data } = await supabase.from('trainings').insert([{
      title: training.title, category: training.category, recurrence: training.recurrence,
      description: training.description, status: training.status, content_type: training.content_type,
      video_url, content_text: training.content_text || null, content_pdf_url,
    }]).select();

    if (data) {
      setTrainings([...trainings, data[0]]);
      setShowAddTraining(false);
      setNewTraining({title: '', category: 'All Staff', recurrence: 'Annual', description: '', status: 'Active', content_type: 'video', content_text: ''});
      setVideoFile(null); setPdfFile(null); setUploadProgress('');
    }
  };

  const saveEditTraining = async () => {
    setEditUploadProgress('Saving...');
    let updates = {
      title: editingTraining.title, category: editingTraining.category,
      recurrence: editingTraining.recurrence, description: editingTraining.description,
      status: editingTraining.status, content_type: editingTraining.content_type,
      content_text: editingTraining.content_text || null,
      video_url: editingTraining.video_url || null,
    };

    if (editVideoFile) {
      setEditUploadProgress('Uploading video...');
      const fileExt = editVideoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('training-videos').upload(fileName, editVideoFile);
      if (error) { alert('Video upload failed: ' + error.message); setEditUploadProgress(''); return; }
      const { data: { publicUrl } } = supabase.storage.from('training-videos').getPublicUrl(fileName);
      updates.video_url = publicUrl;
    }

    if (editPdfFile) {
      setEditUploadProgress('Uploading PDF...');
      const fileName = `${Date.now()}.pdf`;
      const { error } = await supabase.storage.from('training-pdfs').upload(fileName, editPdfFile);
      if (error) { alert('PDF upload failed: ' + error.message); setEditUploadProgress(''); return; }
      const { data: { publicUrl } } = supabase.storage.from('training-pdfs').getPublicUrl(fileName);
      updates.content_pdf_url = publicUrl;
    }

    const { data } = await supabase.from('trainings').update(updates).eq('id', editingTraining.id).select();
    if (data) {
      setTrainings(trainings.map(t => t.id === data[0].id ? data[0] : t));
      setEditSaved(true);
      setEditUploadProgress('');
      setTimeout(() => setEditSaved(false), 2500);
    }
  };

  const saveOrganization = async (org) => {
    const { data } = await supabase.from('organizations').insert([{
      name: org.name, type: org.types?.join(', '), phone: org.phone, status: org.status,
      address: org.address, city: org.city, state: org.state, zip: org.zip, billing_plan: org.billing_plan
    }]).select();
    if (data) {
      setOrganizations([...organizations, data[0]]);
      if (org.adminName && org.adminEmail) {
        await fetch('/api/create-user', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ full_name: org.adminName, email: org.adminEmail, role: 'Branch Admin', hire_date: null, status: 'Active', organization_id: data[0].id })
        });
      }
    }
  };

  const emptyManualQuestion = () => ({
    question: '',
    answers: [
      { text: '', correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ]
  });

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
        <div style={{backgroundColor: 'white', borderRadius: '8px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center'}}>
          <img src="/ImpactWorkforce.png" alt="Impact Workforce" style={{height: '50px', width: 'auto', objectFit: 'contain'}} />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">Platform Admin</span>
          <button onClick={() => window.location.href = '/login'} className="text-sm font-medium px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>Log Out</button>
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
            <button key={item.id} onClick={() => item.id === 'settings' ? window.location.href = '/settings' : setActivePage(item.id)}
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
            <button onClick={() => window.location.href = '/login'} className="text-sm font-medium w-full text-left" style={{color: '#6B7280'}}>Sign Out</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8" style={{backgroundColor: '#F9FAFB'}}>

          {/* ── DASHBOARD ── */}
          {activePage === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{color: '#0D2035'}}>Admin Dashboard</h1>
              <p className="text-sm mb-8" style={{color: '#6B7280'}}>Platform-wide overview — business health, not compliance.</p>
              <div className="flex gap-3 mb-8 flex-wrap">
                {[
                  { label: '+ Create Organization', action: () => { setActivePage('organizations'); setShowAddOrg(true); } },
                  { label: '+ Add Training', action: () => { setActivePage('trainings'); setShowAddTraining(true); } },
                  { label: '⚡ Assign Training', action: () => setShowAssignTraining(true) },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>{btn.label}</button>
                ))}
              </div>

              {showAssignTraining && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.4)'}}>
                  <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                    <h2 className="text-lg font-bold mb-1" style={{color: '#0D2035'}}>⚡ Assign Training</h2>
                    <p className="text-sm mb-6" style={{color: '#6B7280'}}>Due date auto-set to {platformSettings.default_due_days || 15} days.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Select Training</label>
                        <select value={newAssignment.training_id} onChange={(e) => setNewAssignment({...newAssignment, training_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                          <option value="">-- Choose a training --</option>
                          <option value="all">⚡ All Trainings</option>
                          {trainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Assign To</label>
                        <select value={newAssignment.organization_id} onChange={(e) => setNewAssignment({...newAssignment, organization_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">
                          <option value="all">All Organizations</option>
                          {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </div>
                      <div className="rounded-lg p-3" style={{backgroundColor: '#F0FDF4'}}>
                        <p className="text-xs font-semibold" style={{color: '#16A34A'}}>
                          📅 Due date: {(() => { const d = new Date(); d.setDate(d.getDate() + (platformSettings.default_due_days || 15)); return d.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}); })()}
                        </p>
                      </div>
                      {assignSuccess && <div className="rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}><p className="text-sm font-medium" style={{color: '#16A34A'}}>{assignSuccess}</p></div>}
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={saveAssignment} disabled={!newAssignment.training_id} className="flex-1 py-2 rounded-lg text-white font-semibold text-sm" style={{backgroundColor: newAssignment.training_id ? '#0D9488' : '#D1D5DB'}}>Assign Training</button>
                      <button onClick={() => { setShowAssignTraining(false); setNewAssignment({training_id: '', organization_id: 'all'}); setAssignSuccess(''); }} className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const notSetUp = organizations.filter(o => getOrgStatus(o) === 'Not Set Up');
                const nearLimit = organizations.filter(o => getOrgCapacityStatus(o) === 'near_limit');
                const atLimit = organizations.filter(o => getOrgCapacityStatus(o) === 'at_limit');
                if (!notSetUp.length && !nearLimit.length && !atLimit.length) return null;
                return (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 mb-8">
                    <p className="text-sm font-bold mb-3" style={{color: '#92400E'}}>🚨 Attention Needed</p>
                    <ul className="space-y-1">
                      {notSetUp.length > 0 && <li className="text-sm text-orange-700">• {notSetUp.length} organization{notSetUp.length > 1 ? 's' : ''} not fully set up</li>}
                      {atLimit.map(o => { const count = getOrgUserCount(o.id); const limit = getPlanLimit(o.billing_plan); return <li key={o.id} className="text-sm text-red-700 font-semibold">• {o.name} has reached their plan limit ({count}/{limit} staff)</li>; })}
                      {nearLimit.map(o => { const count = getOrgUserCount(o.id); const limit = getPlanLimit(o.billing_plan); return <li key={o.id} className="text-sm text-orange-700">• {o.name} is approaching their plan limit ({count}/{limit} staff on {o.billing_plan})</li>; })}
                    </ul>
                  </div>
                );
              })()}

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

              <div className="bg-white rounded-xl shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{color: '#0D2035'}}>Organization Management</h2>
                  <button onClick={() => { setActivePage('organizations'); setShowAddOrg(true); }} className="text-sm font-semibold px-3 py-1 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>+ Add Organization</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Organization</th><th className="text-left pb-3">Plan</th><th className="text-left pb-3">Staff</th><th className="text-left pb-3">Assigned</th><th className="text-left pb-3">Last Activity</th><th className="text-left pb-3">Status</th><th className="text-left pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr><td colSpan="7" className="py-6 text-center" style={{color: '#6B7280'}}>No organizations yet.</td></tr>
                    ) : organizations.map(org => {
                      const status = getOrgStatus(org);
                      const s = statusStyle(status);
                      const count = getOrgUserCount(org.id);
                      const capStatus = getOrgCapacityStatus(org);
                      return (
                        <tr key={org.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{org.name}</td>
                          <td className="py-3 text-gray-500 text-xs">{org.billing_plan || '—'}</td>
                          <td className="py-3"><div className="flex items-center gap-2"><span className="text-gray-500">{count}</span>{capStatus === 'at_limit' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}>At Limit</span>}{capStatus === 'near_limit' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor: '#FEF9C3', color: '#CA8A04'}}>90%</span>}</div></td>
                          <td className="py-3 text-gray-500">{getOrgAssignments(org.id)}</td>
                          <td className="py-3 text-gray-500">{getLastActivity(org.id)}</td>
                          <td className="py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: s.bg, color: s.color}}>{status}</span></td>
                          <td className="py-3"><div className="flex gap-2"><button onClick={() => handleManageOrg(org)} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{backgroundColor: '#0D2035'}}>Manage</button><button onClick={() => handleImpersonate(org)} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{backgroundColor: '#F3F4F6', color: '#0D2035'}}>Impersonate</button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>System Activity Feed</h2>
                {completions.length === 0 ? <p className="text-sm" style={{color: '#6B7280'}}>No recent activity.</p> : (
                  <ul className="space-y-3">
                    {[...completions].reverse().slice(0, 10).map(c => (
                      <li key={c.id} className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: '#0D9488'}}></span>
                        <span className="text-gray-700"><span className="font-medium">{c.staff_name}</span> completed <span className="font-medium">"{c.training_title}"</span></span>
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
                <button onClick={() => setShowAddOrg(true)} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>+ Add Organization</button>
              </div>
              {showAddOrg && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>New Organization</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Organization Name</label><input type="text" value={newOrg.name} onChange={(e) => setNewOrg({...newOrg, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Phone Number</label><input type="tel" value={newOrg.phone} onChange={(e) => setNewOrg({...newOrg, phone: e.target.value})} placeholder="(555) 555-5555" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Street Address</label><input type="text" value={newOrg.address} onChange={(e) => setNewOrg({...newOrg, address: e.target.value})} placeholder="123 Main Street" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>City</label><input type="text" value={newOrg.city} onChange={(e) => setNewOrg({...newOrg, city: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>State</label><input type="text" value={newOrg.state} onChange={(e) => setNewOrg({...newOrg, state: e.target.value})} placeholder="MD" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                      <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Zip</label><input type="text" value={newOrg.zip} onChange={(e) => setNewOrg({...newOrg, zip: e.target.value})} placeholder="21201" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    </div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Branch Admin Name</label><input type="text" value={newOrg.adminName} onChange={(e) => setNewOrg({...newOrg, adminName: e.target.value})} placeholder="Full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Branch Admin Email</label><input type="email" value={newOrg.adminEmail} onChange={(e) => setNewOrg({...newOrg, adminEmail: e.target.value})} placeholder="admin@organization.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Billing Plan</label><select value={newOrg.billing_plan} onChange={(e) => setNewOrg({...newOrg, billing_plan: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black">{Object.keys(BILLING_PLANS).map(plan => <option key={plan}>{plan}</option>)}</select></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Status</label><select value={newOrg.status} onChange={(e) => setNewOrg({...newOrg, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"><option>Active</option><option>Inactive</option></select></div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase mb-2" style={{color: '#6B7280'}}>Level of Care</label>
                      <div className="grid grid-cols-2 gap-2">
                        {levels.map(level => (
                          <label key={level} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={newOrg.types?.includes(level) || false} onChange={(e) => { const current = newOrg.types || []; setNewOrg({...newOrg, types: e.target.checked ? [...current, level] : current.filter(t => t !== level)}); }} />
                            {level}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => { saveOrganization(newOrg); setNewOrg({name:'',types:[],phone:'',status:'Active',adminName:'',adminEmail:'',address:'',city:'',state:'',zip:'',billing_plan:'Starter — up to 15'}); setShowAddOrg(false); }} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>Save Organization</button>
                    <button onClick={() => setShowAddOrg(false)} className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}><th className="text-left pb-3">Organization</th><th className="text-left pb-3">Plan</th><th className="text-left pb-3">Location</th><th className="text-left pb-3">Staff</th><th className="text-left pb-3">Status</th><th className="text-left pb-3">Actions</th></tr></thead>
                  <tbody>
                    {organizations.length === 0 ? <tr><td colSpan="6" className="py-6 text-center" style={{color: '#6B7280'}}>No organizations yet.</td></tr>
                    : organizations.map(org => {
                      const status = getOrgStatus(org); const s = statusStyle(status); const count = getOrgUserCount(org.id); const capStatus = getOrgCapacityStatus(org);
                      return (
                        <tr key={org.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{org.name}</td>
                          <td className="py-3 text-gray-500 text-xs">{org.billing_plan || '—'}</td>
                          <td className="py-3 text-gray-500">{org.city && org.state ? `${org.city}, ${org.state}` : '—'}</td>
                          <td className="py-3"><div className="flex items-center gap-2"><span className="text-gray-500">{count}</span>{capStatus === 'at_limit' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor: '#FEE2E2', color: '#DC2626'}}>At Limit</span>}{capStatus === 'near_limit' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{backgroundColor: '#FEF9C3', color: '#CA8A04'}}>90%</span>}</div></td>
                          <td className="py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: s.bg, color: s.color}}>{status}</span></td>
                          <td className="py-3"><div className="flex gap-2"><button onClick={() => handleManageOrg(org)} className="text-xs font-semibold px-3 py-1 rounded-lg text-white" style={{backgroundColor: '#0D2035'}}>Manage</button><button onClick={() => handleImpersonate(org)} className="text-xs font-semibold px-3 py-1 rounded-lg" style={{backgroundColor: '#F3F4F6', color: '#0D2035'}}>Impersonate</button></div></td>
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
                <button onClick={() => setShowAddTraining(true)} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>+ Add Training</button>
              </div>

              {/* ── EDIT TRAINING MODAL ── */}
              {editingTraining && (
                <div className="fixed inset-0 z-50 overflow-y-auto" style={{backgroundColor: 'rgba(0,0,0,0.4)'}}>
                  <div className="flex items-start justify-center min-h-screen pt-10 pb-10">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4">

                      <div className="px-8 pt-8 pb-0">
                        <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>Edit Training — {editingTraining.title}</h2>
                        <div className="flex gap-1 border-b border-gray-200">
                          {['content', 'questions'].map(tab => (
                            <button key={tab} onClick={() => setEditTab(tab)}
                              className="px-5 py-2 text-sm font-semibold capitalize transition-colors"
                              style={{
                                borderBottom: editTab === tab ? '2px solid #0D9488' : '2px solid transparent',
                                color: editTab === tab ? '#0D9488' : '#6B7280',
                                marginBottom: '-1px'
                              }}>
                              {tab === 'questions' ? `Quiz Questions ${existingQuestions.length > 0 ? `(${existingQuestions.length})` : ''}` : 'Content'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="px-8 py-6">

                        {/* ── CONTENT TAB ── */}
                        {editTab === 'content' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Training Name</label><input type="text" value={editingTraining.title} onChange={(e) => setEditingTraining({...editingTraining, title: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                            <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Category</label><select value={editingTraining.category} onChange={(e) => setEditingTraining({...editingTraining, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"><option>All Staff</option><option>Direct Service Only</option></select></div>
                            <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Recurrence</label><select value={editingTraining.recurrence} onChange={(e) => setEditingTraining({...editingTraining, recurrence: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"><option>New Hire</option><option>Annual</option><option>New Hire + Annual</option></select></div>
<div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Status</label><select value={editingTraining.status || 'Active'} onChange={(e) => setEditingTraining({...editingTraining, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"><option>Active</option><option>Inactive</option></select></div>
                            <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Description</label><textarea value={editingTraining.description || ''} onChange={(e) => setEditingTraining({...editingTraining, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" rows={2} /></div>
                            <div className="col-span-2 mt-2">
                              <p className="text-xs font-bold uppercase mb-3" style={{color: '#0D9488'}}>Training Content</p>
                              <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Content Type</label>
                              <select value={editingTraining.content_type || 'video'} onChange={(e) => setEditingTraining({...editingTraining, content_type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black mb-4">
                                <option value="video">Video</option><option value="readable">Readable (Text + PDF)</option><option value="both">Both (Video + Readable)</option>
                              </select>
                            </div>
                            {(editingTraining.content_type === 'video' || editingTraining.content_type === 'both') && (
                              <div className="col-span-2">
                                <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Video URL</label>
                                <input type="text" value={editingTraining.video_url || ''} onChange={(e) => setEditingTraining({...editingTraining, video_url: e.target.value})} placeholder="Paste Supabase or video URL here..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                                {editingTraining.video_url && <p className="text-xs mt-1" style={{color: '#0D9488'}}>✅ Video URL saved</p>}
                              </div>
                            )}
                            {(editingTraining.content_type === 'readable' || editingTraining.content_type === 'both') && (
                              <>
                                <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Text Content</label><textarea value={editingTraining.content_text || ''} onChange={(e) => setEditingTraining({...editingTraining, content_text: e.target.value})} placeholder="Paste or type the training content here..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" rows={8} /></div>
                                <div className="col-span-2">
                                  <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>{editingTraining.content_pdf_url ? '📄 Replace PDF' : 'Upload PDF (optional)'}</label>
                                  {editingTraining.content_pdf_url && <p className="text-xs mb-2" style={{color: '#0D9488'}}>✅ PDF already uploaded</p>}
                                  <input type="file" accept=".pdf" onChange={(e) => setEditPdfFile(e.target.files[0])} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                                  {editPdfFile && <p className="text-xs mt-1" style={{color: '#0D9488'}}>✅ {editPdfFile.name}</p>}
                                </div>
                              </>
                            )}
                            {editUploadProgress && <div className="col-span-2 rounded-lg p-3" style={{backgroundColor: '#F0FDF4'}}><p className="text-sm font-medium" style={{color: '#16A34A'}}>⏳ {editUploadProgress}</p></div>}
                            {editSaved && <div className="col-span-2 rounded-lg p-3" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}><p className="text-sm font-medium" style={{color: '#16A34A'}}>✅ Training saved!</p></div>}
                          </div>
                        )}

                        {/* ── QUESTIONS TAB ── */}
                        {editTab === 'questions' && (
                          <div>

                            {/* Mode toggle */}
                            <div className="flex gap-2 mb-6">
                              <button onClick={() => setManualMode(false)}
                                className="flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors"
                                style={{backgroundColor: !manualMode ? '#0D2035' : 'white', color: !manualMode ? 'white' : '#6B7280', borderColor: !manualMode ? '#0D2035' : '#E5E7EB'}}>
                                ✨ AI Generate
                              </button>
                              <button onClick={() => { setManualMode(true); if (manualQuestions.length === 0) setManualQuestions([emptyManualQuestion()]); }}
                                className="flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors"
                                style={{backgroundColor: manualMode ? '#0D2035' : 'white', color: manualMode ? 'white' : '#6B7280', borderColor: manualMode ? '#0D2035' : '#E5E7EB'}}>
                                ✏️ Manual Entry
                              </button>
                            </div>

                            {/* ── AI MODE ── */}
                            {!manualMode && (
                              <div>
                                <div className="flex items-center justify-between mb-6">
                                  <div>
                                    <p className="text-sm font-semibold" style={{color: '#0D2035'}}>AI Question Generator</p>
                                    <p className="text-xs mt-0.5" style={{color: '#6B7280'}}>Generate quiz questions from the training content</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-semibold uppercase" style={{color: '#6B7280'}}>Questions</label>
                                      <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-black">
                                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </div>
                                    <button onClick={generateQuestions} disabled={generatingQuestions}
                                      className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
                                      style={{backgroundColor: generatingQuestions ? '#6B7280' : '#0D9488'}}>
                                      {generatingQuestions ? '⏳ Generating...' : '✨ Generate'}
                                    </button>
                                  </div>
                                </div>

                                {existingQuestions.length > 0 && generatedQuestions.length === 0 && (
                                  <div className="mb-6">
                                    <p className="text-xs font-bold uppercase mb-3" style={{color: '#6B7280'}}>Current Questions ({existingQuestions.length})</p>
                                    <div className="space-y-3">
                                      {existingQuestions.map((q, i) => (
                                        <div key={q.id} className="rounded-lg p-4" style={{backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB'}}>
                                          <p className="text-sm font-semibold mb-2" style={{color: '#0D2035'}}>{i + 1}. {q.question}</p>
                                          <div className="space-y-1">
                                            {q.answers?.map(a => (
                                              <p key={a.id} className="text-xs flex items-center gap-2" style={{color: a.is_correct ? '#16A34A' : '#6B7280'}}>
                                                <span>{a.is_correct ? '✅' : '○'}</span> {a.answer_text}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <p className="text-xs mt-3" style={{color: '#6B7280'}}>Click Generate to replace these with new AI-generated questions.</p>
                                  </div>
                                )}

                                {generatedQuestions.length > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-bold uppercase" style={{color: '#6B7280'}}>Review & Edit</p>
                                      <p className="text-xs" style={{color: '#6B7280'}}>{generatedQuestions.length} questions</p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                      {generatedQuestions.map((q, qIndex) => (
                                        <div key={qIndex} className="rounded-xl p-4" style={{backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB'}}>
                                          <div className="flex items-start gap-3 mb-3">
                                            <span className="text-xs font-bold mt-2 flex-shrink-0" style={{color: '#0D9488'}}>{qIndex + 1}.</span>
                                            <input type="text" value={q.question} onChange={(e) => updateGeneratedQuestion(qIndex, 'question', e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                                            <button onClick={() => removeGeneratedQuestion(qIndex)} className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 flex-shrink-0">✕</button>
                                          </div>
                                          <div className="space-y-2 ml-5">
                                            {q.answers.map((a, aIndex) => (
                                              <div key={aIndex} className="flex items-center gap-2">
                                                <input type="radio" name={`correct-${qIndex}`} checked={a.correct} onChange={() => updateGeneratedAnswer(qIndex, aIndex, 'correct', true)} style={{accentColor: '#0D9488'}} />
                                                <input type="text" value={a.text} onChange={(e) => updateGeneratedAnswer(qIndex, aIndex, 'text', e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-black" style={{borderColor: a.correct ? '#0D9488' : undefined}} />
                                                {a.correct && <span className="text-xs font-semibold" style={{color: '#16A34A'}}>✓ Correct</span>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {questionsSaved && <div className="rounded-lg p-3 mb-4" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}><p className="text-sm font-medium" style={{color: '#16A34A'}}>✅ Questions saved successfully!</p></div>}
                                    <button onClick={() => saveQuestions(generatedQuestions)} disabled={savingQuestions} className="w-full py-2 rounded-lg text-white font-semibold text-sm" style={{backgroundColor: savingQuestions ? '#6B7280' : '#0D2035'}}>
                                      {savingQuestions ? 'Saving...' : `Save ${generatedQuestions.length} Questions to Quiz`}
                                    </button>
                                  </div>
                                )}

                                {existingQuestions.length === 0 && generatedQuestions.length === 0 && !generatingQuestions && (
                                  <div className="text-center py-8 rounded-xl" style={{backgroundColor: '#F9FAFB', border: '1px dashed #D1D5DB'}}>
                                    <p className="text-sm font-medium mb-1" style={{color: '#0D2035'}}>No quiz questions yet</p>
                                    <p className="text-xs" style={{color: '#6B7280'}}>Select how many questions, then click Generate</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── MANUAL MODE ── */}
                            {manualMode && (
                              <div>
                                <div className="space-y-4 mb-4">
                                  {manualQuestions.map((q, qIndex) => (
                                    <div key={qIndex} className="rounded-xl p-4" style={{backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB'}}>
                                      <div className="flex items-start gap-3 mb-3">
                                        <span className="text-xs font-bold mt-2 flex-shrink-0" style={{color: '#0D9488'}}>{qIndex + 1}.</span>
                                        <input type="text" value={q.question}
                                          onChange={(e) => {
                                            const updated = [...manualQuestions];
                                            updated[qIndex] = {...updated[qIndex], question: e.target.value};
                                            setManualQuestions(updated);
                                          }}
                                          placeholder="Enter your question..."
                                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />
                                        {manualQuestions.length > 1 && (
                                          <button onClick={() => setManualQuestions(manualQuestions.filter((_, i) => i !== qIndex))} className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50">✕</button>
                                        )}
                                      </div>
                                      <div className="space-y-2 ml-5">
                                        {q.answers.map((a, aIndex) => (
                                          <div key={aIndex} className="flex items-center gap-2">
                                            <input type="radio" name={`manual-correct-${qIndex}`} checked={a.correct}
                                              onChange={() => {
                                                const updated = [...manualQuestions];
                                                updated[qIndex].answers = updated[qIndex].answers.map((ans, i) => ({...ans, correct: i === aIndex}));
                                                setManualQuestions(updated);
                                              }}
                                              style={{accentColor: '#0D9488'}} />
                                            <input type="text" value={a.text}
                                              onChange={(e) => {
                                                const updated = [...manualQuestions];
                                                updated[qIndex].answers[aIndex] = {...updated[qIndex].answers[aIndex], text: e.target.value};
                                                setManualQuestions(updated);
                                              }}
                                              placeholder={`Answer ${aIndex + 1}...`}
                                              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-black"
                                              style={{borderColor: a.correct ? '#0D9488' : undefined}} />
                                            {a.correct && <span className="text-xs font-semibold" style={{color: '#16A34A'}}>✓ Correct</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button onClick={() => setManualQuestions([...manualQuestions, emptyManualQuestion()])}
                                  className="w-full py-2 rounded-lg text-sm font-semibold mb-4"
                                  style={{backgroundColor: '#F3F4F6', color: '#0D2035', border: '1px dashed #D1D5DB'}}>
                                  + Add Another Question
                                </button>
                                {questionsSaved && <div className="rounded-lg p-3 mb-4" style={{backgroundColor: '#F0FDF4', border: '1px solid #86EFAC'}}><p className="text-sm font-medium" style={{color: '#16A34A'}}>✅ Questions saved successfully!</p></div>}
                                <button onClick={() => saveQuestions(manualQuestions.filter(q => q.question.trim()))} disabled={savingQuestions}
                                  className="w-full py-2 rounded-lg text-white font-semibold text-sm"
                                  style={{backgroundColor: savingQuestions ? '#6B7280' : '#0D2035'}}>
                                  {savingQuestions ? 'Saving...' : `Save ${manualQuestions.filter(q => q.question.trim()).length} Questions to Quiz`}
                                </button>
                              </div>
                            )}

                          </div>
                        )}
                      </div>

                      <div className="px-8 pb-8 flex gap-3">
                        {editTab === 'content' && (
                          <button onClick={saveEditTraining} className="flex-1 py-2 rounded-lg text-white font-semibold text-sm" style={{backgroundColor: '#0D9488'}}>Save Changes</button>
                        )}
                        <button onClick={() => { setEditingTraining(null); setEditVideoFile(null); setEditPdfFile(null); setGeneratedQuestions([]); setManualQuestions([]); setManualMode(false); }}
                          className="flex-1 py-2 rounded-lg text-gray-500 bg-gray-100 font-semibold text-sm">Close</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showAddTraining && (
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-lg font-bold mb-4" style={{color: '#0D2035'}}>New Training</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Training Name</label><input type="text" value={newTraining.title} onChange={(e) => setNewTraining({...newTraining, title: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" /></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Category</label><select value={newTraining.category} onChange={(e) => setNewTraining({...newTraining, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"><option>All Staff</option><option>Direct Service Only</option></select></div>
                    <div><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Recurrence</label><select value={newTraining.recurrence} onChange={(e) => setNewTraining({...newTraining, recurrence: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black"><option>New Hire</option><option>Annual</option><option>New Hire + Annual</option></select></div>
                    <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Description</label><textarea value={newTraining.description} onChange={(e) => setNewTraining({...newTraining, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" rows={2} /></div>
                    <div className="col-span-2 mt-2">
                      <p className="text-xs font-bold uppercase mb-3" style={{color: '#0D9488'}}>Training Content</p>
                      <label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Content Type</label>
                      <select value={newTraining.content_type} onChange={(e) => setNewTraining({...newTraining, content_type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black mb-4">
                        <option value="video">Video</option><option value="readable">Readable (Text + PDF)</option><option value="both">Both (Video + Readable)</option>
                      </select>
                    </div>
                    {(newTraining.content_type === 'video' || newTraining.content_type === 'both') && <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Upload Video</label><input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />{videoFile && <p className="text-xs mt-1" style={{color: '#0D9488'}}>✅ {videoFile.name}</p>}</div>}
                    {(newTraining.content_type === 'readable' || newTraining.content_type === 'both') && <>
                      <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Text Content</label><textarea value={newTraining.content_text} onChange={(e) => setNewTraining({...newTraining, content_text: e.target.value})} placeholder="Paste or type the training content here..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" rows={6} /></div>
                      <div className="col-span-2"><label className="block text-xs font-semibold uppercase mb-1" style={{color: '#6B7280'}}>Upload PDF (optional)</label><input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black" />{pdfFile && <p className="text-xs mt-1" style={{color: '#0D9488'}}>✅ {pdfFile.name}</p>}</div>
                    </>}
                  </div>
                  {uploadProgress && <div className="mt-4 rounded-lg p-3" style={{backgroundColor: '#F0FDF4'}}><p className="text-sm font-medium" style={{color: '#16A34A'}}>⏳ {uploadProgress}</p></div>}
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => saveTraining(newTraining)} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>Save Training</button>
                    <button onClick={() => { setShowAddTraining(false); setVideoFile(null); setPdfFile(null); }} className="text-sm font-semibold px-4 py-2 rounded-lg text-gray-500 bg-gray-100">Cancel</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}>
                      <th className="text-left pb-3">Training Name</th><th className="text-left pb-3">Content</th><th className="text-left pb-3">Category</th><th className="text-left pb-3">Recurrence</th><th className="text-left pb-3">Status</th><th className="text-left pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.length === 0 ? <tr><td colSpan="6" className="py-6 text-center" style={{color: '#6B7280'}}>No trainings yet.</td></tr>
                    : trainings.map(training => (
                      <tr key={training.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training.title}</td>
                        <td className="py-3">{training.content_type ? <span className="px-2 py-1 rounded-full text-xs font-semibold capitalize" style={{backgroundColor: '#E0F2FE', color: '#0284C7'}}>{training.content_type}</span> : <span className="text-xs text-gray-400">No content</span>}</td>
                        <td className="py-3 text-gray-500">{training.category}</td>
                        <td className="py-3 text-gray-500">{training.recurrence}</td>
                        <td className="py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: training.status === 'Active' ? '#DCFCE7' : '#FEE2E2', color: training.status === 'Active' ? '#16A34A' : '#DC2626'}}>{training.status || 'Active'}</span></td>
                        <td className="py-3">
  <div className="flex gap-2">
    <button onClick={() => openEditModal(training)}
      className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
      style={{backgroundColor: '#0D9488'}}>Edit</button>
    <button onClick={() => window.open(`/branch/trainings/${training.id}`, '_blank')}
  className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
  style={{backgroundColor: '#0D2035'}}>View Training</button>
    {training.has_quiz && (
      <button onClick={() => window.open(`/quiz?training_id=${training.id}&title=${encodeURIComponent(training.title)}`, '_blank')}
      className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
      style={{backgroundColor: '#6B7280'}}>📝 Quiz</button>
    )}
  </div>
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
                <button onClick={() => setShowAssignTraining(true)} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{backgroundColor: '#0D9488'}}>⚡ Assign Training</button>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}><th className="text-left pb-3">Training</th><th className="text-left pb-3">Organization</th><th className="text-left pb-3">Due Date</th><th className="text-left pb-3">Assigned At</th><th className="text-left pb-3">Status</th></tr></thead>
                  <tbody>
                    {assignments.length === 0 ? <tr><td colSpan="5" className="py-6 text-center" style={{color: '#6B7280'}}>No assignments yet.</td></tr>
                    : assignments.map(a => {
                      const training = trainings.find(t => t.id === a.training_id);
                      const org = organizations.find(o => o.id === a.organization_id);
                      return (
                        <tr key={a.id} className="border-b border-gray-50">
                          <td className="py-3 font-medium" style={{color: '#0D9488'}}>{training?.title || '—'}</td>
                          <td className="py-3 text-gray-500">{org?.name || '—'}</td>
                          <td className="py-3 text-gray-500">{a.due_date}</td>
                          <td className="py-3 text-gray-500">{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : '—'}</td>
                          <td className="py-3"><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{backgroundColor: '#DCFCE7', color: '#16A34A'}}>{a.status || 'Active'}</span></td>
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
                  <thead><tr className="text-xs font-semibold uppercase border-b" style={{color: '#6B7280'}}><th className="text-left pb-3">Training</th><th className="text-left pb-3">Staff Member</th><th className="text-left pb-3">Completed Date</th></tr></thead>
                  <tbody>
                    {completions.length === 0 ? <tr><td colSpan="3" className="py-6 text-center" style={{color: '#6B7280'}}>No completions yet.</td></tr>
                    : completions.map(c => (
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