import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Government Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="relative h-16 w-16 flex-shrink-0">
                <Image
                  src="/telangana-emblem.svg"
                  alt="Telangana Emblem"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">Government of Telangana</h3>
                <p className="text-accent text-sm">AI Powered Smart Grievance Redressal System</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              Empowering citizens with a transparent, efficient, and AI-driven platform for grievance resolution.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-accent mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/complaint/new" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  File Complaint
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  Track Complaint
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  Public Dashboard
                </Link>
              </li>
              <li>
                <Link href="/chatbot" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  AI Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-accent mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">
                  Chief Minister's Office<br />
                  Government of Telangana<br />
                  Near Tank Bund, Hyderabad<br />
                  Telangana, India
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="text-sm text-gray-300">1800-599-7979 (Toll Free)</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-accent flex-shrink-0" />
                <span className="text-sm text-gray-300">grievance@telangana.gov.in</span>
              </li>
            </ul>
          </div>

          {/* Important Links */}
          <div>
            <h4 className="font-semibold text-accent mb-4">Important Links</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.telangana.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-accent transition-colors inline-flex items-center"
                >
                  Telangana Government Portal
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>
                <a
                  href="https://meeseva.telangana.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-accent transition-colors inline-flex items-center"
                >
                  MeeSeva
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-300 hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-primary-700" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-300 text-center md:text-left">
            © {currentYear} Government of Telangana. All rights reserved.
          </div>
          
          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm text-accent font-medium">Designed and Developed by</p>
            <div className="flex items-center space-x-3">
              <div className="relative h-12 w-24">
                <Image
                  src="/vnr-logo.svg"
                  alt="VNR VJIET Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-left">
                <p className="text-sm text-white font-medium">VNRVJIET</p>
                <p className="text-xs text-gray-300">Department of Computer Science & Engineering</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
