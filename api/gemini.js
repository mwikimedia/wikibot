export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { system_instruction, contents, generationConfig } = req.body;

  // Convert Gemini format to Groq/OpenAI format
  const messages = [];

  if (system_instruction?.parts?.[0]?.text) {
    messages.push({ role: 'system', content: system_instruction.parts[0].text });
  }

  for (const turn of contents) {
    const role = turn.role === 'model' ? 'assistant' : 'user';
    const text = turn.parts?.[0]?.text || '';
    messages.push({ role, content: text });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: generationConfig?.temperature ?? 0.1,
        max_tokens: generationConfig?.maxOutputTokens ?? 1500
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // Return in Gemini-compatible format so the frontend doesn't need changes
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text }] } }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
