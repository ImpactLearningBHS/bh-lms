'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function TrainingDetailPage() {
  const { id } = useParams();
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => { init(); }, [id]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: userData } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('auth_id', user.id)
      .single();

    if (userData) setCurrentUser(userData);

    const { data: trainingData } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', id)
      .single();

    if (trainingData) setTraining(trainingData);

    // Only check completion for non-admin users
    const isAdmin = userData?.role === 'Platform Admin' || userData?.email === 'impactlearningbhs@gmail.com';
    if (userData && !isAdmin) {
      const { data: completion } = await supabase
        .from('training_completions')
        .select('id')
        .eq('user_id', userData.id)
        .eq('training_id', id)
        .single();
      if (completion) setIsCompleted(true);
    }

    setLoading(false);
  };

  const goToQuiz = () => {
    window.location.href = `/quiz?training_id=${training.id}&title=${encodeURIComponent(training.title)}`;
  };

  const isPlatformAdmin = currentUser?.role === 'Platform Admin' || currentUser?.email === 'impactlearningbhs@gmail.com';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FAFB' }}>
      <p className="text-gray-400 text-sm">Loading training...</p>
    </div>
  );

  if (!training) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9FAFB' }}>
      <p className="text-gray-400 text-sm">Training not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9FAFB' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4" style={{ backgroundColor: '#0D2035' }}>
        <img src="/ImpactWorkforce.png" alt="Impact Workforce" style={{ height: '44px', objectFit: 'contain' }} />
        <button
          onClick={() => window.location.href = isPlatformAdmin ? '/dashboard' : '/branch'}
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          ← Back
        </button>
      </div>

      {/* Platform admin preview banner */}
      {isPlatformAdmin && (
        <div className="px-8 py-2 text-xs font-semibold text-center" style={{ backgroundColor: '#7C3AED', color: 'white' }}>
          👁 Platform Admin Preview Mode
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">

        {/* Training title + meta */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#0D9488' }}>
            {training.category}
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#0D2035' }}>{training.title}</h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>Recurrence: {training.recurrence}</p>
        </div>

        {/* Completed banner — only for non-admin users */}
        {isCompleted && !isPlatformAdmin && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-bold text-green-700">Training Completed</p>
              <p className="text-sm text-green-600">You have already completed this training. You may review the content below.</p>
            </div>
          </div>
        )}

        {/* Video content */}
        {(training.content_type === 'video' || training.content_type === 'both') && (
          training.video_url ? (
            <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
              <video
                controls
                className="w-full"
                style={{ maxHeight: '500px', backgroundColor: '#000' }}>
                <source src={training.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 mb-6 text-center">
              <p className="text-sm" style={{ color: '#6B7280' }}>No video available for this training yet.</p>
            </div>
          )
        )}

        {/* Readable content */}
        {(training.content_type === 'readable' || training.content_type === 'both') && (
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            {training.content_text && (
              <div className="text-sm leading-relaxed mb-6"
                style={{ color: '#0D2035', whiteSpace: 'pre-wrap' }}>
                {training.content_text}
              </div>
            )}
            {training.content_pdf_url && (
              <a href={training.content_pdf_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#0D2035' }}>
                📄 Download PDF
              </a>
            )}
            {!training.content_text && !training.content_pdf_url && (
              <p className="text-sm text-center" style={{ color: '#6B7280' }}>No reading material available yet.</p>
            )}
          </div>
        )}

        {/* Fallback if no content type set */}
        {!training.content_type && (
          <div className="bg-white rounded-xl shadow p-8 mb-6 text-center">
            <p className="text-sm" style={{ color: '#6B7280' }}>No content available for this training yet.</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          {training.has_quiz && (isPlatformAdmin || !isCompleted) && (
            <button
              onClick={goToQuiz}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#0D9488' }}>
              📝 {isPlatformAdmin ? 'Preview Quiz' : 'Take Quiz'}
            </button>
          )}
          {training.has_quiz && isCompleted && !isPlatformAdmin && (
            <button
              onClick={goToQuiz}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#6B7280' }}>
              Retake Quiz
            </button>
          )}
          <button
            onClick={() => window.location.href = isPlatformAdmin ? '/dashboard' : '/branch'}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}