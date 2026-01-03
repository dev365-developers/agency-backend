// utils/emailService.ts
import { Resend } from 'resend';
import { IWebsiteRequest } from '../models/WebsiteRequest';
import { IWebsite } from '../models/Website';
import { ISupportRequest } from '../models/SupportRequest';
import { getDaysRemaining } from './billingUtils';


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
                  Please do not reply to this mail since it is an automated response.
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
                <h1>Request Approved!</h1>
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
                  Please do not reply to this mail since it is an automated response.
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

export const sendBillingActivatedEmail = async (
  request: IWebsiteRequest,
  website: IWebsite
): Promise<void> => {
  try {
    const daysRemaining = website.billing.graceEndsAt 
      ? getDaysRemaining(website.billing.graceEndsAt)
      : 5;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: request.contactEmail,
      subject: '🎉 Your Website is Live! Payment Details Inside',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Website Deployed</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);">
                <h1>Your Website is Live!</h1>
                <p>Congratulations! Your project is now deployed</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${request.contactName}</strong>,
                </div>
                
                <p class="intro-text">
                  Great news! Your website <strong>${website.name}</strong> has been successfully deployed and is now live!
                </p>

                ${website.deploymentUrl ? `
                <div class="info-box">
                  <strong>🌐 Your Website URL</strong>
                  <p style="font-size: 16px; margin-top: 8px;">
                    <a href="${website.deploymentUrl}" style="color: #6366f1; font-weight: 600;">${website.deploymentUrl}</a>
                  </p>
                </div>
                ` : ''}

                <div class="section">
                  <div class="section-title">Payment Information</div>
                  
                  ${website.billing.plan ? `
                  <div class="detail-row">
                    <div class="detail-label">Plan</div>
                    <div class="detail-value"><strong>${website.billing.plan}</strong></div>
                  </div>
                  ` : ''}
                  
                  ${website.billing.price ? `
                  <div class="detail-row">
                    <div class="detail-label">Price</div>
                    <div class="detail-value"><strong>$${website.billing.price}</strong> / ${website.billing.billingCycle}</div>
                  </div>
                  ` : ''}
                  
                  <div class="detail-row">
                    <div class="detail-label">Payment Due</div>
                    <div class="detail-value">${website.billing.graceEndsAt?.toLocaleDateString()}</div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Days Remaining</div>
                    <div class="detail-value"><span class="badge badge-success">${daysRemaining} days</span></div>
                  </div>
                </div>

                <div class="alert-box" style="background-color: #fef3c7; border-left-color: #f59e0b;">
                  <strong style="color: #92400e;">⏰ Important: Payment Grace Period</strong>
                  <p style="color: #78350f;">
                    You have <strong>${daysRemaining} days</strong> to complete your first payment. 
                    After ${website.billing.graceEndsAt?.toLocaleDateString()}, your website will be suspended 
                    until payment is received.
                  </p>
                </div>

                <div class="info-box">
                  <strong>📞 How to Make Payment</strong>
                  <p>
                    Please contact us at <strong>${process.env.CONTACT_NO}</strong>
                    to arrange payment. We accept various payment methods for your convenience.
                  </p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  Thank you for choosing us to build your website. We're excited to see your project live!
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>Deployed on ${new Date().toLocaleString()}</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Billing activation email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send billing activation email:', error);
    throw error;
  }
};

/**
 * Send email when website is suspended due to non-payment
 */
export const sendBillingSuspensionEmail = async (
  request: IWebsiteRequest,
  website: IWebsite
): Promise<void> => {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: request.contactEmail,
      subject: '⚠️ URGENT: Website Suspended - Payment Required',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Website Suspended</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                <h1>Website Suspended</h1>
                <p>Immediate action required</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${request.contactName}</strong>,
                </div>
                
                <p class="intro-text" style="color: #991b1b;">
                  Your website <strong>${website.name}</strong> has been suspended due to non-payment.
                </p>

                <div class="alert-box" style="background-color: #fee2e2; border-left-color: #dc2626;">
                  <strong style="color: #991b1b;">Website Status: SUSPENDED</strong>
                  <p style="color: #991b1b;">
                    Your website is currently inaccessible to visitors. To restore service, 
                    payment must be received immediately.
                  </p>
                </div>

                <div class="section">
                  <div class="section-title">Suspension Details</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Website</div>
                    <div class="detail-value">${website.name}</div>
                  </div>
                  
                  ${website.deploymentUrl ? `
                  <div class="detail-row">
                    <div class="detail-label">URL</div>
                    <div class="detail-value">${website.deploymentUrl}</div>
                  </div>
                  ` : ''}
                  
                  <div class="detail-row">
                    <div class="detail-label">Suspended On</div>
                    <div class="detail-value">${website.billing.suspendedAt?.toLocaleString() || 'Today'}</div>
                  </div>
                  
                  ${website.billing.price ? `
                  <div class="detail-row">
                    <div class="detail-label">Amount Due</div>
                    <div class="detail-value"><strong style="color: #dc2626;">$${website.billing.price}</strong></div>
                  </div>
                  ` : ''}
                </div>

                <div class="info-box">
                  <strong>💳 How to Restore Your Website</strong>
                  <p>
                    1. Contact us immediately at <strong>${process.env.CONTACT_NO}</strong><br/>
                    2. Arrange payment for the outstanding amount<br/>
                    3. Your website will be restored within 2-4 hours of payment confirmation
                  </p>
                </div>

                <div class="alert-box">
                  <strong>⏰ Time-Sensitive</strong>
                  <p>
                    The longer your website remains suspended, the more impact it has on your 
                    business and SEO rankings. Please act quickly to restore service.
                  </p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  If you believe this suspension was made in error, please contact us immediately.
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>This is an automated notification</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Suspension email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send suspension email:', error);
    throw error;
  }
};

/**
 * Send email when payment becomes overdue
 */
export const sendBillingOverdueEmail = async (
  request: IWebsiteRequest,
  website: IWebsite
): Promise<void> => {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: request.contactEmail,
      subject: '⚠️ Payment Overdue - Action Required',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Overdue</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <h1>Payment Overdue</h1>
                <p>Please settle your account</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${request.contactName}</strong>,
                </div>
                
                <p class="intro-text">
                  Your payment for <strong>${website.name}</strong> is now overdue. 
                  Please arrange payment as soon as possible to avoid service interruption.
                </p>

                <div class="alert-box">
                  <strong>Payment Status: OVERDUE</strong>
                  <p>
                    Your payment was due on ${website.billing.dueAt?.toLocaleDateString()}. 
                    To maintain uninterrupted service, please make payment immediately.
                  </p>
                </div>

                <div class="section">
                  <div class="section-title">Account Details</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Website</div>
                    <div class="detail-value">${website.name}</div>
                  </div>
                  
                  ${website.billing.price ? `
                  <div class="detail-row">
                    <div class="detail-label">Amount Due</div>
                    <div class="detail-value"><strong style="color: #d97706;">$${website.billing.price}</strong></div>
                  </div>
                  ` : ''}
                  
                  <div class="detail-row">
                    <div class="detail-label">Due Date</div>
                    <div class="detail-value">${website.billing.dueAt?.toLocaleDateString()}</div>
                  </div>
                </div>

                <div class="alert-box" style="background-color: #fee2e2; border-left-color: #dc2626;">
                  <strong style="color: #991b1b;">⚠️ Service Suspension Warning</strong>
                  <p style="color: #991b1b;">
                    If payment is not received soon, your website may be suspended. 
                    This will make it inaccessible to visitors until payment is made.
                  </p>
                </div>

                <div class="info-box">
                  <strong>💳 Make Payment Now</strong>
                  <p>
                    Contact us at <strong>${process.env.CONTACT_NO}</strong> or reply to this email 
                    to arrange payment and keep your website active.
                  </p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  Thank you for your prompt attention to this matter.
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>This is an automated reminder</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Overdue payment email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send overdue email:', error);
    throw error;
  }
};

export const sendSupportRequestAdminEmail = async (
  supportRequest: ISupportRequest,
  website: IWebsite,
  websiteRequest: IWebsiteRequest
): Promise<void> => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL;

    if (!adminEmail) {
      console.warn('⚠️ No admin email configured, skipping admin notification');
      return;
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: adminEmail,
      subject: `New Support Request: ${supportRequest.category}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Support Request</title>
          <style>
            ${getEmailStyles()}
            .admin-header { 
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }
            .priority-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 600;
            }
            .priority-high { background-color: #fee2e2; color: #991b1b; }
            .priority-medium { background-color: #fef3c7; color: #92400e; }
            .priority-low { background-color: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header admin-header">
                <h1>New Support Request</h1>
                <p>Immediate attention required</p>
              </div>
              
              <div class="content">
                <div class="alert-box" style="background-color: #fee2e2; border-left-color: #dc2626;">
                  <strong style="color: #991b1b;">Action Required</strong>
                  <p style="color: #991b1b;">A user has submitted a support request that needs your attention.</p>
                </div>

                <div class="section">
                  <div class="section-title">Request Details</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Category</div>
                    <div class="detail-value"><span class="badge">${supportRequest.category}</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Subject</div>
                    <div class="detail-value"><strong>${supportRequest.subject}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Submitted</div>
                    <div class="detail-value">${new Date(supportRequest.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Message</div>
                  <div class="description-box">
                    <div class="description-text">${supportRequest.message}</div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Website Information</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Website Name</div>
                    <div class="detail-value"><strong>${website.name}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${website.status}</div>
                  </div>
                  
                  ${website.deploymentUrl ? `
                  <div class="detail-row">
                    <div class="detail-label">URL</div>
                    <div class="detail-value"><a href="${website.deploymentUrl}">${website.deploymentUrl}</a></div>
                  </div>
                  ` : ''}
                </div>

                <div class="section">
                  <div class="section-title">Client Information</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Name</div>
                    <div class="detail-value"><strong>${websiteRequest.contactName}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Email</div>
                    <div class="detail-value"><a href="mailto:${websiteRequest.contactEmail}">${websiteRequest.contactEmail}</a></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value"><a href="tel:${websiteRequest.contactPhone}">${websiteRequest.contactPhone}</a></div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Metadata</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Request ID</div>
                    <div class="detail-value"><span class="code-text">${supportRequest._id}</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Website ID</div>
                    <div class="detail-value"><span class="code-text">${website._id}</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">User ID</div>
                    <div class="detail-value"><span class="code-text">${supportRequest.userId}</span></div>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <p>Automated notification from your support system</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Support request admin email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send support request admin email:', error);
    throw error;
  }
};

/**
 * Send support request confirmation to user
 */
export const sendSupportRequestUserEmail = async (
  supportRequest: ISupportRequest,
  website: IWebsite,
  websiteRequest: IWebsiteRequest
): Promise<void> => {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: websiteRequest.contactEmail,
      subject: 'Support Request Received - We\'re Here to Help',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Request Confirmation</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                <h1>Support Request Received</h1>
                <p>We're here to help</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${websiteRequest.contactName}</strong>,
                </div>
                
                <p class="intro-text">
                  We've received your support request for <strong>${website.name}</strong> and our team will look into it right away.
                </p>

                <div class="section">
                  <div class="section-title">Your Request</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Category</div>
                    <div class="detail-value"><span class="badge">${supportRequest.category}</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Subject</div>
                    <div class="detail-value"><strong>${supportRequest.subject}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Status</div>
                    <div class="detail-value"><span class="badge badge-success">${supportRequest.status}</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Submitted</div>
                    <div class="detail-value">${new Date(supportRequest.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Your Message</div>
                  <div class="description-box">
                    <div class="description-text">${supportRequest.message}</div>
                  </div>
                </div>

                <div class="info-box">
                  <strong>What Happens Next?</strong>
                  <p>
                    Our support team will review your request and get back to you within 24-48 hours. 
                    For urgent matters, please call us at <strong>${process.env.CONTACT_NO}</strong>.
                  </p>
                </div>

                <div class="alert-box">
                  <strong>Track Your Request</strong>
                  <p>
                    You can track the status of your support request in your dashboard. 
                    We'll update you once your issue is being worked on and when it's resolved.
                  </p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  If you have additional information to provide, feel free to reply to this email.
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>Support Request ID: ${supportRequest._id}</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Support request user confirmation email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send support request user email:', error);
    throw error;
  }
};

/**
 * Send email when support request is resolved
 */
export const sendSupportResolvedEmail = async (
  supportRequest: ISupportRequest,
  website: IWebsite,
  websiteRequest: IWebsiteRequest
): Promise<void> => {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: websiteRequest.contactEmail,
      subject: '✅ Your Support Request Has Been Resolved',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Support Request Resolved</title>
          <style>${getEmailStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <h1>Issue Resolved</h1>
                <p>Your support request has been completed</p>
              </div>
              
              <div class="content">
                <div class="greeting">
                  Hi <strong>${websiteRequest.contactName}</strong>,
                </div>
                
                <p class="intro-text">
                  Great news! We've resolved your support request for <strong>${website.name}</strong>.
                </p>

                <div class="section">
                  <div class="section-title">Resolved Request</div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Category</div>
                    <div class="detail-value">${supportRequest.category}</div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Subject</div>
                    <div class="detail-value"><strong>${supportRequest.subject}</strong></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Status</div>
                    <div class="detail-value"><span class="badge badge-success">RESOLVED</span></div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">Resolved On</div>
                    <div class="detail-value">${new Date().toLocaleString()}</div>
                  </div>
                </div>

                <div class="info-box">
                  <strong>Original Request</strong>
                  <p style="margin-top: 8px; color: #4b5563;">${supportRequest.message}</p>
                </div>

                ${website.deploymentUrl ? `
                <div class="alert-box" style="background-color: #dbeafe; border-left-color: #3b82f6;">
                  <strong style="color: #1e40af;">🌐 Check Your Website</strong>
                  <p style="color: #1e3a8a;">
                    Please visit your website at <a href="${website.deploymentUrl}" style="color: #2563eb; font-weight: 600;">${website.deploymentUrl}</a> 
                    to verify that the issue has been resolved.
                  </p>
                </div>
                ` : ''}

                <div class="info-box">
                  <strong>Need Further Help?</strong>
                  <p>
                    If you're still experiencing issues or have additional questions, feel free to:
                    <br/>• Reply to this email
                    <br/>• Submit a new support request through your dashboard
                    <br/>• Call us at <strong>${process.env.CONTACT_NO}</strong>
                  </p>
                </div>
                
                <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                  Thank you for your patience while we worked on resolving your issue.
                </p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #374151;">
                  Best regards,<br/>
                  <strong>${process.env.COMPANY_NAME || 'The Team'}</strong>
                </p>
              </div>
              
              <div class="footer">
                <p>Support Request ID: ${supportRequest._id}</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Your Company'}. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Support resolved email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send support resolved email:', error);
    throw error;
  }
};