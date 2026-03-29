/**
 * Firestore Data Debugging Utility
 * 
 * Run this script to check what data exists in Firestore
 * and verify the structure matches what the officer dashboard expects.
 * 
 * Usage: Add this as a page like /app/debug/page.tsx temporarily
 * or integrate into your existing officer page during testing.
 */

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function checkFirestoreData() {
  console.group('🔍 FIRESTORE DATA DEBUG');
  
  try {
    // Check all complaints in the database
    const complaintsRef = collection(db, 'complaints');
    const allComplaintsQuery = query(
      complaintsRef,
      orderBy('createdAt', 'desc'),
      limit(20) // Get last 20 complaints
    );
    
    const snapshot = await getDocs(allComplaintsQuery);
    console.log(`✅ Total complaints in Firestore: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.warn('⚠️ NO COMPLAINTS FOUND IN FIRESTORE!');
      console.log('Please create a test complaint first.');
      console.groupEnd();
      return;
    }
    
    // Analyze each complaint
    console.log('\n📋 COMPLAINT DETAILS:');
    console.log('─────────────────────────────────────────────');
    
    const statusCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};
    let assignedCount = 0;
    let unassignedCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Count by status
      const status = data.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Count by department
      const dept = data.department || 'unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
      
      // Count assigned vs unassigned
      if (data.assignedOfficerId) {
        assignedCount++;
      } else {
        unassignedCount++;
      }
      
      // Log individual complaint details
      console.log(`\nComplaint ID: ${doc.id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Department: ${data.department}`);
      console.log(`  Assigned Officer: ${data.assignedOfficerId || 'UNASSIGNED'}`);
      console.log(`  Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
      console.log(`  Title: ${data.title?.substring(0, 50)}...`);
    });
    
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('─────────────────────────────────────────────');
    console.log(`Total Complaints: ${snapshot.size}`);
    console.log(`Assigned: ${assignedCount} | Unassigned: ${unassignedCount}`);
    
    console.log('\nBy Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === 'submitted' ? '🆕' : 
                    status === 'under_review' ? '👀' :
                    status === 'in_progress' ? '⚙️' :
                    status === 'resolved' ? '✅' : '❓';
      console.log(`  ${emoji} ${status}: ${count}`);
    });
    
    console.log('\nBy Department:');
    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`  🏢 ${dept}: ${count}`);
    });
    
    // Check what would be visible to an officer
    console.log('\n👮 OFFICER VISIBILITY CHECK:');
    console.log('─────────────────────────────────────────────');
    const actionableStatuses = ['submitted', 'under_review', 'in_progress'];
    let officerVisibleCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isActionable = actionableStatuses.includes(data.status);
      const isVisible = data.assignedOfficerId || isActionable;
      
      if (isVisible) {
        officerVisibleCount++;
        console.log(`✓ ${doc.id} - ${data.status} - ${data.assignedOfficerId ? 'Assigned' : 'Unassigned'}`);
      }
    });
    
    console.log(`\n📈 Complaints visible to officers: ${officerVisibleCount} / ${snapshot.size}`);
    
    if (officerVisibleCount === 0) {
      console.warn('\n⚠️ WARNING: NO COMPLAINTS ARE VISIBLE TO OFFICERS!');
      console.log('Possible reasons:');
      console.log('  1. All complaints have status: resolved, closed, rejected, or escalated');
      console.log('  2. Status values might be using hyphens instead of underscores');
      console.log('  3. Status field might be missing');
      console.log('\nExpected actionable statuses:', actionableStatuses);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
  
  console.groupEnd();
}

// Export for use in components
export default checkFirestoreData;
