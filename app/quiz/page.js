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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trainingId = params.get('training_id');
    const trainingTitle = params.get('title');
    if (trainingTitle) setTraining({ id: trainingId, title: trainingTitle });
    if (trainingId) fetchQuestions(trainingId);
  }, []);

  const fetchQuestions = async (trainingId) => {
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
    
      // Look up the database user to get the correct ID
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user.id)
        .single();
    
      const { data: insertData, error: insertError } = await supabase.from('training_completions').insert([{
        training_id: training.id,
        user_id: dbUser?.id || user.id,
        training_title: training.title,
        completed_date: today,
        completed_at: new Date().toISOString(),
        staff_name: dbUser?.full_name || user.email
      }]).select();
      console.log('Completion insert:', insertData, insertError);

      await supabase.from('quiz_attempts').insert([{
        user_id: user.id,
        training_id: training.id,
        score: finalScore,
        passed: true
      }]);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('quiz_attempts').insert([{
        user_id: user.id,
        training_id: training.id,
        score: finalScore,
        passed: false
      }]);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#FFFFFF'}}>
      <p style={{color: '#6B7280'}}>Loading quiz...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>

      {/* Header */}
      <div style={{backgroundColor: '#0D2035'}}>
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <img src="/ImpactWorkforce.png" alt="Impact Workforce" className="h-10" />
          <button
            onClick={() => window.location.href = '/branch'}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{backgroundColor: '#0D9488'}}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-bold mb-2" style={{color: '#0D2035'}}>{training?.title}</h1>
          <p className="text-sm mb-8" style={{color: '#6B7280'}}>Answer all questions correctly to complete this training.</p>

          {!submitted ? (
            <div>
              {questions.map((q, index) => (
                <div key={q.id} className="mb-8">
                  <p className="font-semibold text-gray-800 mb-3">
                    {index + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.answers.map(answer => (
                      <label
                        key={answer.id}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                        style={{
                          borderColor: answers[q.id] === answer.id ? '#0D9488' : '#E5E7EB',
                          backgroundColor: answers[q.id] === answer.id ? 'rgba(13,148,136,0.05)' : 'white'
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={answer.id}
                          checked={answers[q.id] === answer.id}
                          onChange={() => handleAnswer(q.id, answer.id)}
                          style={{accentColor: '#0D9488'}}
                        />
                        <span className="text-sm text-gray-700">{answer.answer_text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== questions.length}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm"
                style={{
                  backgroundColor: Object.keys(answers).length !== questions.length ? '#D1D5DB' : '#0D9488',
                  cursor: Object.keys(answers).length !== questions.length ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Quiz
              </button>
            </div>
          ) : (
            <div className="text-center">
              {score === 100 ? (
                <div>
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold mb-2" style={{color: '#0D9488'}}>Congratulations!</h2>
                  <p className="text-gray-500 mb-2">You scored {score}% and completed this training!</p>
                  <button
                    onClick={() => window.location.href = '/branch'}
                    className="mt-6 px-6 py-3 rounded-lg text-white font-semibold"
                    style={{backgroundColor: '#0D9488'}}
                  >
                    Back to Dashboard
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4">❌</div>
                  <h2 className="text-2xl font-bold mb-2 text-red-500">Not Quite!</h2>
                  <p className="text-gray-500 mb-2">You scored {score}%. You need 100% to complete this training.</p>
                  <p className="text-sm mb-6" style={{color: '#6B7280'}}>Please review the material and try again.</p>
                  <button
                    onClick={handleRetake}
                    className="mt-2 px-6 py-3 rounded-lg text-white font-semibold"
                    style={{backgroundColor: '#0D2035'}}
                  >
                    Retake Quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}