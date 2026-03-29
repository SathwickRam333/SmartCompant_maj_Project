'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface MigrationResult {
  success: boolean;
  message: string;
  total: number;
  updated: number;
  unchanged: number;
  priorityChanges: Record<string, number>;
  details: Array<{
    trackingId: string;
    oldPriority: string;
    newPriority: string;
    title: string;
  }>;
  totalChanges: number;
  error?: string;
}

export default function MigrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handleMigrate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/migrate/priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data: MigrationResult = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
      toast({
        title: 'Migration completed!',
        description: `${data.updated} complaints updated with new priorities`,
        variant: 'success',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Migration failed',
        description: errorMsg,
        variant: 'destructive',
      });
      setResult({
        success: false,
        message: errorMsg,
        total: 0,
        updated: 0,
        unchanged: 0,
        priorityChanges: {},
        details: [],
        totalChanges: 0,
        error: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-transparent py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Priority Migration Tool
          </h1>
          <p className="text-gray-600">
            Re-evaluate and update complaint priorities based on the improved AI classification
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Migrate Complaint Priorities</CardTitle>
            <CardDescription>
              This will analyze all existing complaints and update their priority levels based on keyword analysis.
              The process is safe and all changes are logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>What this does:</strong> Analyzes complaint titles and descriptions to detect priority keywords
                (emergency, urgent, critical, danger, etc.) and updates priorities accordingly.
              </p>
            </div>

            <Button
              onClick={handleMigrate}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Running Migration...' : 'Start Migration'}
            </Button>

            {result && (
              <div className="space-y-4 mt-8 p-6 bg-gray-50 rounded-lg border">
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.message}
                    </h3>
                  </div>
                </div>

                {result.success && result.total > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{result.total}</div>
                        <div className="text-sm text-gray-600">Total Complaints</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{result.updated}</div>
                        <div className="text-sm text-gray-600">Updated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-500">{result.unchanged}</div>
                        <div className="text-sm text-gray-600">Unchanged</div>
                      </div>
                    </div>

                    {Object.keys(result.priorityChanges).length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-semibold mb-3 text-sm">Priority Changes:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(result.priorityChanges)
                            .filter(([, count]) => count > 0)
                            .map(([change, count]) => (
                              <div key={change} className="text-sm bg-white p-2 rounded border">
                                <span className="font-mono text-xs">{change}</span>: {count}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {result.details.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-semibold mb-3 text-sm">Sample Changes (first 10):</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {result.details.map((detail, idx) => (
                            <div key={idx} className="text-xs bg-white p-2 rounded border">
                              <div className="font-mono text-gray-600">{detail.trackingId}</div>
                              <div className="truncate text-gray-700">{detail.title}</div>
                              <div className="mt-1">
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                  {detail.oldPriority}
                                </span>
                                {' → '}
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                  {detail.newPriority}
                                </span>
                              </div>
                            </div>
                          ))}
                          {result.totalChanges > result.details.length && (
                            <div className="text-xs text-gray-500 italic">
                              ... and {result.totalChanges - result.details.length} more changes
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-sm text-gray-600">
          <p>
            Access this page during development at: <code className="bg-gray-100 px-2 py-1 rounded">/admin/migrate</code>
          </p>
        </div>
      </div>
    </div>
  );
}
