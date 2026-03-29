'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugPage() {
  const { user } = useAuth();
  const [debugOutput, setDebugOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const emoji = type === 'info' ? 'ℹ️' : 
                  type === 'warn' ? '⚠️' : 
                  type === 'error' ? '❌' : '✅';
    setDebugOutput(prev => [...prev, `${emoji} ${message}`]);
  };

  const checkData = async () => {
    setDebugOutput([]);
    setLoading(true);
    
    try {
      addLog('Starting Firestore data check...', 'info');
      
      // Check all complaints
      const complaintsRef = collection(db, 'complaints');
      const allComplaintsQuery = query(
        complaintsRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      addLog('Executing Firestore query...', 'info');
      const snapshot = await getDocs(allComplaintsQuery);
      addLog(`Total complaints found: ${snapshot.size}`, 'success');
      
      if (snapshot.empty) {
        addLog('NO COMPLAINTS IN DATABASE! Create a test complaint first.', 'warn');
        setLoading(false);
        return;
      }
      
      // Analyze data
      const statusCounts: Record<string, number> = {};
      const actionableStatuses = ['submitted', 'under_review', 'in_progress'];
      let officerVisibleCount = 0;
      
      addLog('─────────────────────────', 'info');
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        const isActionable = actionableStatuses.includes(status);
        const isVisible = data.assignedOfficerId || isActionable;
        
        if (isVisible) {
          officerVisibleCount++;
        }
        
        addLog(
          `ID: ${doc.id.substring(0, 8)}... | Status: ${status} | Dept: ${data.department} | Officer: ${data.assignedOfficerId || 'NONE'}`,
          isVisible ? 'success' : 'warn'
        );
      });
      
      addLog('─────────────────────────', 'info');
      addLog(`Complaints visible to officers: ${officerVisibleCount} / ${snapshot.size}`, officerVisibleCount > 0 ? 'success' : 'error');
      
      addLog('Status breakdown:', 'info');
      Object.entries(statusCounts).forEach(([status, count]) => {
        addLog(`  ${status}: ${count}`, 'info');
      });
      
      if (officerVisibleCount === 0) {
        addLog('WARNING: No complaints visible to officers!', 'error');
        addLog('Check if all complaints have status: resolved, closed, rejected, or escalated', 'warn');
        addLog(`Expected statuses: ${actionableStatuses.join(', ')}`, 'info');
      }
      
    } catch (error: any) {
      addLog(`ERROR: ${error.message}`, 'error');
      console.error('Full error:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      addLog(`Logged in as: ${user.email} (${user.uid})`, 'success');
      addLog(`User role: Checking user document...`, 'info');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">🔍 Firestore Debug Tool</h1>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Purpose:</strong> This tool helps diagnose why complaints aren't showing in the officer dashboard.
              It queries your Firestore database and shows exactly what data exists.
            </p>
          </div>

          {user ? (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                ✅ Logged in as: <strong>{user.email}</strong>
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                ❌ Not logged in. Please login first.
              </p>
            </div>
          )}

          <button
            onClick={checkData}
            disabled={loading || !user}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
          >
            {loading ? 'Checking...' : 'Check Firestore Data'}
          </button>

          {/* Debug Output */}
          {debugOutput.length > 0 && (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
              {debugOutput.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold mb-2">📝 What to check:</h3>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>1. Are there any complaints in the database?</li>
              <li>2. What status values are being used? (should be: submitted, under_review, in_progress)</li>
              <li>3. Are any complaints marked as "visible to officers"?</li>
              <li>4. Check the browser console (F12) for additional details</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
            <h3 className="font-semibold mb-2">🔧 Common Issues:</h3>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• <strong>Status values with hyphens:</strong> Change "in-progress" to "in_progress"</li>
              <li>• <strong>All complaints resolved:</strong> Create a new test complaint</li>
              <li>• <strong>Empty database:</strong> Submit a complaint as a citizen first</li>
              <li>• <strong>Permission denied:</strong> Check Firestore rules allow officers to read</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
