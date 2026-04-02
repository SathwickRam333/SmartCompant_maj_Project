'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  User,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EscalationResult {
  checked: number;
  escalated: number;
  details: Array<{
    trackingId: string;
    title: string;
    assignedOfficer: string;
    daysOverdue: number;
  }>;
}

interface OverdueStats {
  totalOverdue: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byOfficer: Record<string, number>;
}

export default function EscalationMonitor() {
  const [isChecking, setIsChecking] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [stats, setStats] = useState<OverdueStats | null>(null);
  const [lastResult, setLastResult] = useState<EscalationResult | null>(null);
  const { toast } = useToast();

  const checkOverdueStats = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/escalate-overdue?check=true');
      const data = await response.json();
      
      if (data.success) {
        setStats({
          totalOverdue: data.totalOverdue,
          byPriority: data.byPriority,
          byOfficer: data.byOfficer,
        });
        toast({
          title: 'Statistics Updated',
          description: `Found ${data.totalOverdue} overdue complaint(s)`,
        });
      }
    } catch (error) {
      console.error('Error checking stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch overdue statistics',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const runEscalation = async () => {
    setIsEscalating(true);
    try {
      const response = await fetch('/api/escalate-overdue');
      const data = await response.json();
      
      if (data.success) {
        setLastResult({
          checked: data.checked,
          escalated: data.escalated,
          details: data.details || [],
        });
        
        toast({
          title: 'Escalation Complete',
          description: `Checked ${data.checked} complaints, escalated ${data.escalated}`,
        });
        
        // Refresh stats
        await checkOverdueStats();
      }
    } catch (error) {
      console.error('Error running escalation:', error);
      toast({
        title: 'Error',
        description: 'Failed to run escalation check',
        variant: 'destructive',
      });
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auto-Escalation Monitor</h2>
          <p className="text-sm text-gray-600">
            Automatically escalate overdue complaints to admin attention
          </p>
        </div>
        <Button onClick={checkOverdueStats} disabled={isChecking} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* SLA Rules Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">SLA Timeframes</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700">High Priority</Badge>
                  <span className="text-blue-900">1 Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-700">Medium Priority</Badge>
                  <span className="text-blue-900">3 Days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">Low Priority</Badge>
                  <span className="text-blue-900">7 Days</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{stats.totalOverdue}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.byPriority.high}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Medium Priority</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.byPriority.medium}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Low Priority</p>
                <p className="text-2xl font-bold text-green-600">{stats.byPriority.low}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue by Officer */}
      {stats && Object.keys(stats.byOfficer).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Overdue by Officer
            </CardTitle>
            <CardDescription>Officers with pending overdue complaints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byOfficer)
                .sort(([, a], [, b]) => b - a)
                .map(([officer, count]) => (
                  <div key={officer} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium text-gray-900">{officer}</span>
                    <Badge variant="destructive">{count} overdue</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escalation Action */}
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Run Escalation Check
          </CardTitle>
          <CardDescription>
            This will automatically escalate all overdue complaints to admin and change their status to "Escalated"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-900">
                <p className="font-semibold mb-1">What happens when you click "Run Escalation":</p>
                <ul className="list-disc list-inside space-y-1 text-orange-800">
                  <li>All complaints past their SLA deadline will be checked</li>
                  <li>Status will change from "In Progress" → "Escalated"</li>
                  <li>Officers will still see the complaint but admin gets priority</li>
                  <li>A system note will be added to the complaint history</li>
                </ul>
              </div>
            </div>
          </div>

          <Button 
            onClick={runEscalation} 
            disabled={isEscalating}
            className="w-full"
            size="lg"
          >
            {isEscalating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Running Escalation Check...
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5 mr-2" />
                Run Escalation Check Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Last Escalation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <p className="text-sm text-gray-500">Complaints Checked</p>
                  <p className="text-2xl font-bold text-gray-900">{lastResult.checked}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Escalated</p>
                  <p className="text-2xl font-bold text-green-600">{lastResult.escalated}</p>
                </div>
              </div>

              {lastResult.details.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Escalated Complaints:</h4>
                  <div className="space-y-2">
                    {lastResult.details.map((detail, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded border border-orange-200">
                        <div>
                          <p className="font-medium text-gray-900">{detail.trackingId}</p>
                          <p className="text-sm text-gray-600">{detail.title}</p>
                          <p className="text-xs text-gray-500">Officer: {detail.assignedOfficer}</p>
                        </div>
                        <Badge variant="destructive">{detail.daysOverdue} days overdue</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lastResult.escalated === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>All complaints are within SLA timeframes! 🎉</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">Automation Setup (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold">To run this automatically every hour:</p>
            <div className="bg-white p-3 rounded border font-mono text-xs">
              <p># Setup a cron job or use a service like:</p>
              <p className="text-blue-600">https://cron-job.org</p>
              <p className="mt-1">URL: {typeof window !== 'undefined' ? window.location.origin : ''}/api/escalate-overdue</p>
              <p>Schedule: Every 1 hour</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
