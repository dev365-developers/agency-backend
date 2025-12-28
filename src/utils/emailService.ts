// utils/emailService.ts
import { Resend } from 'resend';
import { IWebsiteRequest } from '../models/WebsiteRequest';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to truncate description
const truncateDescription = (text: string, maxLength: number = 200): { text: string; isTruncated: boolean } => {
  if (text.length <= maxLength) {
    return { text, isTruncated: false };
  }
  
  // Try to cut at a sentence or word boundary
  let truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastPeriod > maxLength * 0.7) {
    truncated = text.substring(0, lastPeriod + 1);
  } else if (lastSpace > maxLength * 0.7) {
    truncated = text.substring(0, lastSpace) + '...';
  } else {
    truncated = truncated + '...';
  }
  
  return { text: truncated, isTruncated: true };
};

// Shared responsive email styles
const getEmailStyles = (): string => {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #1f2937;
      background-color: #f3f4f6;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper { 
      width: 100%; 
      background-color: #f3f4f6; 
      padding: 20px 0; 
    }
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .header { 
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff; 
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 { 
      font-size: 24px; 
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header p { 
      font-size: 14px; 
      opacity: 0.9;
    }
    .content { 
      padding: 32px 24px;
    }
    .greeting { 
      font-size: 16px; 
      margin-bottom: 16px;
      color: #1f2937;
    }
    .intro-text { 
      font-size: 15px; 
      color: #4b5563;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .section { 
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .section-title { 
      font-size: 14px;
      font-weight: 600;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .detail-row { 
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { 
      font-weight: 600;
      color: #374151;
      min-width: 140px;
      font-size: 14px;
    }
    .detail-value { 
      color: #6b7280;
      flex: 1;
      font-size: 14px;
    }
    .description-box {
      background-color: #ffffff;
      border-left: 3px solid #6366f1;
      padding: 16px;
      margin: 12px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #4b5563;
      max-height: 120px;
      overflow: hidden;
      position: relative;
    }
    .description-box.truncated:after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to bottom, transparent, #ffffff);
    }
    .description-text {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.6;
    }
    .list-items {
      list-style: none;
      padding: 0;
      margin: 8px 0;
    }
    .list-items li {
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
      font-size: 14px;
      color: #4b5563;
    }
    .list-items li:before {
      content: "•";
      position: absolute;
      left: 6px;
      color: #6366f1;
      font-weight: bold;
    }
    .alert-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert-box strong {
      display: block;
      color: #92400e;
      margin-bottom: 6px;
      font-size: 14px;
    }
    .alert-box p {
      color: #78350f;
      font-size: 13px;
      line-height: 1.5;
    }
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      display: block;
      color: #1e40af;
      margin-bottom: 6px;
      font-size: 14px;
    }
    .info-box p {
      color: #1e3a8a;
      font-size: 13px;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    .footer { 
      background-color: #f9fafb;
      text-align: center; 
      padding: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .footer p { 
      font-size: 12px; 
      color: #9ca3af;
      margin: 6px 0;
    }
    a { 
      color: #6366f1; 
      text-decoration: none; 
    }
    a:hover { 
      text-decoration: underline; 
    }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 0; }
      .email-container { border-radius: 0; }
      .header { padding: 24px 20px; }
      .header h1 { font-size: 20px; }
      .content { padding: 24px 20px; }
      .section { padding: 16px; }
      .detail-row { 
        flex-direction: column;
        padding: 12px 0;
      }
      .detail-label { 
        min-width: auto;
        margin-bottom: 4px;
        font-size: 13px;
      }
      .detail-value { font-size: 13px; }
      .alert-box, .info-box { padding: 12px; }
    }
  `;
};

export const sendRequestNotificationEmail = async (
  request: IWebsiteRequest
): Promise<void> => {
  try {
    const { text: descriptionText, isTruncated: isDescTruncated } = truncateDescription(request.description);
    
    const featuresHtml = request.features && request.features.length > 0
      ? `
        <div style="margin: 12px 0;">
          <div class="detail-label">Features</div>
          <ul class="list-items">
            ${request.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
      `
      : '';

    const referenceLinksHtml = request.referenceLinks && request.referenceLinks.length > 0
      ? `
        <div style="margin: 12px 0;">
          <div class="detail-label">Reference Links</div>
          <ul class="list-items">
            ${request.referenceLinks.map(link => `<li><a href="${link}">${link}</a></li>`).join('')}
          </ul>
        </div>
      `
      : '';

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: request.contactEmail,
      subject: 'Request Received - We\'ll Be In Touch Soon',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Request Confirmation</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header">
                <h1>Request Received</h1>
                <p>Thank you for reaching out to us</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${request.contactName}</strong>,
                </div>
                
                <p class="intro-text">
                  We've successfully received your website request and our team will review it shortly. 
                  You'll hear from us within 1-2 business days.
                </p>

                <div class="section">
                  <div class="section-title">Project Details</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Project Name</div>
                    <div class="detail-value"><strong>${request.projectName}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Type</div>
                    <div class="detail-value">${request.projectType}</div>
                  </div>
                  
                  ${request.pagesRequired ? `
                  <div class="detail-row">
                    <div class="detail-label">Pages</div>
                    <div class="detail-value">${request.pagesRequired}</div>
                  </div>
                  ` : ''}
                  
                  ${request.selectedPlan ? `
                  <div class="detail-row">
                    <div class="detail-label">Plan</div>
                    <div class="detail-value">${request.selectedPlan}</div>
                  </div>
                  ` : ''}
                  
                  <div class="detail-row">
                    <div class="detail-label">Status</div>
                    <div class="detail-value"><span class="badge">${request.status}</span></div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Description</div>
                  <div class="description-box${isDescTruncated ? ' truncated' : ''}">
                    <div class="description-text">${descriptionText}</div>
                  </div>
                  ${isDescTruncated ? '<p style="font-size: 12px; color: #9ca3af; font-style: italic; margin-top: 8px;">Full description available in your dashboard</p>' : ''}
                  
                  ${featuresHtml}
                  ${referenceLinksHtml}
                  
                  ${request.recommendedTemplate ? `
                  <div style="margin: 12px 0;">
                    <div class="detail-label">Recommended Template</div>
                    <div class="detail-value">${request.recommendedTemplate}</div>
                  </div>
                  ` : ''}
                </div>

                <div class="alert-box">
                  <strong>Editing Window</strong>
                  <p>You can edit this request until ${new Date(request.editableUntil).toLocaleString()}. After that, it will be locked for review.</p>
                </div>

                <div class="info-box">
                  <strong>Next Steps</strong>
                  <p>Our team will contact you at <strong>${request.contactPhone}</strong> to discuss your project requirements in detail.</p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  If you have any questions in the meantime, feel free to reply to this email.
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>Submitted on ${new Date(request.createdAt).toLocaleString()}</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ User notification email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send user notification email:', error);
    throw error;
  }
};

export const sendAdminNotificationEmail = async (
  request: IWebsiteRequest
): Promise<void> => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL;

    if (!adminEmail) {
      console.warn('⚠️ No admin email configured, skipping admin notification');
      return;
    }

    const { text: descriptionText, isTruncated: isDescTruncated } = truncateDescription(request.description, 250);

    const featuresHtml = request.features && request.features.length > 0
      ? `
        <div style="margin: 12px 0;">
          <div class="detail-label">Features Requested</div>
          <ul class="list-items">
            ${request.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
      `
      : '<div style="margin: 12px 0; color: #9ca3af; font-size: 13px; font-style: italic;">No features specified</div>';

    const referenceLinksHtml = request.referenceLinks && request.referenceLinks.length > 0
      ? `
        <div style="margin: 12px 0;">
          <div class="detail-label">Reference Links</div>
          <ul class="list-items">
            ${request.referenceLinks.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('')}
          </ul>
        </div>
      `
      : '<div style="margin: 12px 0; color: #9ca3af; font-size: 13px; font-style: italic;">No reference links provided</div>';

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: adminEmail,
      subject: `New Request: ${request.projectName}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>New Website Request</title>
          <style>
            ${getEmailStyles()}
            .admin-header { 
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            .admin-section-title { 
              color: #059669;
            }
            .badge-new {
              background-color: #d1fae5;
              color: #065f46;
            }
            .code-text {
              background-color: #f3f4f6;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: #4b5563;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header admin-header">
                <h1>New Website Request</h1>
                <p>Action required: Review and respond</p>
              </div>
              
              <div class="content">
                <p class="intro-text">
                  A new client has submitted a website request. Please review the details below and 
                  contact them within 1-2 business days.
                </p>

                <div class="section">
                  <div class="section-title admin-section-title">Project Information</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Project Name</div>
                    <div class="detail-value"><strong>${request.projectName}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Type</div>
                    <div class="detail-value">${request.projectType}</div>
                  </div>
                  
                  ${request.pagesRequired ? `
                  <div class="detail-row">
                    <div class="detail-label">Pages Required</div>
                    <div class="detail-value">${request.pagesRequired}</div>
                  </div>
                  ` : '<div style="margin: 12px 0; color: #9ca3af; font-size: 13px; font-style: italic;">Pages not specified</div>'}
                  
                  ${request.selectedPlan ? `
                  <div class="detail-row">
                    <div class="detail-label">Selected Plan</div>
                    <div class="detail-value"><span class="badge badge-new">${request.selectedPlan}</span></div>
                  </div>
                  ` : '<div style="margin: 12px 0; color: #9ca3af; font-size: 13px; font-style: italic;">Plan not selected</div>'}
                </div>

                <div class="section">
                  <div class="section-title admin-section-title">Project Description</div>
                  <div class="description-box${isDescTruncated ? ' truncated' : ''}">
                    <div class="description-text">${descriptionText}</div>
                  </div>
                  ${isDescTruncated ? '<p style="font-size: 12px; color: #9ca3af; font-style: italic; margin-top: 8px;">Description truncated - view full text in admin dashboard</p>' : ''}
                  
                  ${featuresHtml}
                  ${referenceLinksHtml}
                  
                  ${request.recommendedTemplate ? `
                  <div style="margin: 12px 0;">
                    <div class="detail-label">Recommended Template</div>
                    <div class="detail-value">${request.recommendedTemplate}</div>
                  </div>
                  ` : '<div style="margin: 12px 0; color: #9ca3af; font-size: 13px; font-style: italic;">No template recommendation</div>'}
                </div>

                <div class="section">
                  <div class="section-title admin-section-title">Contact Information</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Name</div>
                    <div class="detail-value"><strong>${request.contactName}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Email</div>
                    <div class="detail-value"><a href="mailto:${request.contactEmail}">${request.contactEmail}</a></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value"><a href="tel:${request.contactPhone}">${request.contactPhone}</a></div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title admin-section-title">Metadata</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Submitted</div>
                    <div class="detail-value">${new Date(request.createdAt).toLocaleString()}</div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Editable Until</div>
                    <div class="detail-value">${new Date(request.editableUntil).toLocaleString()}</div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Request ID</div>
                    <div class="detail-value"><span class="code-text">${request._id}</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">User ID</div>
                    <div class="detail-value"><span class="code-text">${request.userId}</span></div>
                  </div>
                </div>

                <div class="alert-box">
                  <strong>Action Required</strong>
                  <p>Please review this request and contact the client within 1-2 business days to discuss their requirements.</p>
                </div>
              </div>
              
              <div class="footer">
                <p>Automated notification from your website request system</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Admin notification email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);
    throw error;
  }
};

export const sendClientApprovalEmail = async (
  request: IWebsiteRequest,
  website: any
): Promise<void> => {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: request.contactEmail,
      subject: '✅ Your Website Request Has Been Approved!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Request Approved</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <h1>🎉 Request Approved!</h1>
                <p>Your project is now in progress</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${request.contactName}</strong>,
                </div>
                
                <p class="intro-text">
                  Great news! We've approved your website request for <strong>${request.projectName}</strong> 
                  and our team is ready to start working on your project.
                </p>

                <div class="section">
                  <div class="section-title">Project Details</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Project Name</div>
                    <div class="detail-value"><strong>${website.name}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Status</div>
                    <div class="detail-value"><span class="badge badge-success">${website.status}</span></div>
                  </div>
                  
                  ${website.assignedAdmin ? `
                  <div class="detail-row">
                    <div class="detail-label">Assigned Team Member</div>
                    <div class="detail-value">${website.assignedAdmin}</div>
                  </div>
                  ` : ''}
                  
                  ${website.totalPages ? `
                  <div class="detail-row">
                    <div class="detail-label">Total Pages</div>
                    <div class="detail-value">${website.totalPages}</div>
                  </div>
                  ` : ''}
                </div>

                <div class="info-box">
                  <strong>What Happens Next?</strong>
                  <p>
                    Our team will begin working on your website immediately. 
                    ${website.assignedAdmin ? `${website.assignedAdmin} will be your primary point of contact and ` : 'Someone from our team '}
                    will reach out to you within 24 hours to discuss the next steps and timeline.
                  </p>
                </div>

                <div class="alert-box" style="background-color: #dbeafe; border-left-color: #3b82f6;">
                  <strong style="color: #1e40af;">Stay Updated</strong>
                  <p style="color: #1e3a8a;">
                    You can track your project progress through your dashboard. 
                    We'll keep you informed at every milestone!
                  </p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  If you have any questions, feel free to reply to this email or contact us at ${request.contactPhone}.
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>Approved on ${new Date().toLocaleString()}</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Client approval email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send approval email:', error);
    throw error;
  }
};