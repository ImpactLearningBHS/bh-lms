export async function POST(request) {
  const { title, content } = await request.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a behavioral health training quiz writer. Based on the following training content, generate exactly 6 multiple choice quiz questions. Each question must have exactly 4 answer choices, with only one correct answer.

Return ONLY valid JSON in this exact format, no other text, no markdown:
{
  "questions": [
    {
      "question": "Question text here?",
      "answers": [
        {"text": "Answer A", "correct": true},
        {"text": "Answer B", "correct": false},
        {"text": "Answer C", "correct": false},
        {"text": "Answer D", "correct": false}
      ]
    }
  ]
}

Training Title: ${title}

Training Content:
${content.substring(0, 4000)}`
      }]
    })
  });

  const data = await response.json();
  console.log('STATUS:', response.status);
  console.log('Anthropic response:', JSON.stringify(data));

  const text = data.content?.map(c => c.text || '').join('');
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return Response.json(parsed);
  } catch (err) {
    console.error('Parse error:', err, 'Raw text:', text);
    return Response.json({ error: 'Failed to parse questions' }, { status: 500 });
  }
}