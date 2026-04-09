'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function QuizPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trainingId = params.get('training_id');
    const trainingTitle = params.get('title');
    if (trainingId) fetchTrainingAndQuestions(trainingId, trainingTitle);
  }, []);

  const fetchTrainingAndQuestions = async (trainingId, trainingTitle) => {
    // Fetch full training data including content
    const { data: trainingData } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', trainingId)
      .single();

    if (trainingData) {
      setTraining(trainingData);
    } else {
      setTraining({ id: trainingId, title: trainingTitle });
    }

    // Fetch questions
    const { data: questionData } = await supabase
      .from('questions')
      .select('*, answers(*)')
      .eq('training_id', trainingId);
    if (questionData) setQuestions(questionData);
    setLoading(false);
  };

  const handleAnswer = (questionId, answerId) => {
    setAnswers({...answers, [questionId]: answerId});
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach(q => {
      const selectedAnswer = q.answers.find(a => a.id === answers[q.id]);
      if (selectedAnswer?.is_correct) correct++;
    });
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    if (finalScore === 100) {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const { data: dbUser } = await supabase
        .from('users')
        .select('id, full_name, organization_id')
        .eq('auth_id', user.id)
        .single();

      await supabase.from('training_completions').insert([{
        training_id: training.id,
        user_id: dbUser?.id || user.id,
        training_title: training.title,
        completed_date: today,
        completed_at: new Date().toISOString(),
        staff_name: dbUser?.full_name || user.email
      }]);

      if (dbUser?.organization_id) {
        const nextDueDate = new Date();
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        await supabase.from('training_assignments')
          .update({ due_date: nextDueDate.toISOString().split('T')[0] })
          .eq('training_id', training.id)
          .eq('organization_id', dbUser.organization_id);
      }

      await supabase.from('quiz_attempts').insert([{
        user_id: user.id, training_id: training.id, score: finalScore, passed: true
      }]);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('quiz_attempts').insert([{
        user_id: user.id, training_id: training.id, score: finalScore, passed: false
      }]);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setShowQuiz(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
      <p style={{color: '#6B7280'}}>Loading training...</p>
    </div>
  );

  const hasContent = training?.video_url || training?.content_text || training?.content_pdf_url;

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>

      {/* Header */}
      <div style={{backgroundColor: '#0D2035'}}>
        <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
          <img src="/ImpactWorkforce.png" alt="Impact Workforce" className="h-10" />
          <button onClick={() => window.location.href = '/staff'}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{backgroundColor: '#0D9488'}}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">

        {/* Training title */}
        <h1 className="text-2xl font-bold mb-2" style={{color: '#0D2035'}}>{training?.title}</h1>
        <p className="text-sm mb-6" style={{color: '#6B7280'}}>{training?.description}</p>

        {/* ── CONTENT SECTION ── */}
        {hasContent && !submitted && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-base font-bold mb-4" style={{color: '#0D2035'}}>Training Material</h2>

            {/* Video */}
            {training?.video_url && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase mb-2" style={{color: '#6B7280'}}>Video</p>
                <video
                  controls
                  className="w-full rounded-lg"
                  style={{maxHeight: '480px', backgroundColor: '#000'}}
                  src={training.video_url}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Text Content */}
            {training?.content_text && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase mb-2" style={{color: '#6B7280'}}>Reading Material</p>
                <div className="rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{backgroundColor: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB'}}>
                  {training.content_text}
                </div>
              </div>
            )}

            {/* PDF */}
            {training?.content_pdf_url && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase mb-2" style={{color: '#6B7280'}}>Document</p>
                <a href={training.content_pdf_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{backgroundColor: '#0D2035'}}>
                  📄 View PDF Document
                </a>
              </div>
            )}

            {/* Take Quiz button */}
            {!showQuiz && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button onClick={() => setShowQuiz(true)}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm"
                  style={{backgroundColor: '#0D9488'}}>
                  Proceed to Quiz →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ SECTION ── */}
        {(showQuiz || !hasContent) && (
          <div className="bg-white rounded-xl shadow p-8">
            {!submitted ? (
              <div>
                <h2 className="text-lg font-bold mb-2" style={{color: '#0D2035'}}>Knowledge Check</h2>
                <p className="text-sm mb-8" style={{color: '#6B7280'}}>Answer all questions correctly to complete this training.</p>

                {questions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">No quiz questions have been added yet.</p>
                    <button onClick={() => window.location.href = '/staff'}
                      className="px-6 py-3 rounded-lg text-white font-semibold"
                      style={{backgroundColor: '#0D9488'}}>
                      Back to Dashboard
                    </button>
                  </div>
                ) : (
                  <>
                    {questions.map((q, index) => (
                      <div key={q.id} className="mb-8">
                        <p className="font-semibold text-gray-800 mb-3">{index + 1}. {q.question}</p>
                        <div className="space-y-2">
                          {q.answers.map(answer => (
                            <label key={answer.id}
                              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                              style={{
                                borderColor: answers[q.id] === answer.id ? '#0D9488' : '#E5E7EB',
                                backgroundColor: answers[q.id] === answer.id ? 'rgba(13,148,136,0.05)' : 'white'
                              }}>
                              <input type="radio" name={q.id} value={answer.id}
                                checked={answers[q.id] === answer.id}
                                onChange={() => handleAnswer(q.id, answer.id)}
                                style={{accentColor: '#0D9488'}} />
                              <span className="text-sm text-gray-700">{answer.answer_text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button onClick={handleSubmit}
                      disabled={Object.keys(answers).length !== questions.length}
                      className="w-full py-3 rounded-lg text-white font-semibold text-sm"
                      style={{
                        backgroundColor: Object.keys(answers).length !== questions.length ? '#D1D5DB' : '#0D9488',
                        cursor: Object.keys(answers).length !== questions.length ? 'not-allowed' : 'pointer'
                      }}>
                      Submit Quiz
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center">
                {score === 100 ? (
                  <div>
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold mb-2" style={{color: '#0D9488'}}>Congratulations!</h2>
                    <p className="text-gray-500 mb-2">You scored {score}% and completed this training!</p>
                    <p className="text-sm" style={{color: '#6B7280'}}>Your next renewal is due in 1 year.</p>
                    <button onClick={() => window.location.href = '/staff'}
                      className="mt-6 px-6 py-3 rounded-lg text-white font-semibold"
                      style={{backgroundColor: '#0D9488'}}>
                      Back to Dashboard
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold mb-2 text-red-500">Not Quite!</h2>
                    <p className="text-gray-500 mb-2">You scored {score}%. You need 100% to complete this training.</p>
                    <p className="text-sm mb-6" style={{color: '#6B7280'}}>Please review the material and try again.</p>
                    <button onClick={handleRetake}
                      className="mt-2 px-6 py-3 rounded-lg text-white font-semibold"
                      style={{backgroundColor: '#0D2035'}}>
                      Review & Retake
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}