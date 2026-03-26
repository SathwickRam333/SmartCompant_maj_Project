import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import OpenAI from 'openai';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid
const sendgridApiKey = functions.config().sendgrid?.api_key;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

// Initialize OpenAI
const openaiApiKey = functions.config().openai?.api_key;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const db = admin.firestore();

// Types
interface Complaint {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  status: string;
  priority: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    district: string;
    pincode?: string;
  };
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  citizenPhone?: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  assignedOfficer?: {
    id: string;
    name: string;
    email: string;
  };
}

// SLA Rules (in days)
const SLA_RULES = {
  high: 1,
  medium: 3,
  low: 7,
};

// =====================================================
// TRIGGER: On Complaint Creation
// =====================================================
export const onComplaintCreated = functions.firestore
  .document('complaints/{complaintId}')
  .onCreate(async (snapshot, context) => {
    const complaint = snapshot.data() as Complaint;
    const complaintId = context.params.complaintId;

    try {
      // 1. AI Classification (if not already classified)
      if (!complaint.department || complaint.department === '') {
        const classification = await classifyComplaint(complaint.title, complaint.description);
        
        await snapshot.ref.update({
          department: classification.department,
          priority: classification.priority,
          aiClassification: {
            department: classification.department,
            priority: classification.priority,
            confidence: classification.confidence,
            keywords: classification.keywords,
            classifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          slaDeadline: calculateSLADeadline(classification.priority),
        });

        // Log AI classification
        await db.collection('ai_classifications').add({
          complaintId,
          ...classification,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 2. Auto-assign to an available officer
      const officerAssigned = await autoAssignOfficer(complaintId, complaint.department);

      // 3. Send confirmation email to citizen
      await sendConfirmationEmail(complaint);

      // 4. Update statistics
      await updateStatistics('new_complaint', complaint.department);

      // 5. Create notification for assigned officer
      if (officerAssigned) {
        await createNotification(
          officerAssigned.id,
          'new_assignment',
          `New complaint assigned: ${complaint.trackingId}`,
          complaintId
        );
      }

      console.log(`Complaint ${complaintId} processed successfully`);
    } catch (error) {
      console.error(`Error processing complaint ${complaintId}:`, error);
    }
  });

// =====================================================
// TRIGGER: On Complaint Status Update
// =====================================================
export const onComplaintUpdated = functions.firestore
  .document('complaints/{complaintId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data() as Complaint;
    const afterData = change.after.data() as Complaint;
    const complaintId = context.params.complaintId;

    // Check if status changed
    if (beforeData.status !== afterData.status) {
      try {
        // Send status update email
        await sendStatusUpdateEmail(afterData, beforeData.status, afterData.status);

        // Update statistics
        await updateStatistics('status_change', afterData.department, {
          from: beforeData.status,
          to: afterData.status,
        });

        // Add to complaint history
        await change.after.ref.collection('updates').add({
          previousStatus: beforeData.status,
          newStatus: afterData.status,
          message: `Status changed from ${beforeData.status} to ${afterData.status}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: afterData.assignedOfficer?.name || 'System',
        });

        // Create notification for citizen
        await createNotification(
          afterData.citizenId,
          'status_update',
          `Your complaint ${afterData.trackingId} status updated to: ${afterData.status}`,
          complaintId
        );

        console.log(`Status update processed for ${complaintId}`);
      } catch (error) {
        console.error(`Error processing status update for ${complaintId}:`, error);
      }
    }
  });

// =====================================================
// SCHEDULED: Check for SLA Breaches
// =====================================================
export const checkSLABreaches = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    
    try {
      // Find complaints that have breached SLA
      const overdueComplaints = await db.collection('complaints')
        .where('status', 'in', ['submitted', 'assigned', 'in-progress'])
        .where('slaDeadline', '<', now.toDate().toISOString())
        .where('isEscalated', '==', false)
        .get();

      const batch = db.batch();
      const escalationPromises: Promise<any>[] = [];

      overdueComplaints.docs.forEach((doc) => {
        const complaint = doc.data() as Complaint;

        // Mark as escalated
        batch.update(doc.ref, {
          isEscalated: true,
          escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send escalation email
        escalationPromises.push(sendEscalationEmail(complaint));

        // Notify admin
        escalationPromises.push(
          createNotification(
            'admin',
            'sla_breach',
            `SLA breached for complaint: ${complaint.trackingId}`,
            doc.id
          )
        );
      });

      await batch.commit();
      await Promise.all(escalationPromises);

      console.log(`Processed ${overdueComplaints.size} SLA breaches`);
    } catch (error) {
      console.error('Error checking SLA breaches:', error);
    }
  });

// =====================================================
// SCHEDULED: Update Daily Statistics
// =====================================================
export const updateDailyStats = functions.pubsub
  .schedule('every day 00:00')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const allComplaints = await db.collection('complaints').get();
      
      let stats = {
        totalComplaints: 0,
        byStatus: {} as Record<string, number>,
        byDepartment: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byDistrict: {} as Record<string, number>,
        resolvedToday: 0,
        newToday: 0,
        avgResolutionTime: 0,
      };

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      allComplaints.docs.forEach((doc) => {
        const data = doc.data() as Complaint;
        stats.totalComplaints++;

        // By status
        stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;
        
        // By department
        stats.byDepartment[data.department] = (stats.byDepartment[data.department] || 0) + 1;
        
        // By priority
        stats.byPriority[data.priority] = (stats.byPriority[data.priority] || 0) + 1;
        
        // By district
        stats.byDistrict[data.location.district] = (stats.byDistrict[data.location.district] || 0) + 1;

        // Check if resolved today
        if (data.status === 'resolved' && (data as any).resolvedAt) {
          const resolvedDate = new Date((data as any).resolvedAt).toISOString().split('T')[0];
          if (resolvedDate === today) {
            stats.resolvedToday++;
          }
          
          // Calculate resolution time
          const created = new Date(data.createdAt).getTime();
          const resolved = new Date((data as any).resolvedAt).getTime();
          totalResolutionTime += (resolved - created) / (1000 * 60 * 60 * 24); // in days
          resolvedCount++;
        }

        // Check if new today
        const createdDate = new Date(data.createdAt).toISOString().split('T')[0];
        if (createdDate === today) {
          stats.newToday++;
        }
      });

      stats.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

      // Save daily stats
      await db.collection('statistics').doc(today).set({
        ...stats,
        date: today,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update current stats
      await db.collection('statistics').doc('current').set({
        ...stats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Daily stats updated for ${today}`);
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  });

// =====================================================
// HTTP: Get Dashboard Stats
// =====================================================
export const getDashboardStats = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const statsDoc = await db.collection('statistics').doc('current').get();
    
    if (!statsDoc.exists) {
      res.json({ error: 'Stats not available' });
      return;
    }

    res.json(statsDoc.data());
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// HTTP: AI Chatbot Endpoint
// =====================================================
export const chatbot = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, history } = req.body;

    if (!openai) {
      res.status(500).json({ error: 'OpenAI not configured' });
      return;
    }

    const systemPrompt = `You are Clod.AI, a helpful AI assistant for the Telangana Government Grievance Redressal System. 
    Your role is to:
    1. Help citizens file complaints
    2. Explain how to track complaint status
    3. Provide information about government departments
    4. Answer questions about the grievance resolution process
    5. Guide users through the portal
    
    Be polite, professional, and helpful. If you don't know something, admit it and suggest contacting the helpline.
    Keep responses concise but informative.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history || []),
      { role: 'user' as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';

    res.json({ success: true, message: reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function classifyComplaint(title: string, description: string) {
  if (!openai) {
    // Fallback classification
    return {
      department: 'General Administration',
      priority: 'medium',
      confidence: 0.5,
      keywords: [],
    };
  }

  const prompt = `Classify this complaint for the Telangana Government:
  
Title: ${title}
Description: ${description}

Provide:
1. Most appropriate department from: Roads & Buildings, Municipal Water Supply, Electricity, Sanitation, Revenue, Police, Health, Education, Agriculture, Transport, Municipal Administration, General Administration
2. Priority level: high (emergency/safety), medium (standard), or low (minor)
3. Confidence score (0.0 to 1.0)
4. Key words from the complaint

Respond in JSON format:
{
  "department": "...",
  "priority": "...",
  "confidence": 0.0,
  "keywords": ["...", "..."]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '';
    return JSON.parse(response);
  } catch (error) {
    console.error('Classification error:', error);
    return {
      department: 'General Administration',
      priority: 'medium',
      confidence: 0.5,
      keywords: [],
    };
  }
}

function calculateSLADeadline(priority: string): string {
  const days = SLA_RULES[priority as keyof typeof SLA_RULES] || 7;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  return deadline.toISOString();
}

async function autoAssignOfficer(complaintId: string, department: string) {
  try {
    // Find an available officer in the department
    const officers = await db.collection('users')
      .where('role', '==', 'officer')
      .where('department', '==', department)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (officers.empty) {
      console.log(`No officers available for department: ${department}`);
      return null;
    }

    const officer = officers.docs[0];
    const officerData = officer.data();

    // Update complaint with assigned officer
    await db.collection('complaints').doc(complaintId).update({
      assignedOfficer: {
        id: officer.id,
        name: officerData.displayName,
        email: officerData.email,
      },
      status: 'assigned',
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: officer.id, ...officerData };
  } catch (error) {
    console.error('Error auto-assigning officer:', error);
    return null;
  }
}

async function sendConfirmationEmail(complaint: Complaint) {
  if (!sendgridApiKey) return;

  const msg = {
    to: complaint.citizenEmail,
    from: 'noreply@telangana.gov.in',
    subject: `Complaint Registered - ${complaint.trackingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a472a; color: white; padding: 20px; text-align: center;">
          <h1>Telangana Grievance Portal</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Your Complaint Has Been Registered</h2>
          <p>Dear ${complaint.citizenName},</p>
          <p>Your complaint has been successfully registered with the following details:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Tracking ID:</strong> ${complaint.trackingId}</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Department:</strong> ${complaint.department}</p>
            <p><strong>Status:</strong> Submitted</p>
          </div>
          
          <p>You can track your complaint status at any time using your tracking ID.</p>
          
          <p>Thank you for using the Telangana Grievance Portal.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

async function sendStatusUpdateEmail(complaint: Complaint, oldStatus: string, newStatus: string) {
  if (!sendgridApiKey) return;

  const msg = {
    to: complaint.citizenEmail,
    from: 'noreply@telangana.gov.in',
    subject: `Complaint Update - ${complaint.trackingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a472a; color: white; padding: 20px; text-align: center;">
          <h1>Telangana Grievance Portal</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Complaint Status Update</h2>
          <p>Dear ${complaint.citizenName},</p>
          <p>Your complaint status has been updated:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Tracking ID:</strong> ${complaint.trackingId}</p>
            <p><strong>Previous Status:</strong> ${oldStatus}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
          </div>
          
          <p>Thank you for your patience.</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending status update email:', error);
  }
}

async function sendEscalationEmail(complaint: Complaint) {
  if (!sendgridApiKey) return;

  // Send to admin/supervisor
  const admins = await db.collection('users')
    .where('role', '==', 'admin')
    .get();

  const adminEmails = admins.docs.map(doc => doc.data().email);

  const msg = {
    to: adminEmails,
    from: 'noreply@telangana.gov.in',
    subject: `⚠️ SLA Breach Alert - ${complaint.trackingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>⚠️ SLA Breach Alert</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Complaint Has Exceeded SLA Deadline</h2>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Tracking ID:</strong> ${complaint.trackingId}</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Department:</strong> ${complaint.department}</p>
            <p><strong>SLA Deadline:</strong> ${complaint.slaDeadline}</p>
            <p><strong>Current Status:</strong> ${complaint.status}</p>
          </div>
          
          <p>Immediate action is required to address this complaint.</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending escalation email:', error);
  }
}

async function updateStatistics(event: string, department: string, data?: any) {
  try {
    const statsRef = db.collection('statistics').doc('current');
    const statsDoc = await statsRef.get();
    
    const currentStats = statsDoc.exists ? statsDoc.data() : {};
    
    if (event === 'new_complaint') {
      await statsRef.set({
        ...currentStats,
        totalComplaints: (currentStats?.totalComplaints || 0) + 1,
        [`byDepartment.${department}`]: (currentStats?.byDepartment?.[department] || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } else if (event === 'status_change' && data) {
      await statsRef.set({
        ...currentStats,
        [`byStatus.${data.from}`]: Math.max(0, (currentStats?.byStatus?.[data.from] || 1) - 1),
        [`byStatus.${data.to}`]: (currentStats?.byStatus?.[data.to] || 0) + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

async function createNotification(userId: string, type: string, message: string, complaintId: string) {
  try {
    await db.collection('notifications').add({
      userId,
      type,
      message,
      complaintId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
