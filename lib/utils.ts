import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInHours, addDays } from "date-fns";
import { SLA_RULES, Priority } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate Tracking ID: TS-GRV-2026-XXXXXX
export function generateTrackingId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `TS-GRV-${year}-${randomNum}`;
}

// Format date for display
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  return format(d, 'dd MMM yyyy, hh:mm a');
}

// Format relative time
export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  return formatDistanceToNow(d, { addSuffix: true });
}

// Calculate SLA deadline
export function calculateSLADeadline(priority: Priority, createdAt: Date = new Date()): Date {
  const daysToAdd = SLA_RULES[priority];
  return addDays(createdAt, daysToAdd);
}

// Check if complaint is overdue
export function isOverdue(deadline: Date | string | undefined | null): boolean {
  if (!deadline) return false;
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (isNaN(d.getTime())) return false;
  return new Date() > d;
}

// Get remaining time until deadline
export function getRemainingTime(deadline: Date | string): { 
  hours: number; 
  isOverdue: boolean;
  display: string;
} {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const hours = differenceInHours(d, new Date());
  const overdue = hours < 0;
  
  let display: string;
  if (overdue) {
    const overdueHours = Math.abs(hours);
    if (overdueHours > 24) {
      display = `${Math.floor(overdueHours / 24)} days overdue`;
    } else {
      display = `${overdueHours} hours overdue`;
    }
  } else {
    if (hours > 24) {
      display = `${Math.floor(hours / 24)} days remaining`;
    } else {
      display = `${hours} hours remaining`;
    }
  }
  
  return { hours, isOverdue: overdue, display };
}

// Truncate text
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validate email
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone (Indian)
export function isValidPhone(phone: string): boolean {
  const re = /^[6-9]\d{9}$/;
  return re.test(phone.replace(/\D/g, ''));
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Convert to Telugu numerals
export function toTeluguNumerals(num: number): string {
  const teluguNumerals = ['౦', '౧', '౨', '౩', '౪', '౫', '౬', '౭', '౮', '౯'];
  return num.toString().split('').map(d => teluguNumerals[parseInt(d)] || d).join('');
}

// Export data to CSV
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Get color for status/priority badges
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-800 border-blue-200',
    under_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
    escalated: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

// Parse coordinates from string
export function parseCoordinates(coords: string): { lat: number; lng: number } | null {
  const match = coords.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
