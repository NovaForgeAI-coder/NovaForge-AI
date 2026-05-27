import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { messages } = await req.json()

    // Read injected AI Gateway variables
    const gatewayBaseUrl = Netlify.env.get('NETLIFY_AI_GATEWAY_BASE_URL') || 'https://api.netlify.com/api/v1/ai'
    const gatewayKey = Netlify.env.get('NETLIFY_AI_GATEWAY_KEY')

    // Call the OpenAI completions endpoint via AI Gateway using gpt-4o-mini for maximum speed and cost efficiency
    const response = await fetch(`${gatewayBaseUrl}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You are Nova, an inspiring, creative and helpful AI assistant for NovaForge AI, a wall-paper and logo generation web platform. Your goal is to guide users to create incredible visual prompt concepts. Help them brainstorm prompt descriptions, choose styles, and refine their ideas. Keep responses relatively concise and highly visual. Whenever you suggest a generation prompt, wrap it in backticks or double quotes (e.g. `a glowing neon turtle swimming in deep blue ocean`) so they can easily use it. You are friendly, modern, and write in clean markdown.'
          },
          ...messages
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI Gateway response failed:', response.status, errorText)
      return Response.json({ error: `AI Gateway error: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || 'I could not generate a response right now.'
    return Response.json({ response: content })
  } catch (err: any) {
    console.error('Error in chat function:', err)
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export const config = {
  path: '/api/chat',
}
