import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHATBOT_SYSTEM_PROMPT = `You are Clod.AI, an AI-powered grievance assistant for the Government of Telangana's Smart Grievance Redressal System.

Your capabilities:
1. Guide citizens to file complaints
2. Explain departments and their responsibilities
3. Provide information on SLAs and expected resolution times
4. Help track complaint status
5. Answer FAQs about the grievance process
6. Support both English and Telugu languages

Key information:
- Portal: Telangana Smart Grievance Portal
- Departments: Roads & Buildings, Water Supply, Electricity, Municipal Administration, Sanitation, Revenue, Police, Healthcare, Education, Agriculture, Transport
- Tracking ID format: TS-GRV-YYYY-XXXXXX
- SLA: High priority (1 day), Medium priority (3 days), Low priority (7 days)
- Citizens can file complaints via text, voice, or image upload
- GPS location is captured for geo-tagging complaints

Be helpful, professional, and guide citizens through the grievance process. If asked about complaint status, direct them to the Track Complaint page with their tracking ID.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, language = 'en' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const languageInstruction = language === 'te' 
      ? '\n\nIMPORTANT: Respond in Telugu (తెలుగు) language.'
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: CHATBOT_SYSTEM_PROMPT + languageInstruction },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || 
      'I apologize, but I encountered an error. Please try again.';

    // Generate suggestions based on last message
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let suggestions: string[] = [];

    if (lastMessage.includes('status') || lastMessage.includes('track')) {
      suggestions = language === 'te' 
        ? ['నా ఫిర్యాదు స్థితి', 'ట్రాకింగ్ ID ఎంటర్ చేయండి']
        : ['Check my complaint status', 'Enter tracking ID'];
    } else if (lastMessage.includes('department') || lastMessage.includes('contact')) {
      suggestions = language === 'te'
        ? ['రోడ్లు విభాగం', 'నీటి సరఫరా', 'విద్యుత్']
        : ['Roads & Buildings', 'Water Supply', 'Electricity'];
    } else if (lastMessage.includes('file') || lastMessage.includes('submit') || lastMessage.includes('complaint')) {
      suggestions = language === 'te'
        ? ['ఫిర్యాదు ఎలా నమోదు చేయాలి?', 'ఫోటో అప్‌లోడ్', 'వాయిస్ ఫిర్యాదు']
        : ['How to file a complaint?', 'Upload photo', 'Voice complaint'];
    } else {
      suggestions = language === 'te'
        ? ['ఫిర్యాదు నమోదు', 'ఫిర్యాదు ట్రాక్', 'విభాగాలు', 'SLA సమాచారం']
        : ['File a complaint', 'Track complaint', 'Departments', 'SLA information'];
    }

    return NextResponse.json({
      message: content,
      suggestions,
    });
  } catch (error: any) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: 'I apologize, but I encountered an error. Please try again later.',
      },
      { status: 500 }
    );
  }
}
