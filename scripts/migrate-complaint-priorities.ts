/**
 * Migration Script: Re-evaluate and update complaint priorities
 * 
 * This script:
 * 1. Fetches all existing complaints from Firestore
 * 2. Re-classifies each using the improved AI classification
 * 3. Updates priority based on keyword analysis if needed
 * 4. Recalculates SLA deadlines
 * 
 * Usage: Run from Node environment or integrate as an API endpoint
 */

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  QueryConstraint,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Priority } from '@/lib/types';
import { calculateSLADeadline } from '@/lib/utils';

// Detect priority from keywords (same logic as AI service)
function detectPriorityFromKeywords(text: string): Priority {
  const lowerText = text.toLowerCase();
  
  // HIGH priority keywords
  const highKeywords = [
    'emergency', 'urgent', 'critical', 'danger', 'hazard', 'threat',
    'death', 'dying', 'dead', 'injury', 'injured', 'accident',
    'fire', 'explosion', 'toxic', 'poison', 'flood', 'collapse',
    'infrastructure failure', 'major damage', 'life-threatening',
    'assault', 'violence', 'shooting', 'stabbing',
  ];
  
  // LOW priority keywords
  const lowKeywords = [
    'suggestion', 'feedback', 'inquiry', 'question', 'general', 'minor',
    'typo', 'small issue', 'information', 'request', 'help me understand',
    'can you explain', 'how do i',
  ];
  
  // Check high priority first
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
  
  // Default to medium
  return 'medium';
}

export async function migrateComplaintPriorities() {
  console.log('\n🔄 MIGRATION: Re-evaluating complaint priorities...\n');
  
  try {
    // Fetch all complaints
    const complaintsRef = collection(db, 'complaints');
    const q = query(complaintsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ No complaints found. Nothing to migrate.');
      return { success: true, updated: 0 };
    }
    
    console.log(`📊 Found ${snapshot.size} complaints to re-evaluate\n`);
    
    let updated = 0;
    let unchanged = 0;
    const priorityChanges: Record<string, number> = {
      'low→low': 0,
      'low→medium': 0,
      'low→high': 0,
      'medium→low': 0,
      'medium→medium': 0,
      'medium→high': 0,
      'high→low': 0,
      'high→medium': 0,
      'high→high': 0,
    };
    
    // Process each complaint
    for (const docSnap of snapshot.docs) {
      const complaintData = docSnap.data();
      const complaintId = docSnap.id;
      const oldPriority = complaintData.priority || 'medium';
      
      // Re-evaluate priority based on title and description
      const fullText = `${complaintData.title} ${complaintData.description}`;
      const newPriority = detectPriorityFromKeywords(fullText);
      
      // Calculate new SLA deadline if priority changed
      const slaDeadline = calculateSLADeadline(newPriority);
      
      const changeKey = `${oldPriority}→${newPriority}` as keyof typeof priorityChanges;
      priorityChanges[changeKey]++;
      
      // Only update if priority changed
      if (oldPriority !== newPriority) {
        try {
          await updateDoc(doc(db, 'complaints', complaintId), {
            priority: newPriority,
            slaDeadline: Timestamp.fromDate(slaDeadline),
            isOverdue: new Date() > slaDeadline,
            updatedAt: Timestamp.now(),
          });
          
          console.log(
            `✅ [${complaintData.trackingId}] Priority: ${oldPriority} → ${newPriority}`
          );
          console.log(`   Title: "${complaintData.title.substring(0, 50)}..."`);
          console.log(`   SLA Deadline: ${slaDeadline.toISOString()}\n`);
          
          updated++;
        } catch (updateError) {
          console.error(
            `❌ Failed to update ${complaintData.trackingId}:`,
            updateError
          );
        }
      } else {
        unchanged++;
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updated} complaints`);
    console.log(`⏸️  Unchanged: ${unchanged} complaints`);
    console.log('\n📊 Priority Changes:');
    Object.entries(priorityChanges).forEach(([change, count]) => {
      if (count > 0) {
        console.log(`   ${change}: ${count}`);
      }
    });
    console.log('='.repeat(60) + '\n');
    
    return { success: true, updated, unchanged, priorityChanges };
  } catch (error) {
    console.error('❌ Migration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export for use as API endpoint or direct call
export default migrateComplaintPriorities;
