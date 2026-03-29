/**
 * API Route: Migrate complaint priorities
 * 
 * POST /api/migrate/priorities
 * 
 * This endpoint re-evaluates and updates priorities for all existing complaints
 * based on the improved AI classification with keyword analysis.
 * 
 * Uses Firestore REST API to bypass authentication issues in development.
 * Safety: Only works in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Priority } from '@/lib/types';
import { calculateSLADeadline } from '@/lib/utils';

// Detect priority from keywords
function detectPriorityFromKeywords(text: string): Priority {
  const lowerText = text.toLowerCase();
  
  const highKeywords = [
    'emergency', 'urgent', 'critical', 'danger', 'hazard', 'threat',
    'death', 'dying', 'dead', 'injury', 'injured', 'accident',
    'fire', 'explosion', 'toxic', 'poison', 'flood', 'collapse',
    'infrastructure failure', 'major damage', 'life-threatening',
    'assault', 'violence', 'shooting', 'stabbing',
  ];
  
  const lowKeywords = [
    'suggestion', 'feedback', 'inquiry', 'question', 'general', 'minor',
    'typo', 'small issue', 'information', 'request', 'help me understand',
    'can you explain', 'how do i',
  ];
  
  for (const keyword of highKeywords) {
    if (lowerText.includes(keyword)) {
      return 'high';
    }
  }
  
  for (const keyword of lowKeywords) {
    if (lowerText.includes(keyword)) {
      return 'low';
    }
  }
  
  return 'medium';
}

// Global Firebase app instance for server
let firebaseApp: any = null;

function getFirebaseApp() {
  if (!firebaseApp) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    try {
      // Just store config, we'll use REST API instead
      firebaseApp = firebaseConfig;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw new Error('Failed to initialize Firebase');
    }
  }
  return firebaseApp;
}

// Use Firestore REST API instead of SDK to bypass auth issues
async function queryComplaints() {
  const config = getFirebaseApp();
  const projectId = config.projectId;
  const apiKey = config.apiKey;
  
  // Use Firestore REST API with API key
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/complaints?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore API error:', response.status, errorText);
      throw new Error(`Firestore API error: ${response.status}`);
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Update complaint via REST API
async function updateComplaintPriority(
  complaintId: string,
  newPriority: Priority,
  slaDeadline: Date
) {
  const config = getFirebaseApp();
  const projectId = config.projectId;
  const apiKey = config.apiKey;
  
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/complaints/${complaintId}?key=${apiKey}&updateMask.fieldPaths=priority&updateMask.fieldPaths=slaDeadline&updateMask.fieldPaths=isOverdue&updateMask.fieldPaths=updatedAt`;
  
  const updateData = {
    fields: {
      priority: { stringValue: newPriority },
      slaDeadline: { timestampValue: slaDeadline.toISOString() },
      isOverdue: { booleanValue: new Date() > slaDeadline },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update error:', response.status, errorText);
      throw new Error(`Update failed: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Update error:', error);
    return false;
  }
}

// Helper to convert Firestore REST API document format
function parseFirestoreDoc(doc: any) {
  const fields = doc.fields || {};
  
  const getValue = (field: any): any => {
    if (!field) return null;
    if (field.stringValue) return field.stringValue;
    if (field.timestampValue) return new Date(field.timestampValue);
    if (field.booleanValue) return field.booleanValue;
    if (field.integerValue) return parseInt(field.integerValue);
    if (field.doubleValue) return parseFloat(field.doubleValue);
    if (field.arrayValue) return (field.arrayValue.values || []).map(getValue);
    if (field.mapValue) {
      const map: Record<string, any> = {};
      Object.entries(field.mapValue.fields || {}).forEach(([k, v]: [string, any]) => {
        map[k] = getValue(v);
      });
      return map;
    }
    return null;
  };

  return {
    id: doc.name.split('/').pop(),
    trackingId: getValue(fields.trackingId),
    title: getValue(fields.title),
    description: getValue(fields.description),
    priority: getValue(fields.priority),
    createdAt: getValue(fields.createdAt),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Security check: Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Migration not available in production' },
        { status: 403 }
      );
    }

    console.log('🔄 Starting priority migration...');
    
    // Fetch all complaints
    const complaints = await queryComplaints();
    console.log(`📊 Found ${complaints.length} complaints`);
    
    if (!complaints || complaints.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No complaints found',
        updated: 0,
        unchanged: 0,
      });
    }

    let updated = 0;
    let unchanged = 0;
    const priorityChanges: Record<string, number> = {};
    const details: Array<{
      trackingId: string;
      oldPriority: Priority;
      newPriority: Priority;
      title: string;
    }> = [];

    // Process each complaint
    for (const docSnap of complaints) {
      try {
        const complaintData = parseFirestoreDoc(docSnap);
        const complaintId = complaintData.id;
        const oldPriority = complaintData.priority || 'medium';
        
        const fullText = `${complaintData.title} ${complaintData.description}`;
        const newPriority = detectPriorityFromKeywords(fullText);
        
        const changeKey = `${oldPriority}→${newPriority}`;
        priorityChanges[changeKey] = (priorityChanges[changeKey] || 0) + 1;
        
        if (oldPriority !== newPriority) {
          const slaDeadline = calculateSLADeadline(newPriority);
          
          const success = await updateComplaintPriority(complaintId, newPriority, slaDeadline);
          
          if (success) {
            updated++;
            details.push({
              trackingId: complaintData.trackingId,
              oldPriority: oldPriority as Priority,
              newPriority,
              title: complaintData.title,
            });
            console.log(`✅ Updated ${complaintData.trackingId}: ${oldPriority} → ${newPriority}`);
          }
        } else {
          unchanged++;
        }
      } catch (error) {
        console.error('Error processing complaint:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${updated} updated, ${unchanged} unchanged`,
      total: complaints.length,
      updated,
      unchanged,
      priorityChanges,
      details: details.slice(0, 10),
      totalChanges: details.length,
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        details: JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
