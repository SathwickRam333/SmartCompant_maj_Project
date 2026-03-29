'use client';

import { useState } from 'react';
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FixDataPage() {
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setResults(prev => [...prev, `${emoji} ${message}`]);
  };

  const fixOfficerDepartments = async () => {
    setResults([]);
    setIsFixing(true);

    try {
      addResult('Starting department fix...', 'info');

      // Get all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      addResult(`Found ${usersSnapshot.size} users`, 'info');

      let fixed = 0;
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        if (userData.role === 'officer' || userData.role === 'admin') {
          const currentDept = userData.department;
          addResult(`Officer: ${userData.displayName} - Current dept: ${currentDept}`, 'info');

          // Fix common mismatches
          if (currentDept === 'Municipal Administration') {
            await updateDoc(doc(db, 'users', userDoc.id), {
              department: 'Municipal'
            });
            addResult(`Updated ${userData.displayName}: Municipal Administration → Municipal`, 'success');
            fixed++;
          } else if (currentDept === 'Roads and Buildings') {
            await updateDoc(doc(db, 'users', userDoc.id), {
              department: 'Roads & Buildings'
            });
            addResult(`Updated ${userData.displayName}: Roads and Buildings → Roads & Buildings`, 'success');
            fixed++;
          } else if (currentDept === 'IT & Communications') {
            await updateDoc(doc(db, 'users', userDoc.id), {
              department: 'Municipal'  // Map to Municipal for now
            });
            addResult(`Updated ${userData.displayName}: IT & Communications → Municipal (mapped)`, 'success');
            fixed++;
          }
        }
      }

      addResult(`✨ Fixed ${fixed} officer departments`, 'success');
      
      toast({
        title: 'Department Fix Complete',
        description: `Updated ${fixed} officer records`,
      });

    } catch (error: any) {
      addResult(`Error: ${error.message}`, 'error');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  const verifyData = async () => {
    setResults([]);
    setIsFixing(true);

    try {
      addResult('Verifying database...', 'info');

      // Check users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      addResult(`Total users: ${usersSnapshot.size}`, 'info');

      const officers = usersSnapshot.docs.filter(d => d.data().role === 'officer');
      const citizens = usersSnapshot.docs.filter(d => d.data().role === 'citizen');
      const admins = usersSnapshot.docs.filter(d => d.data().role === 'admin');

      addResult(`Officers: ${officers.length}`, 'info');
      addResult(`Citizens: ${citizens.length}`, 'info');
      addResult(`Admins: ${admins.length}`, 'info');

      // Check complaints
      const complaintsSnapshot = await getDocs(collection(db, 'complaints'));
      addResult(`Total complaints: ${complaintsSnapshot.size}`, 'info');

      const deptCounts: Record<string, number> = {};
      complaintsSnapshot.docs.forEach(doc => {
        const dept = doc.data().department || 'unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      addResult('Complaints by department:', 'info');
      Object.entries(deptCounts).forEach(([dept, count]) => {
        addResult(`  ${dept}: ${count}`, 'info');
      });

      // Check officer departments
      addResult('Officer departments:', 'info');
      officers.forEach(doc => {
        const data = doc.data();
        addResult(`  ${data.displayName}: ${data.department || 'NO DEPARTMENT'}`, 
          data.department ? 'success' : 'error');
      });

    } catch (error: any) {
      addResult(`Error: ${error.message}`, 'error');
    } finally {
      setIsFixing(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only admins can access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Data Fix Tools</CardTitle>
            <CardDescription>
              Tools to fix common data issues in the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={fixOfficerDepartments}
                disabled={isFixing}
                className="flex-1"
              >
                {isFixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fix Officer Departments
              </Button>

              <Button
                onClick={verifyData}
                disabled={isFixing}
                variant="outline"
                className="flex-1"
              >
                {isFixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Data
              </Button>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold mb-2">What this fixes:</h3>
              <ul className="text-sm space-y-1">
                <li>• "Municipal Administration" → "Municipal"</li>
                <li>• "Roads and Buildings" → "Roads & Buildings"</li>
                <li>• "IT & Communications" → "Municipal" (mapped)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
                {results.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Valid Departments</CardTitle>
            <CardDescription>These are the correct department names in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>✅ Roads & Buildings</div>
              <div>✅ Water Supply</div>
              <div>✅ Electricity</div>
              <div>✅ Sanitation</div>
              <div>✅ Healthcare</div>
              <div>✅ Education</div>
              <div>✅ Revenue</div>
              <div>✅ Police</div>
              <div>✅ Transport</div>
              <div>✅ Agriculture</div>
              <div>✅ Social Welfare</div>
              <div>✅ Municipal</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
