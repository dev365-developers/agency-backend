// jobs/billingCron.ts
import cron from 'node-cron';
import Website, { BillingStatus } from '../models/Website';
import WebsiteRequest from '../models/WebsiteRequest';
import { sendBillingSuspensionEmail, sendBillingOverdueEmail } from '../utils/emailService';

/**
 * 🔥 PHASE 3: Automated billing status checker
 * 
 * Runs daily at 2 AM to check and update billing statuses
 */
export const startBillingCron = () => {
  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Running billing status check...');
    
    try {
      await updateBillingStatuses();
      console.log('✅ Billing status check completed');
    } catch (error) {
      console.error('❌ Error in billing cron job:', error);
    }
  });

  console.log('✅ Billing cron job scheduled (runs daily at 2:00 AM)');
};

/**
 * Manual trigger for billing status update (useful for testing)
 */
export const updateBillingStatuses = async (): Promise<void> => {
  const now = new Date();
  
  try {
    // Find all websites with billing issues
    const websites = await Website.find({
      $or: [
        {
          'billing.status': BillingStatus.PENDING,
          'billing.graceEndsAt': { $lt: now },
        },
        {
          'billing.status': BillingStatus.ACTIVE,
          'billing.dueAt': { $lt: now },
        },
      ],
    }).populate('requestId');

    console.log(`📊 Found ${websites.length} websites requiring billing updates`);

    let pendingToSuspended = 0;
    let activeToOverdue = 0;
    let errors = 0;

    for (const website of websites) {
      try {
        let statusChanged = false;
        let emailSent = false;

        // PENDING → SUSPENDED (grace period ended)
        if (
          website.billing.status === BillingStatus.PENDING &&
          website.billing.graceEndsAt &&
          website.billing.graceEndsAt < now
        ) {
          website.billing.status = BillingStatus.SUSPENDED;
          website.billing.suspendedAt = now;
          statusChanged = true;
          pendingToSuspended++;

          console.log(`⚠️  Suspended website ${website._id} (${website.name}) - grace period ended`);

          // Send suspension email
          try {
            const request = await WebsiteRequest.findById(website.requestId);
            if (request) {
              await sendBillingSuspensionEmail(request, website);
              emailSent = true;
            }
          } catch (emailError) {
            console.error(`Failed to send suspension email for ${website._id}:`, emailError);
          }
        }

        // ACTIVE → OVERDUE (payment due date passed)
        if (
          website.billing.status === BillingStatus.ACTIVE &&
          website.billing.dueAt &&
          website.billing.dueAt < now
        ) {
          website.billing.status = BillingStatus.OVERDUE;
          statusChanged = true;
          activeToOverdue++;

          console.log(`⚠️  Marked website ${website._id} (${website.name}) as OVERDUE`);

          // Send overdue email
          try {
            const request = await WebsiteRequest.findById(website.requestId);
            if (request) {
              await sendBillingOverdueEmail(request, website);
              emailSent = true;
            }
          } catch (emailError) {
            console.error(`Failed to send overdue email for ${website._id}:`, emailError);
          }
        }

        if (statusChanged) {
          await website.save();
        }
      } catch (websiteError) {
        console.error(`Error updating website ${website._id}:`, websiteError);
        errors++;
      }
    }

    console.log(`
📈 Billing Update Summary:
   - PENDING → SUSPENDED: ${pendingToSuspended}
   - ACTIVE → OVERDUE: ${activeToOverdue}
   - Errors: ${errors}
    `);

  } catch (error) {
    console.error('Failed to update billing statuses:', error);
    throw error;
  }
};

/**
 * Check websites that will become overdue soon (for warnings)
 */
export const checkUpcomingOverdue = async (daysAhead: number = 3): Promise<void> => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  try {
    const upcomingOverdue = await Website.find({
      'billing.status': BillingStatus.ACTIVE,
      'billing.dueAt': {
        $gt: new Date(),
        $lt: futureDate,
      },
    }).populate('requestId');

    console.log(`⏰ ${upcomingOverdue.length} websites have payments due within ${daysAhead} days`);

    // You can send warning emails here
    for (const website of upcomingOverdue) {
      console.log(`   - ${website.name}: Due on ${website.billing.dueAt?.toLocaleDateString()}`);
    }
  } catch (error) {
    console.error('Error checking upcoming overdue:', error);
  }
};

// Optional: Run a more frequent check (every hour) for critical updates
export const startHourlyBillingCheck = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running hourly billing check...');
    
    try {
      await updateBillingStatuses();
    } catch (error) {
      console.error('❌ Error in hourly billing check:', error);
    }
  });

  console.log('✅ Hourly billing check scheduled');
};