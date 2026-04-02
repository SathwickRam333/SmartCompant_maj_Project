import { NextRequest, NextResponse } from 'next/server';
import { checkAndEscalateOverdueComplaints, getOverdueStatistics } from '@/services/escalation.service';

/**
 * API Route to check and escalate overdue complaints
 * 
 * Usage:
 * - Manual: GET /api/escalate-overdue
 * - Cron: Setup a cron job to call this endpoint every hour/day
 * 
 * Query params:
 * - check=true : Only check statistics, don't escalate
 * - key=your_secret_key : Optional security key (set in env)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkOnly = searchParams.get('check') === 'true';
    const apiKey = searchParams.get('key');
    
    // Optional: Add API key authentication for production
    const expectedKey = process.env.ESCALATION_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (checkOnly) {
      // Only return statistics without escalating
      const stats = await getOverdueStatistics();
      return NextResponse.json({
        success: true,
        mode: 'check_only',
        ...stats,
      });
    }
    
    // Run the escalation check
    const result = await checkAndEscalateOverdueComplaints();
    
    return NextResponse.json({
      success: true,
      mode: 'escalate',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('Escalation API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual escalation
 * Body: { complaintId: string, reason: string, adminName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { complaintId, reason, adminName } = body;
    
    if (!complaintId || !reason || !adminName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const { manuallyEscalateComplaint } = await import('@/services/escalation.service');
    const result = await manuallyEscalateComplaint(complaintId, reason, adminName);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Complaint escalated successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Manual escalation API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
