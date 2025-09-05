import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Generate PDF report
export const generatePDFReport = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const { 
        userEmail, 
        reportDate, 
        totalContent, 
        totalReach, 
        contentByType, 
        contentList,
        periodStart,
        periodEnd 
      } = reportData;

      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `content-report-${timestamp}.pdf`;
      const filepath = path.join(reportsDir, filename);

      // Create PDF document with proper font
      const doc = new PDFDocument({ 
        margin: 50,
        info: {
          Title: 'Content Generation Report',
          Author: 'AI Content Generator',
          Creator: 'AI Content Generator'
        }
      });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Use standard font to avoid encoding issues
      doc.font('Helvetica');

      // Header
      doc.fontSize(24)
         .fillColor('#4F46E5')
         .text('Content Generation Report', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(14)
         .fillColor('#666')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' })
         .text(`Report Period: ${periodStart} - ${periodEnd}`, { align: 'center' });

      doc.moveDown(2);

      // Summary Section
      doc.fontSize(18)
         .fillColor('#333')
         .text('SUMMARY', { underline: true });
      
      doc.moveDown();
      doc.fontSize(12)
         .fillColor('#333');

      // Summary stats
      const summaryY = doc.y;
      doc.text(`Total Content Created: ${totalContent}`, 50, summaryY);
      doc.text(`Total Potential Reach: ${totalReach.toLocaleString()}`, 300, summaryY);
      
      doc.text(`Blog Posts: ${contentByType.blog_post || 0}`, 50, summaryY + 20);
      doc.text(`Social Captions: ${contentByType.social_caption || 0}`, 300, summaryY + 20);

      doc.moveDown(3);

      // Content Breakdown
      if (contentList && contentList.length > 0) {
      doc.fontSize(18)
         .fillColor('#333')
         .text('CONTENT DETAILS', { underline: true });        doc.moveDown();

        contentList.forEach((content, index) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.fontSize(14)
             .fillColor('#4F46E5')
             .text(`${index + 1}. ${content.topic}`, { continued: false });
          
          doc.fontSize(10)
             .fillColor('#666')
             .text(`Type: ${content.contentType.replace('_', ' ').toUpperCase()} | ` +
                   `Created: ${new Date(content.createdAt).toLocaleDateString()} | ` +
                   `Status: ${content.status.toUpperCase()}`, { continued: false });

          if (content.platformTarget) {
            doc.text(`Platform: ${content.platformTarget}`, { continued: false });
          }

          doc.fontSize(9)
             .fillColor('#333')
             .text(`Words: ${content.wordCount} | Characters: ${content.characterCount} | ` +
                   `Potential Reach: ${content.potentialReachMetric}`, { continued: false });

          // Content preview (first 200 characters)
          const preview = content.generatedText.length > 200 
            ? content.generatedText.substring(0, 200) + '...' 
            : content.generatedText;
          
          doc.fontSize(9)
             .fillColor('#555')
             .text(`Preview: ${preview}`, { 
               width: 500,
               align: 'justify'
             });

          doc.moveDown(1.5);
        });
      }

      // Performance Insights
      doc.addPage();
      doc.fontSize(18)
         .fillColor('#333')
         .text('PERFORMANCE INSIGHTS', { underline: true });
      
      doc.moveDown();
      doc.fontSize(12)
         .fillColor('#333');

      // Calculate insights
      const avgWordsPerContent = contentList.length > 0 
        ? Math.round(contentList.reduce((sum, c) => sum + c.wordCount, 0) / contentList.length)
        : 0;
      
      const avgReachPerContent = contentList.length > 0
        ? Math.round(contentList.reduce((sum, c) => sum + c.potentialReachMetric, 0) / contentList.length)
        : 0;

      const mostUsedPlatform = contentList.length > 0
        ? contentList.reduce((acc, curr) => {
            if (!curr.platformTarget) return acc;
            acc[curr.platformTarget] = (acc[curr.platformTarget] || 0) + 1;
            return acc;
          }, {})
        : {};

      const topPlatform = Object.keys(mostUsedPlatform).length > 0
        ? Object.entries(mostUsedPlatform).sort(([,a], [,b]) => b - a)[0][0]
        : 'N/A';

      doc.text(`- Average words per content: ${avgWordsPerContent}`);
      doc.text(`- Average potential reach per content: ${avgReachPerContent.toLocaleString()}`);
      doc.text(`- Most used platform: ${topPlatform}`);
      doc.text(`- Content creation frequency: ${(contentList.length / 7).toFixed(1)} pieces per day`);

      doc.moveDown(2);

      // Recommendations
      doc.fontSize(18)
         .fillColor('#333')
         .text('RECOMMENDATIONS', { underline: true });
      
      doc.moveDown();
      doc.fontSize(12)
         .fillColor('#333');

      const recommendations = generateRecommendations(reportData);
      recommendations.forEach(rec => {
        doc.text(`- ${rec}`, { 
          width: 500,
          align: 'left'
        });
        doc.moveDown(0.5);
      });

      // Footer
      doc.fontSize(10)
         .fillColor('#666')
         .text('Generated by AI Content Generator', { 
           align: 'center',
           y: doc.page.height - 50
         });

      // Finalize the PDF
      doc.end();

      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          relativePath: `reports/${filename}`
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Generate recommendations based on content data
const generateRecommendations = (reportData) => {
  const { totalContent, contentByType, contentList } = reportData;
  const recommendations = [];

  if (totalContent === 0) {
    recommendations.push('Start creating content to build your presence and engage your audience.');
    return recommendations;
  }

  // Content volume recommendations
  if (totalContent < 7) {
    recommendations.push('Consider increasing your content creation frequency to at least one piece per day for better engagement.');
  } else if (totalContent > 20) {
    recommendations.push('Great job on consistent content creation! Focus on quality and engagement metrics.');
  }

  // Content type balance
  const blogPosts = contentByType.blog_post || 0;
  const socialCaptions = contentByType.social_caption || 0;
  
  if (blogPosts === 0 && socialCaptions > 0) {
    recommendations.push('Consider adding blog posts to provide more in-depth content for your audience.');
  } else if (socialCaptions === 0 && blogPosts > 0) {
    recommendations.push('Add social media captions to increase your social presence and engagement.');
  }

  // Platform diversity
  const platforms = [...new Set(contentList.map(c => c.platformTarget).filter(Boolean))];
  if (platforms.length === 1) {
    recommendations.push('Diversify your content across multiple platforms to reach a broader audience.');
  }

  // Scheduling recommendations
  const scheduledContent = contentList.filter(c => c.status === 'scheduled').length;
  const draftContent = contentList.filter(c => c.status === 'draft').length;
  
  if (draftContent > scheduledContent && draftContent > 3) {
    recommendations.push('You have many draft pieces. Consider scheduling them to maintain consistent posting.');
  }

  // Reach optimization
  const avgReach = contentList.length > 0
    ? contentList.reduce((sum, c) => sum + c.potentialReachMetric, 0) / contentList.length
    : 0;
  
  if (avgReach < 100) {
    recommendations.push('Focus on trending topics and engaging content to improve your potential reach.');
  }

  return recommendations;
};

// Clean up old reports (optional utility)
export const cleanupOldReports = (daysToKeep = 30) => {
  try {
    const files = fs.readdirSync(reportsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    files.forEach(file => {
      const filepath = path.join(reportsDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        console.log(`Cleaned up old report: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old reports:', error);
  }
};

export default {
  generatePDFReport,
  cleanupOldReports,
};
