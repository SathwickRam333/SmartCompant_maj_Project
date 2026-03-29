import OpenAI from 'openai';
import { DEPARTMENTS, Priority } from '@/lib/types';

// Initialize OpenAI client - this runs on the server side (API routes)
const getOpenAIClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// Department classification prompt
const CLASSIFICATION_SYSTEM_PROMPT = `You are an AI assistant for the Government of Telangana's Grievance Redressal System. Your task is to analyze citizen complaints and classify them appropriately.

Available departments:
${DEPARTMENTS.map(d => `- ${d.name} (${d.code}): ${d.description}`).join('\n')}

For each complaint, you must:
1. Determine the most appropriate department
2. Assess the priority (high, medium, or low)
3. Extract key keywords

Priority Guidelines:
- HIGH: Life-threatening situations, medical emergencies, major infrastructure failures, safety hazards
- MEDIUM: Service disruptions, moderate issues affecting daily life
- LOW: General inquiries, minor inconveniences, suggestions

Respond in JSON format only:
{
  "department": "Department Name",
  "departmentCode": "CODE",
  "priority": "high|medium|low",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2"],
  "reasoning": "Brief explanation"
}`;

// Chatbot system prompt
const CHATBOT_SYSTEM_PROMPT = `You are Clod.AI, the AI Assistant for the Government of Telangana's Smart Grievance Redressal System.

Your capabilities:
1. Help citizens understand how to file complaints
2. Answer FAQs about the grievance system
3. Provide information about different departments
4. Guide users through the complaint process
5. Explain complaint status and tracking

Important guidelines:
- Be polite, professional, and helpful
- Respond in the user's language (English or Telugu)
- Keep responses concise but complete
- If you don't know something, admit it and suggest contacting the helpline
- Never make promises about resolution times or outcomes
- For specific complaint status, ask for the tracking ID

Telangana Government Departments:
- Roads & Buildings: Road maintenance, construction
- Water Supply: Water distribution, drainage
- Electricity (TSSPDCL/TSNPDCL): Power supply issues
- Sanitation: Waste management, cleaning
- Healthcare: Public health services
- Education: Schools, colleges
- Revenue: Land records, property
- Police: Law and order
- Transport: RTA, public transport
- Agriculture: Farming support
- Social Welfare: Welfare schemes
- Municipal: Urban local body issues

Helpline: 1800-599-7979 (Toll Free)
Website: grievance.telangana.gov.in`;

export interface ClassificationResult {
  department: string;
  departmentCode: string;
  priority: Priority;
  confidence: number;
  keywords: string[];
  reasoning?: string;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

// Keyword-based priority detection fallback
function detectPriorityFromKeywords(text: string): Priority {
  const lowerText = text.toLowerCase();
  
  // HIGH priority keywords
  const highKeywords = [
    'emergency', 'urgent', 'critical', 'danger', 'hazard', 'threat',
    'death', 'dying', 'dead', 'injury', 'injured', 'accident',
    'fire', 'explosion', 'toxic', 'poison', 'flood', 'collapse',
    'infrastructure failure', 'major damage', 'life-threatening',
    'assault', 'violence', 'shooting', 'stabbing'
  ];
  
  // LOW priority keywords
  const lowKeywords = [
    'suggestion', 'feedback', 'inquiry', 'question', 'general', 'minor',
    'typo', 'small issue', 'information', 'request', 'help me understand',
    'can you explain', 'how do i'
  ];
  
  // Check high priority first (they're more important)
  for (const keyword of highKeywords) {
    if (lowerText.includes(keyword)) {
      return 'high';
    }
  }
  
  // Check low priority
  for (const keyword of lowKeywords) {
    if (lowerText.includes(keyword)) {
      return 'low';
    }
  }
  
  // Default to medium if no strong signals
  return 'medium';
}

// Extract keywords from complaint text
function extractKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  
  // Remove common stopwords and get unique high-frequency words
  const stopwords = new Set([
    'the', 'and', 'from', 'that', 'with', 'this', 'have', 'been',
    'where', 'what', 'when', 'which', 'will', 'please', 'need'
  ]);
  
  const keywords = Array.from(new Set(words))
    .filter(w => !stopwords.has(w))
    .slice(0, 5);
  
  return keywords;
}

// Classify complaint using OpenAI
export async function classifyComplaint(
  title: string,
  description: string
): Promise<ClassificationResult> {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not configured. Using fallback keyword analysis.');
      const priority = detectPriorityFromKeywords(`${title} ${description}`);
      return {
        department: 'Municipal',
        departmentCode: 'MUN',
        priority,
        confidence: 0.4,
        keywords: extractKeywords(title, description),
        reasoning: 'Classified using keyword analysis (API key not configured)',
      };
    }

    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: `Title: ${title}\n\nDescription: ${description}` }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content);
    
    return {
      department: result.department || 'Municipal',
      departmentCode: result.departmentCode || 'MUN',
      priority: (result.priority as Priority) || 'medium',
      confidence: result.confidence || 0.7,
      keywords: result.keywords || [],
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.error('❌ AI Classification error:', error instanceof Error ? error.message : String(error));
    
    // Use keyword-based fallback for priority
    const priority = detectPriorityFromKeywords(`${title} ${description}`);
    console.log(`📊 Using keyword fallback: priority=${priority}`);
    
    return {
      department: 'Municipal',
      departmentCode: 'MUN',
      priority,
      confidence: 0.4,
      keywords: extractKeywords(title, description),
      reasoning: 'Classified using keyword analysis (AI fallback)',
    };
  }
}

// Chat with AI assistant
export async function chatWithAssistant(
  messages: { role: 'user' | 'assistant'; content: string }[],
  language: 'en' | 'te' = 'en'
): Promise<ChatResponse> {
  try {
    const openai = getOpenAIClient();

    const languageInstruction = language === 'te' 
      ? '\n\nIMPORTANT: Respond in Telugu (తెలుగు) language.'
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: CHATBOT_SYSTEM_PROMPT + languageInstruction },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';
    
    // Generate suggestions based on context
    const suggestions = generateSuggestions(messages[messages.length - 1]?.content || '', language);

    return {
      message: content,
      suggestions,
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      message: language === 'te' 
        ? 'క్షమించండి, లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.' 
        : 'I apologize, but I encountered an error. Please try again.',
    };
  }
}

// Get complaint status helper
export async function getComplaintStatusInfo(
  trackingId: string,
  language: 'en' | 'te' = 'en'
): Promise<string> {
  // This would be integrated with the actual complaint lookup
  // For now, return a helpful message
  if (language === 'te') {
    return `మీ ఫిర్యాదు ట్రాకింగ్ ID: ${trackingId}. దయచేసి "Track Complaint" పేజీలో మీ ఫిర్యాదు స్థితిని తనిఖీ చేయండి.`;
  }
  return `To check the status of your complaint (${trackingId}), please visit the "Track Complaint" page or use the tracking feature in the portal.`;
}

// Generate contextual suggestions
function generateSuggestions(lastMessage: string, language: 'en' | 'te'): string[] {
  const lowerMessage = lastMessage.toLowerCase();
  
  const suggestionSets: Record<string, { en: string[]; te: string[] }> = {
    default: {
      en: [
        'How do I file a complaint?',
        'What departments are available?',
        'Track my complaint status',
        'What is the resolution time?'
      ],
      te: [
        'ఫిర్యాదు ఎలా చేయాలి?',
        'ఏ విభాగాలు అందుబాటులో ఉన్నాయి?',
        'నా ఫిర్యాదు స్థితి ట్రాక్ చేయండి',
        'పరిష్కార సమయం ఎంత?'
      ]
    },
    status: {
      en: [
        'What does "In Progress" mean?',
        'When will my complaint be resolved?',
        'Who is handling my complaint?',
        'How do I escalate my complaint?'
      ],
      te: [
        '"మధ్యలో ఉంది" అంటే ఏమిటి?',
        'నా ఫిర్యాదు ఎప్పుడు పరిష్కరించబడుతుంది?',
        'నా ఫిర్యాదును ఎవరు హ్యాండిల్ చేస్తున్నారు?',
        'నా ఫిర్యాదును ఎలా ఎస్కలేట్ చేయాలి?'
      ]
    },
    department: {
      en: [
        'Contact Roads & Buildings department',
        'Contact Water Supply department',
        'Contact Electricity department',
        'Contact Municipal department'
      ],
      te: [
        'రోడ్లు & భవనాల విభాగాన్ని సంప్రదించండి',
        'నీటి సరఫరా విభాగాన్ని సంప్రదించండి',
        'విద్యుత్ విభాగాన్ని సంప్రదించండి',
        'మున్సిపల్ విభాగాన్ని సంప్రదించండి'
      ]
    }
  };

  if (lowerMessage.includes('status') || lowerMessage.includes('track')) {
    return suggestionSets.status[language];
  }
  
  if (lowerMessage.includes('department') || lowerMessage.includes('contact')) {
    return suggestionSets.department[language];
  }

  return suggestionSets.default[language];
}

// Translate text (simple implementation - for production use a proper translation API)
export async function translateText(
  text: string,
  targetLanguage: 'en' | 'te'
): Promise<string> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the following text to ${targetLanguage === 'te' ? 'Telugu' : 'English'}. Only output the translation, nothing else.`
        },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
