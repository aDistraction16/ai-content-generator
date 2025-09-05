/**
 * @module services/email
 * @description
 * Provides email sending functionalities using SendGrid, including sending weekly summary reports and welcome emails to users.
 */

/**
 * Sends a weekly summary email to the specified user.
 *
 * @async
 * @function sendWeeklySummary
 * @param {string} userEmail - The recipient's email address.
 * @param {Object} summaryData - Data for the weekly summary.
 * @param {string} summaryData.userName - The user's name.
 * @param {number} summaryData.totalContent - Total number of content pieces created.
 * @param {number} summaryData.totalReach - Total potential reach of the content.
 * @param {Object} summaryData.contentByType - Breakdown of content by type (e.g., blog_post, social_caption).
 * @param {Array<Object>} summaryData.upcomingScheduled - List of upcoming scheduled content.
 * @param {Object} summaryData.weeklyStats - Additional weekly statistics.
 * @returns {Promise<{success: boolean}>} Result of the email sending operation.
 * @throws {Error} If sending the email fails.
 */

/**
 * Sends a welcome email to a new user.
 *
 * @async
 * @function sendWelcomeEmail
 * @param {string} userEmail - The recipient's email address.
 * @param {string} userName - The user's name.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the email sending operation.
 */

/**
 * Generates the HTML content for the weekly summary email.
 *
 * @function generateWeeklySummaryHTML
 * @private
 * @param {Object} data - Data for the weekly summary.
 * @param {string} data.userName - The user's name.
 * @param {number} data.totalContent - Total number of content pieces created.
 * @param {number} data.totalReach - Total potential reach of the content.
 * @param {Object} data.contentByType - Breakdown of content by type.
 * @param {Array<Object>} data.upcomingScheduled - List of upcoming scheduled content.
 * @param {Object} data.weeklyStats - Additional weekly statistics.
 * @returns {string} HTML content for the email.
 */

/**
 * Generates the plain text content for the weekly summary email.
 *
 * @function generateWeeklySummaryText
 * @private
 * @param {Object} data - Data for the weekly summary.
 * @param {string} data.userName - The user's name.
 * @param {number} data.totalContent - Total number of content pieces created.
 * @param {number} data.totalReach - Total potential reach of the content.
 * @param {Object} data.contentByType - Breakdown of content by type.
 * @param {Array<Object>} data.upcomingScheduled - List of upcoming scheduled content.
 * @returns {string} Plain text content for the email.
 */

import sgMail from "@sendgrid/mail";

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send weekly summary email
export const sendWeeklySummary = async (userEmail, summaryData) => {
  try {
    const {
      userName,
      totalContent,
      totalReach,
      contentByType,
      upcomingScheduled,
      weeklyStats,
    } = summaryData;

    const htmlContent = generateWeeklySummaryHTML(summaryData);
    const textContent = generateWeeklySummaryText(summaryData);

    const msg = {
      to: userEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: "AI Content Generator",
      },
      subject: `Your Weekly Content Summary - ${totalContent} pieces created`,
      text: textContent,
      html: htmlContent,
    };

    await sgMail.send(msg);

    console.log(`Weekly summary sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error("SendGrid error:", error);

    if (error.response) {
      console.error("SendGrid response error:", error.response.body);
    }

    throw new Error("Failed to send weekly summary email");
  }
};

// Send welcome email
export const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const msg = {
      to: userEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: "AI Content Generator",
      },
      subject: "Welcome to AI Content Generator!",
      text: `
Welcome to AI Content Generator!

Hi ${userName || "there"},

Thank you for joining AI Content Generator! We're excited to help you create amazing content with the power of AI.

Here's what you can do:
• Generate blog posts and social media captions
• Schedule your content for optimal timing
• Track your content's potential reach
• Receive weekly performance reports

Get started by logging in and creating your first piece of content!

Best regards,
The AI Content Generator Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .feature { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .cta { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to AI Content Generator!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName || "there"},</p>
      <p>Thank you for joining AI Content Generator! We're excited to help you create amazing content with the power of AI.</p>
      
      <h3>Here's what you can do:</h3>
      <div class="feature">📝 Generate blog posts and social media captions</div>
      <div class="feature">📅 Schedule your content for optimal timing</div>
      <div class="feature">📊 Track your content's potential reach</div>
      <div class="feature">📈 Receive weekly performance reports</div>
      
      <p>Get started by logging in and creating your first piece of content!</p>
      
      <p>Best regards,<br>The AI Content Generator Team</p>
    </div>
  </div>
</body>
</html>
      `,
    };

    await sgMail.send(msg);
    console.log(`Welcome email sent to ${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw error for welcome email as it's not critical
    return { success: false, error: error.message };
  }
};

// Generate HTML content for weekly summary
const generateWeeklySummaryHTML = (data) => {
  const {
    userName,
    totalContent,
    totalReach,
    contentByType,
    upcomingScheduled,
    weeklyStats,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .stat-box { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #4F46E5; }
    .stat-number { font-size: 24px; font-weight: bold; color: #4F46E5; }
    .upcoming-item { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #10B981; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Weekly Content Summary</h1>
      <p>Week ending ${new Date().toLocaleDateString()}</p>
    </div>
    <div class="content">
      <p>Hi ${userName || "there"},</p>
      <p>Here's your weekly content creation summary:</p>
      
      <div class="stat-box">
        <div class="stat-number">${totalContent}</div>
        <div>Total Content Created</div>
      </div>
      
      <div class="stat-box">
        <div class="stat-number">${totalReach.toLocaleString()}</div>
        <div>Total Potential Reach</div>
      </div>
      
      <h3>Content Breakdown:</h3>
      ${
        contentByType.blog_post > 0
          ? `<div class="stat-box">📝 ${contentByType.blog_post} Blog Posts</div>`
          : ""
      }
      ${
        contentByType.social_caption > 0
          ? `<div class="stat-box">📱 ${contentByType.social_caption} Social Captions</div>`
          : ""
      }
      
      ${
        upcomingScheduled.length > 0
          ? `
      <h3>📅 Upcoming Scheduled Content:</h3>
      ${upcomingScheduled
        .map(
          (item) => `
        <div class="upcoming-item">
          <strong>${item.topic}</strong><br>
          <small>Scheduled for: ${new Date(
            item.scheduledAt
          ).toLocaleDateString()}</small>
        </div>
      `
        )
        .join("")}
      `
          : ""
      }
      
      <p>Keep up the great work! Your content is making an impact.</p>
      
      <div class="footer">
        <p>AI Content Generator - Powered by AI, Driven by Your Creativity</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// Generate text content for weekly summary
const generateWeeklySummaryText = (data) => {
  const {
    userName,
    totalContent,
    totalReach,
    contentByType,
    upcomingScheduled,
  } = data;

  let text = `
Your Weekly Content Summary
Week ending ${new Date().toLocaleDateString()}

Hi ${userName || "there"},

Here's your weekly content creation summary:

📊 STATS:
• Total Content Created: ${totalContent}
• Total Potential Reach: ${totalReach.toLocaleString()}

📝 CONTENT BREAKDOWN:
`;

  if (contentByType.blog_post > 0) {
    text += `• Blog Posts: ${contentByType.blog_post}\n`;
  }
  if (contentByType.social_caption > 0) {
    text += `• Social Captions: ${contentByType.social_caption}\n`;
  }

  if (upcomingScheduled.length > 0) {
    text += `\n📅 UPCOMING SCHEDULED CONTENT:\n`;
    upcomingScheduled.forEach((item) => {
      text += `• ${item.topic} - Scheduled for: ${new Date(
        item.scheduledAt
      ).toLocaleDateString()}\n`;
    });
  }

  text += `\nKeep up the great work! Your content is making an impact.

Best regards,
The AI Content Generator Team
  `;

  return text;
};

export default {
  sendWeeklySummary,
  sendWelcomeEmail,
};
