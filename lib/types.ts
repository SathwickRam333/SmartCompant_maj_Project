// User Types
export type UserRole = 'citizen' | 'officer' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  department?: string;
  district?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  language: 'en' | 'te';
}

// Complaint Types
export type ComplaintStatus = 
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'escalated'
  | 'rejected';

export type Priority = 'high' | 'medium' | 'low';

export type InputType = 'text' | 'voice' | 'image';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  mandal?: string;
  pincode?: string;
}

export interface AssignedOfficer {
  id: string;
  name: string;
  email: string;
}

export interface ComplaintUpdateHistory {
  id?: string;
  message: string;
  updatedBy: string;
  previousStatus?: ComplaintStatus;
  newStatus?: ComplaintStatus;
  timestamp: Date | string;
  attachments?: Attachment[];
}

export interface Resolution {
  description: string;
  resolvedBy: string;
  resolvedAt: Date | string;
  afterImages?: string[];
}

export interface Complaint {
  id: string;
  trackingId: string;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone?: string;
  
  // Complaint Details
  title: string;
  description: string;
  category: string;
  department: string;
  inputType: InputType;
  
  // Location
  location: GeoLocation;
  
  // Files
  attachments: Attachment[];
  beforeImages?: string[];
  afterImages?: string[];
  
  // Status & Priority
  status: ComplaintStatus;
  priority: Priority;
  
  // Assignment
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficer?: AssignedOfficer;
  
  // SLA
  slaDeadline: Date | string;
  isOverdue?: boolean;
  escalationLevel?: number;
  
  // AI Classification
  aiClassification?: {
    department: string;
    confidence: number;
    keywords: string[];
  };
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  resolvedAt?: Date | string;
  
  // Updates History
  updates?: ComplaintUpdateHistory[];
  
  // Additional
  resolution?: string | Resolution;
  feedback?: ComplaintFeedback;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'audio';
  name: string;
  size: number;
  uploadedAt: Date;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  officerId: string;
  officerName: string;
  status: ComplaintStatus;
  comment: string;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface ComplaintFeedback {
  rating: number;
  comment?: string;
  createdAt: Date;
}

// Department Types
export interface Department {
  id: string;
  name: string;
  nameTE: string;
  code: string;
  description: string;
  headOfficerId?: string;
  isActive: boolean;
}

// Statistics Types
export interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  closedComplaints: number;
  escalatedComplaints: number;
  overdueComplaints: number;
  avgResolutionTime: number;
  byDepartment: Record<string, number>;
  byDistrict: Record<string, number>;
  byStatus: Partial<Record<ComplaintStatus, number>>;
  byPriority: Partial<Record<Priority, number>>;
  monthlyTrends: MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string;
  total: number;
  resolved: number;
  pending: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  language?: 'en' | 'te';
}

// Form Types
export interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  department?: string;
  inputType: InputType;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    district: string;
    mandal?: string;
    pincode?: string;
  };
  attachments: File[];
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  phone?: string;
  district?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Constants
export const DEPARTMENTS: Department[] = [
  { id: '1', name: 'Roads & Buildings', nameTE: 'రోడ్లు & భవనాలు', code: 'RB', description: 'Road maintenance, construction', isActive: true },
  { id: '2', name: 'Water Supply', nameTE: 'నీటి సరఫరా', code: 'WS', description: 'Water supply and drainage', isActive: true },
  { id: '3', name: 'Electricity', nameTE: 'విద్యుత్', code: 'ELEC', description: 'Power supply issues', isActive: true },
  { id: '4', name: 'Sanitation', nameTE: 'పారిశుద్ధ్యం', code: 'SAN', description: 'Waste management, cleaning', isActive: true },
  { id: '5', name: 'Healthcare', nameTE: 'ఆరోగ్య సంరక్షణ', code: 'HC', description: 'Public health services', isActive: true },
  { id: '6', name: 'Education', nameTE: 'విద్య', code: 'EDU', description: 'Schools, colleges', isActive: true },
  { id: '7', name: 'Revenue', nameTE: 'రెవెన్యూ', code: 'REV', description: 'Land records, property', isActive: true },
  { id: '8', name: 'Police', nameTE: 'పోలీసు', code: 'POL', description: 'Law and order', isActive: true },
  { id: '9', name: 'Transport', nameTE: 'రవాణా', code: 'TRN', description: 'Public transport, RTA', isActive: true },
  { id: '10', name: 'Agriculture', nameTE: 'వ్యవసాయం', code: 'AGR', description: 'Farming related issues', isActive: true },
  { id: '11', name: 'Social Welfare', nameTE: 'సామాజిక సంక్షేమం', code: 'SW', description: 'Welfare schemes', isActive: true },
  { id: '12', name: 'Municipal', nameTE: 'మున్సిపల్', code: 'MUN', description: 'Urban local body issues', isActive: true },
];

export const DISTRICTS = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon',
  'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar',
  'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial',
  'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
  'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
  'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad',
  'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'
];

export const CATEGORIES = [
  { id: 'road', name: 'Road & Infrastructure', nameTE: 'రోడ్డు & మౌలిక సదుపాయాలు' },
  { id: 'water', name: 'Water Supply', nameTE: 'నీటి సరఫరా' },
  { id: 'electricity', name: 'Electricity', nameTE: 'విద్యుత్' },
  { id: 'sanitation', name: 'Sanitation & Waste', nameTE: 'పారిశుద్ధ్యం' },
  { id: 'healthcare', name: 'Healthcare', nameTE: 'ఆరోగ్యం' },
  { id: 'education', name: 'Education', nameTE: 'విద్య' },
  { id: 'revenue', name: 'Land & Revenue', nameTE: 'భూమి & రెవెన్యూ' },
  { id: 'police', name: 'Police & Security', nameTE: 'పోలీసు & భద్రత' },
  { id: 'transport', name: 'Transport', nameTE: 'రవాణా' },
  { id: 'welfare', name: 'Social Welfare', nameTE: 'సామాజిక సంక్షేమం' },
  { id: 'corruption', name: 'Corruption', nameTE: 'అవినీతి' },
  { id: 'other', name: 'Other', nameTE: 'ఇతర' },
];

export const SLA_RULES: Record<Priority, number> = {
  high: 1,     // 1 day
  medium: 3,   // 3 days
  low: 7,      // 7 days
};

export const STATUS_LABELS: Record<ComplaintStatus, { en: string; te: string; color: string }> = {
  submitted: { en: 'Submitted', te: 'సమర్పించబడింది', color: 'bg-blue-100 text-blue-800' },
  under_review: { en: 'Under Review', te: 'సమీక్షలో', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { en: 'In Progress', te: 'ప్రోగ్రెస్‌లో', color: 'bg-purple-100 text-purple-800' },
  resolved: { en: 'Resolved', te: 'పరిష్కరించబడింది', color: 'bg-green-100 text-green-800' },
  closed: { en: 'Closed', te: 'మూసివేయబడింది', color: 'bg-gray-100 text-gray-800' },
  escalated: { en: 'Escalated', te: 'ఎస్కలేట్ చేయబడింది', color: 'bg-red-100 text-red-800' },
  rejected: { en: 'Rejected', te: 'తిరస్కరించబడింది', color: 'bg-red-100 text-red-800' },
};

export const PRIORITY_LABELS: Record<Priority, { en: string; te: string; color: string }> = {
  high: { en: 'High', te: 'అధిక', color: 'bg-red-100 text-red-800' },
  medium: { en: 'Medium', te: 'మధ్యస్థ', color: 'bg-yellow-100 text-yellow-800' },
  low: { en: 'Low', te: 'తక్కువ', color: 'bg-green-100 text-green-800' },
};
