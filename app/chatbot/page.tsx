'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Loader2,
  Mic,
  MicOff,
  Trash2,
  Sparkles,
  FileText,
  MapPin,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/lib/types';

// Chat API function
async function sendChatMessage(messages: { role: string; content: string }[], language: string = 'en') {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, language }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

const quickActions = [
  {
    icon: FileText,
    label: 'File a Complaint',
    prompt: 'How do I file a complaint?',
  },
  {
    icon: MapPin,
    label: 'Track Complaint',
    prompt: 'How can I track my complaint status?',
  },
  {
    icon: Clock,
    label: 'SLA Information',
    prompt: 'What is the expected resolution time for complaints?',
  },
  {
    icon: HelpCircle,
    label: 'General Help',
    prompt: 'What services does this portal offer?',
  },
];

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `**Namaste! 🙏 Welcome to Clod.AI**

I'm your AI assistant for the Telangana Grievance Redressal System. I can help you with:

• **Filing Complaints** - Guide you through the complaint submission process
• **Tracking Status** - Check the status of your existing complaints
• **Information** - Provide details about departments, SLAs, and processes
• **Language Support** - I can assist in both English and Telugu

How can I help you today?`,
  timestamp: new Date().toISOString(),
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message?: string) => {
    const content = message || inputValue.trim();
    if (!content) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Convert messages to format expected by API (include the new user message)
      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const response = await sendChatMessage(conversationHistory);

      if (response.message) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment, or you can contact our helpline at 1800-XXX-XXXX for immediate assistance.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceInput = async () => {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: 'Not Supported',
          description: 'Speech recognition is not supported in this browser',
          variant: 'destructive',
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: 'Voice Input Error',
          description: 'Could not recognize speech. Please try again.',
          variant: 'destructive',
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      toast({
        title: 'Microphone Error',
        description: 'Please allow microphone access',
        variant: 'destructive',
      });
    }
  };

  const clearChat = () => {
    setMessages([welcomeMessage]);
    toast({
      title: 'Chat Cleared',
      description: 'Conversation history has been reset',
    });
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, idx) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.startsWith('•') || line.startsWith('-')) {
          return `<li key="${idx}" class="ml-4">${line.substring(1).trim()}</li>`;
        }
        return `<p key="${idx}" class="mb-1">${line}</p>`;
      })
      .join('');
  };

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Clod.AI</h1>
          <p className="text-gray-600 text-lg">AI Powered Grievance Assistant</p>
          <Badge variant="secondary" className="mt-2">
            Powered by GPT-3.5 Turbo
          </Badge>
        </div>

        {/* Chat Container */}
        <Card className="mb-4">
          <CardHeader className="border-b pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Chat with Clod.AI
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages Area */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {message.role === 'assistant' ? (
                      <>
                        <AvatarFallback className="bg-primary text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarFallback className="bg-accent text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                    />
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="border-t border-b p-3 overflow-x-auto">
              <div className="flex gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => handleSendMessage(action.prompt)}
                    disabled={isLoading}
                  >
                    <action.icon className="h-4 w-4 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={startVoiceInput}
                  disabled={isLoading}
                  className={isListening ? 'bg-red-100 text-red-600 animate-pulse' : ''}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message or ask a question..."
                  disabled={isLoading || isListening}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Press Enter to send • Click microphone for voice input
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-primary mb-2">🎯 Smart Assistance</h3>
              <p className="text-sm text-gray-600">
                Get instant help with filing complaints, tracking status, and navigating the portal.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-accent mb-2">🌐 Multilingual</h3>
              <p className="text-sm text-gray-600">
                Communicate in English or Telugu. Our AI understands both languages.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-green-700 mb-2">🔒 Secure & Private</h3>
              <p className="text-sm text-gray-600">
                Your conversations are encrypted and never stored permanently.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
