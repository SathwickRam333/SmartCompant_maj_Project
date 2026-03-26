import sgMail from '@sendgrid/mail';
import { Complaint, ComplaintStatus, STATUS_LABELS } from '@/lib/types';
import { formatDate } from '@/lib/utils';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'grievance@telangana.gov.in';
const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Generate email template for complaint confirmation
function getComplaintConfirmationTemplate(complaint: Complaint): EmailTemplate {
  const subject = `Complaint Registered - ${complaint.trackingId} | Telangana Grievance Portal`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a472a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .tracking-id { font-size: 24px; color: #1a472a; font-weight: bold; margin: 20px 0; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #d4a012; color: #1a472a; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Government of Telangana</h1>
          <p>AI Powered Smart Grievance Redressal System</p>
        </div>
        <div class="content">
          <p>Dear ${complaint.citizenName},</p>
          <p>Your complaint has been successfully registered. Please save the tracking ID for future reference.</p>
          
          <div class="tracking-id">
            Tracking ID: ${complaint.trackingId}
          </div>
          
          <div class="details">
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Department:</strong> ${complaint.department}</p>
            <p><strong>Category:</strong> ${complaint.category}</p>
            <p><strong>Priority:</strong> ${complaint.priority.toUpperCase()}</p>
            <p><strong>Expected Resolution:</strong> ${formatDate(complaint.slaDeadline)}</p>
            <p><strong>Submitted On:</strong> ${formatDate(complaint.createdAt)}</p>
          </div>
          
          <p style="text-align: center; margin: 20px 0;">
            <a href="${PORTAL_URL}/track?id=${complaint.trackingId}" class="btn">Track Your Complaint</a>
          </p>
          
          <p>You will receive email notifications when there are updates to your complaint.</p>
        </div>
        <div class="footer">
          <p>Chief Minister's Office<br>Government of Telangana<br>Near Tank Bund, Hyderabad</p>
          <p>Helpline: 1800-599-7979 | Email: grievance@telangana.gov.in</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Government of Telangana - AI Powered Smart Grievance Redressal System

Dear ${complaint.citizenName},

Your complaint has been successfully registered.

Tracking ID: ${complaint.trackingId}

Title: ${complaint.title}
Department: ${complaint.department}
Category: ${complaint.category}
Priority: ${complaint.priority.toUpperCase()}
Expected Resolution: ${formatDate(complaint.slaDeadline)}
Submitted On: ${formatDate(complaint.createdAt)}

Track your complaint at: ${PORTAL_URL}/track?id=${complaint.trackingId}

You will receive email notifications when there are updates to your complaint.

---
Chief Minister's Office
Government of Telangana
Near Tank Bund, Hyderabad
Helpline: 1800-599-7979
  `;

  return { subject, html, text };
}

// Generate email template for status update
function getStatusUpdateTemplate(
  complaint: Complaint,
  newStatus: ComplaintStatus,
  comment: string
): EmailTemplate {
  const statusLabel = STATUS_LABELS[newStatus].en;
  const subject = `Complaint Update - ${complaint.trackingId} | Status: ${statusLabel}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a472a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .status { font-size: 20px; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 15px 0; }
        .status-resolved { background: #d4edda; color: #155724; }
        .status-progress { background: #fff3cd; color: #856404; }
        .status-escalated { background: #f8d7da; color: #721c24; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .btn { display: inline-block; background: #d4a012; color: #1a472a; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Government of Telangana</h1>
          <p>Complaint Status Update</p>
        </div>
        <div class="content">
          <p>Dear ${complaint.citizenName},</p>
          <p>There's an update on your complaint (${complaint.trackingId}).</p>
          
          <div class="status status-${newStatus === 'resolved' ? 'resolved' : newStatus === 'escalated' ? 'escalated' : 'progress'}">
            Status: ${statusLabel}
          </div>
          
          <div class="details">
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Update:</strong></p>
            <p>${comment}</p>
          </div>
          
          ${newStatus === 'resolved' ? `
          <p>If you're satisfied with the resolution, please provide your feedback.</p>
          ` : ''}
          
          <p style="text-align: center; margin: 20px 0;">
            <a href="${PORTAL_URL}/track?id=${complaint.trackingId}" class="btn">View Full Details</a>
          </p>
        </div>
        <div class="footer">
          <p>Chief Minister's Office<br>Government of Telangana</p>
          <p>Helpline: 1800-599-7979</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Government of Telangana - Complaint Status Update

Dear ${complaint.citizenName},

There's an update on your complaint (${complaint.trackingId}).

Status: ${statusLabel}

Title: ${complaint.title}

Update: ${comment}

View full details at: ${PORTAL_URL}/track?id=${complaint.trackingId}

---
Chief Minister's Office
Government of Telangana
Helpline: 1800-599-7979
  `;

  return { subject, html, text };
}

// Generate escalation email template
function getEscalationTemplate(complaint: Complaint): EmailTemplate {
  const subject = `[URGENT] Complaint Escalated - ${complaint.trackingId} | SLA Breach`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .warning { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ COMPLAINT ESCALATED</h1>
          <p>Immediate Action Required</p>
        </div>
        <div class="content">
          <div class="warning">
            <strong>Alert:</strong> This complaint has exceeded its SLA deadline and has been automatically escalated (Level ${complaint.escalationLevel}).
          </div>
          
          <div class="details">
            <p><strong>Tracking ID:</strong> ${complaint.trackingId}</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Department:</strong> ${complaint.department}</p>
            <p><strong>Priority:</strong> ${complaint.priority.toUpperCase()}</p>
            <p><strong>Original Deadline:</strong> ${formatDate(complaint.slaDeadline)}</p>
            <p><strong>Days Overdue:</strong> ${Math.ceil((Date.now() - new Date(complaint.slaDeadline).getTime()) / (1000 * 60 * 60 * 24))}</p>
            <p><strong>Citizen:</strong> ${complaint.citizenName} (${complaint.citizenEmail})</p>
          </div>
          
          <p><strong>Please take immediate action to resolve this complaint.</strong></p>
        </div>
        <div class="footer">
          <p>AI Powered Smart Grievance Redressal System<br>Government of Telangana</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
⚠️ COMPLAINT ESCALATED - Immediate Action Required

Tracking ID: ${complaint.trackingId}

This complaint has exceeded its SLA deadline and has been automatically escalated (Level ${complaint.escalationLevel}).

Title: ${complaint.title}
Department: ${complaint.department}
Priority: ${complaint.priority.toUpperCase()}
Original Deadline: ${formatDate(complaint.slaDeadline)}
Citizen: ${complaint.citizenName} (${complaint.citizenEmail})

Please take immediate action to resolve this complaint.

---
AI Powered Smart Grievance Redressal System
Government of Telangana
  `;

  return { subject, html, text };
}

// Send complaint confirmation email
export async function sendComplaintConfirmation(complaint: Complaint): Promise<boolean> {
  try {
    const template = getComplaintConfirmationTemplate(complaint);
    
    await sgMail.send({
      to: complaint.citizenEmail,
      from: FROM_EMAIL,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
}

// Send status update email
export async function sendStatusUpdate(
  complaint: Complaint,
  newStatus: ComplaintStatus,
  comment: string
): Promise<boolean> {
  try {
    const template = getStatusUpdateTemplate(complaint, newStatus, comment);
    
    await sgMail.send({
      to: complaint.citizenEmail,
      from: FROM_EMAIL,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending status update email:', error);
    return false;
  }
}

// Send escalation notification
export async function sendEscalationNotification(
  complaint: Complaint,
  officerEmail: string
): Promise<boolean> {
  try {
    const template = getEscalationTemplate(complaint);
    
    await sgMail.send({
      to: officerEmail,
      from: FROM_EMAIL,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending escalation email:', error);
    return false;
  }
}

// Send officer assignment notification
export async function sendOfficerAssignment(
  officerEmail: string,
  officerName: string,
  complaint: Complaint
): Promise<boolean> {
  try {
    const subject = `New Complaint Assigned - ${complaint.trackingId}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Dear ${officerName},</p>
        <p>A new complaint has been assigned to you.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Tracking ID:</strong> ${complaint.trackingId}</p>
          <p><strong>Title:</strong> ${complaint.title}</p>
          <p><strong>Priority:</strong> ${complaint.priority.toUpperCase()}</p>
          <p><strong>Deadline:</strong> ${formatDate(complaint.slaDeadline)}</p>
        </div>
        <p>Please log in to the portal to view and process this complaint.</p>
      </div>
    `;

    await sgMail.send({
      to: officerEmail,
      from: FROM_EMAIL,
      subject,
      html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending officer assignment email:', error);
    return false;
  }
}
