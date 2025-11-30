export interface Env {
  AI: any;
  CONVERSATIONS: any;
}

export class ConversationDO {
  state: any;
  messages: Array<{ role: string; content: string }>;

  constructor(state: any, env: Env) {
    this.state = state;
    this.messages = [];
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // Get conversation history
    if (request.method === 'GET' && url.pathname === '/history') {
      this.messages = (await this.state.storage.get('messages')) || [];
      return new Response(JSON.stringify({ messages: this.messages }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add message to history
    if (request.method === 'POST' && url.pathname === '/add') {
      const { role, content } = await request.json();
      this.messages = (await this.state.storage.get('messages')) || [];
      this.messages.push({ role, content });
      await this.state.storage.put('messages', this.messages);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Clear conversation
    if (request.method === 'POST' && url.pathname === '/clear') {
      await this.state.storage.delete('messages');
      this.messages = [];
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Chat endpoint - sends message to AI
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      try {
        const { message, conversationId } = await request.json();

        // Get Durable Object instance for this conversation
        const id = env.CONVERSATIONS.idFromName(conversationId || 'default');
        const stub = env.CONVERSATIONS.get(id);

        // Get conversation history
        const historyResponse = await stub.fetch('https://do/history');
        const { messages } = await historyResponse.json();

        // Add user message to history
        await stub.fetch('https://do/add', {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: message }),
        });

        // Prepare messages for AI
        const aiMessages = [
          {
            role: 'system',
            content:
              'You are a helpful study assistant for students. Provide clear, concise explanations for homework questions, academic concepts, and study topics. Be encouraging and educational.',
          },
          ...messages,
          { role: 'user', content: message },
        ];

        // Call Workers AI with Llama 3.3
        const response = await env.AI.run(
          '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
          {
            messages: aiMessages,
            max_tokens: 512,
            temperature: 0.7,
          }
        );

        const aiReply = response.response;

        // Save AI response to history
        await stub.fetch('https://do/add', {
          method: 'POST',
          body: JSON.stringify({ role: 'assistant', content: aiReply }),
        });

        return new Response(
          JSON.stringify({
            response: aiReply,
            conversationId: conversationId || 'default',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: error.message || 'Failed to process request' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get conversation history endpoint
    if (request.method === 'GET' && url.pathname === '/api/history') {
      const conversationId = url.searchParams.get('id') || 'default';
      const id = env.CONVERSATIONS.idFromName(conversationId);
      const stub = env.CONVERSATIONS.get(id);
      const response = await stub.fetch('https://do/history');
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clear conversation endpoint
    if (request.method === 'POST' && url.pathname === '/api/clear') {
      const { conversationId } = await request.json();
      const id = env.CONVERSATIONS.idFromName(conversationId || 'default');
      const stub = env.CONVERSATIONS.get(id);
      await stub.fetch('https://do/clear', { method: 'POST' });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('AI Study Assistant API - Use POST /api/chat', {
      headers: corsHeaders,
    });
  },
};