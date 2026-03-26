'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Upload Complaint', href: '/complaint/new' },
  { name: 'Track Complaint', href: '/track' },
  { name: 'AI Chatbot', href: '/chatbot' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-primary sticky top-0 z-50 shadow-lg">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                  src="/telangana-emblem.svg"
                  alt="Telangana Emblem"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-sm font-medium">Government of Telangana</p>
                <p className="text-accent text-xs">Smart Grievance System</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-accent'
                    : 'text-white hover:text-accent'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-white hover:text-accent hover:bg-primary-800"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-accent text-primary text-sm">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline-block text-sm">
                      {user.displayName}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.displayName}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                      <span className="text-xs text-accent capitalize mt-1">
                        {user.role}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'officer' && (
                    <DropdownMenuItem asChild>
                      <Link href="/officer" className="cursor-pointer">
                        Officer Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-white hover:text-accent hover:bg-primary-800"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="accent" className="hidden sm:inline-flex">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-primary-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-primary-700">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive(item.href)
                      ? 'bg-primary-800 text-accent'
                      : 'text-white hover:bg-primary-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {!user && (
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-accent"
                >
                  Register
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
