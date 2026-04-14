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
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    init();
    return () => clearInterval(timerRef.current);
  }, [id]);

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

    if (trainingData) {
      setTraining(trainingData);
      // If no video, unlock quiz immediately
      if (!trainingData.video_url) {
        setQuizUnlocked(true);
      } else {
        const duration = trainingData.video_duration_seconds || 300;
        setSecondsRemaining(duration);
      }
    }

    // Check if already completed
    if (userData) {
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

  const startTimer = () => {
    if (timerStarted || quizUnlocked) return;
    setTimerStarted(true);
    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setQuizUnlocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (secs) => {
    if (!secs || secs <= 0) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const goToQuiz = () => {
    window.location.href = `/quiz?training_id=${training.id}&title=${encodeURIComponent(training.title)}`;
  };

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
          onClick={() => window.location.href = '/branch'}
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          ← Back to Trainings
        </button>
      </div>

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

        {/* Completed banner */}
        {isCompleted && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-bold text-green-700">Training Completed</p>
              <p className="text-sm text-green-600">You have already completed this training. You may rewatch the video below.</p>
            </div>
          </div>
        )}

        {/* Video player */}
        {training.video_url ? (
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={training.video_url}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen"
                allowFullScreen
                onLoad={startTimer}
                title={training.title}
              />
            </div>
            {/* Timer bar */}
            {!quizUnlocked && training.has_quiz && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#0D9488' }} />
                  <p className="text-sm font-medium" style={{ color: '#0D2035' }}>
                    {timerStarted
                      ? `Quiz unlocks in ${formatTime(secondsRemaining)}`
                      : 'Press play to begin — quiz unlocks when video completes'}
                  </p>
                </div>
                {timerStarted && secondsRemaining > 0 && (
                  <div className="w-48 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        backgroundColor: '#0D9488',
                        width: `${100 - ((secondsRemaining / (training.video_duration_seconds || 300)) * 100)}%`
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            {quizUnlocked && training.has_quiz && !isCompleted && (
              <div className="px-6 py-4 border-t border-green-100 bg-green-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🎉</span>
                  <p className="text-sm font-semibold text-green-700">Video complete — your quiz is ready!</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-8 mb-6 text-center">
            <p className="text-sm" style={{ color: '#6B7280' }}>No video available for this training yet.</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          {training.has_quiz && !isCompleted && (
            <button
              onClick={goToQuiz}
              disabled={!quizUnlocked}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                backgroundColor: quizUnlocked ? '#0D9488' : '#D1D5DB',
                cursor: quizUnlocked ? 'pointer' : 'not-allowed',
                opacity: quizUnlocked ? 1 : 0.7
              }}>
              {quizUnlocked ? '📝 Take Quiz' : '🔒 Quiz Locked'}
            </button>
          )}
          {training.has_quiz && isCompleted && (
            <button
              onClick={goToQuiz}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#6B7280' }}>
              Retake Quiz
            </button>
          )}
          <button
            onClick={() => window.location.href = '/branch'}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}