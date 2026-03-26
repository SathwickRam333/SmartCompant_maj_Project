'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Search,
  BarChart3,
  MessageSquare,
  Shield,
  Clock,
  Users,
  Globe,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: FileText,
    title: 'Easy Complaint Filing',
    description: 'Submit complaints via text, voice, or image with auto GPS capture',
    titleTE: 'సులభమైన ఫిర్యాదు ఫైలింగ్',
  },
  {
    icon: Search,
    title: 'Real-time Tracking',
    description: 'Track your complaint status with unique tracking ID',
    titleTE: 'రియల్-టైమ్ ట్రాకింగ్',
  },
  {
    icon: MessageSquare,
    title: 'AI Chatbot Support',
    description: '24/7 assistance from our AI assistant Clod.AI',
    titleTE: 'AI చాట్‌బాట్ సహాయం',
  },
  {
    icon: BarChart3,
    title: 'Public Dashboard',
    description: 'View real-time statistics and department performance',
    titleTE: 'పబ్లిక్ డాష్‌బోర్డ్',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is protected with enterprise-grade security',
    titleTE: 'సురక్షిత & ప్రైవేట్',
  },
  {
    icon: Globe,
    title: 'Multilingual Support',
    description: 'Available in English and Telugu',
    titleTE: 'బహుభాషా మద్దతు',
  },
];

const stats = [
  { value: '50,000+', label: 'Complaints Resolved' },
  { value: '33', label: 'Districts Covered' },
  { value: '12+', label: 'Departments' },
  { value: '< 3 days', label: 'Avg Resolution Time' },
];

const howItWorks = [
  {
    step: 1,
    title: 'Register or Login',
    description: 'Create an account or login to access the portal',
  },
  {
    step: 2,
    title: 'Submit Complaint',
    description: 'File your complaint with details and supporting documents',
  },
  {
    step: 3,
    title: 'AI Classification',
    description: 'Our AI automatically routes your complaint to the right department',
  },
  {
    step: 4,
    title: 'Track & Resolve',
    description: 'Track progress and receive updates until resolution',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="relative h-24 w-24">
                  <Image
                    src="/telangana-emblem.svg"
                    alt="Telangana Emblem"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Government of Telangana
              </h1>
              <h2 className="text-xl md:text-2xl lg:text-3xl text-accent font-semibold mb-6">
                AI Powered Smart Grievance Redressal System
              </h2>
              <p className="text-lg text-gray-200 mb-8 max-w-xl mx-auto lg:mx-0">
                A transparent, efficient, and citizen-centric platform for registering 
                and tracking grievances with AI-powered routing and real-time updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/complaint/new">
                  <Button size="lg" variant="accent" className="w-full sm:w-auto">
                    <FileText className="mr-2 h-5 w-5" />
                    File a Complaint
                  </Button>
                </Link>
                <Link href="/track">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-primary"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Track Complaint
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-lg blur-3xl"></div>
                {/* Hero Illustration */}
                <div className="relative bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 overflow-hidden">
                  <div className="relative h-80 w-full">
                    <Image
                      src="/hero-illustration.svg"
                      alt="Citizens using digital grievance portal"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {stats.map((stat, index) => (
                      <div key={index} className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-accent">{stat.value}</div>
                        <div className="text-xs text-gray-300">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Mobile */}
      <section className="lg:hidden bg-primary-800 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-accent">{stat.value}</div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Why Choose Our Portal?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Powered by AI and designed for transparency, our grievance redressal system 
              ensures your voice is heard and your issues are resolved efficiently.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-accent text-sm">
                    {feature.titleTE}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Filing a grievance is simple and straightforward
            </p>
          </div>
          
          {/* Process Illustration */}
          <div className="mb-12 flex justify-center">
            <div className="relative w-full max-w-4xl h-48 md:h-64">
              <Image
                src="/process-flow.svg"
                alt="Grievance filing process illustration"
                fill
                className="object-contain"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-primary">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-4 z-10">
                    <ArrowRight className="h-8 w-8 text-accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-5"></div>
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to File Your Grievance?
              </h2>
              <p className="text-gray-200 mb-8 max-w-xl">
                Join thousands of citizens who have successfully resolved their grievances 
                through our AI-powered platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/register">
                  <Button size="lg" variant="accent">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/chatbot">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white hover:text-primary"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Chat with AI Assistant
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 hidden lg:flex justify-center">
              <div className="relative h-64 w-64">
                <Image
                  src="/cta-illustration.svg"
                  alt="Happy citizens illustration"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Departments We Cover
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our system routes complaints to the appropriate department automatically
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              'Roads & Buildings',
              'Water Supply',
              'Electricity',
              'Sanitation',
              'Healthcare',
              'Education',
              'Revenue',
              'Police',
              'Transport',
              'Agriculture',
              'Social Welfare',
              'Municipal',
            ].map((dept, index) => (
              <div
                key={index}
                className="flex items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <CheckCircle className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                <span className="text-sm font-medium">{dept}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Public Dashboard
              </Button>
            </Link>
            <Link href="/faq">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                FAQs
              </Button>
            </Link>
            <Link href="/chatbot">
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Assistance
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
