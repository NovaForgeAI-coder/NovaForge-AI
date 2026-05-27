import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { messages } = await req.json()

    // Support both direct OpenAI API keys and Netlify's AI Gateway
    const openaiApiKey = Netlify.env.get('OPENAI_API_KEY')
    const gatewayKey = Netlify.env.get('NETLIFY_AI_GATEWAY_KEY')

    let apiUrl = ''
    let authHeader = ''

    if (openaiApiKey) {
      apiUrl = 'https://api.openai.com/v1/chat/completions'
      authHeader = `Bearer ${openaiApiKey}`
    } else {
      const gatewayBaseUrl = Netlify.env.get('NETLIFY_AI_GATEWAY_BASE_URL') || 'https://api.netlify.com/api/v1/ai'
      apiUrl = `${gatewayBaseUrl}/openai/v1/chat/completions`
      authHeader = `Bearer ${gatewayKey}`
    }

    // Call the OpenAI completions endpoint using gpt-4o-mini for maximum speed and cost efficiency
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You are Nova, an inspiring, creative, and helpful AI assistant for NovaForge AI, a wallpaper and logo generation web platform. You are a versatile companion: while you are excellent at helping users design incredible visual prompt concepts, suggest styles, and refine their ideas, you are also fully capable of answering general questions, explaining topics, or just chatting about any subject the user asks. You fully support and understand the Russian language (Русский язык)—always respond in the same language the user addresses you in (Russian or English). Since the image generator requires English prompts, if you suggest or brainstorm a generation prompt for a Russian user, make sure the prompt itself is written in English inside backticks or double quotes so they can easily use it in the generator, but write the rest of your explanation and conversation in Russian. Keep responses friendly, modern, relatively concise, and write in clean markdown.'
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
