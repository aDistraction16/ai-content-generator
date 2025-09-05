// Content generation service using Hugging Face Inference Library (Official)
import { HfInference } from '@huggingface/inference';

// Hugging Face Inference client
const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const hf = new HfInference(HUGGINGFACE_TOKEN);

export const generateContent = async (topic, keyword, contentType, platformTarget) => {
  try {
    let prompt = '';
    let maxTokens = 150;

    // Create platform-specific prompts
    switch (contentType) {
      case 'blog_post':
        maxTokens = 300;
        prompt = `Write a short, engaging blog post (150-200 words) about "${topic}"${keyword ? ` focusing on "${keyword}"` : ''}. 
        Make it informative, well-structured with a clear introduction, main points, and conclusion. 
        Use a professional yet approachable tone.`;
        break;
        
      case 'social_caption':
        maxTokens = 100;
        switch (platformTarget) {
          case 'Twitter':
            prompt = `Create an engaging Twitter post (under 280 characters) about "${topic}"${keyword ? ` focusing on "${keyword}"` : ''}. 
            Make it catchy, include relevant hashtags, and encourage engagement. Be concise and impactful.`;
            break;
            
          case 'LinkedIn':
            prompt = `Write a professional LinkedIn post about "${topic}"${keyword ? ` focusing on "${keyword}"` : ''}. 
            Make it insightful, business-focused, and encourage professional discussion. Include relevant hashtags.`;
            break;
            
          case 'Instagram':
            prompt = `Create an engaging Instagram caption about "${topic}"${keyword ? ` focusing on "${keyword}"` : ''}. 
            Make it visually appealing, include emojis, relevant hashtags, and encourage interaction.`;
            break;
            
          case 'Facebook':
            prompt = `Write a Facebook post about "${topic}"${keyword ? ` focusing on "${keyword}"` : ''}. 
            Make it engaging, conversational, and encourage comments and shares.`;
            break;
            
          default:
            prompt = `Create an engaging social media post about "${topic}"${keyword ? ` focusing on "${keyword}"` : ''}. 
            Make it versatile for multiple platforms, engaging, and shareable.`;
        }
        break;
        
      default:
        throw new Error('Invalid content type');
    }

    let generatedText = '';

    // If no Hugging Face token is provided, use mock content generation for testing
    if (!HUGGINGFACE_TOKEN || HUGGINGFACE_TOKEN === 'your_huggingface_token_here') {
      console.log('Using mock content generation (no API token provided)');
      generatedText = generateMockContent(topic, keyword, contentType, platformTarget);
    } else {
      // Use Hugging Face Inference Library for content generation
      console.log('Using Hugging Face API for content generation');
      
      const systemPrompt = 'You are a professional content creator specialized in creating engaging, high-quality content for various platforms. Always create original, valuable content that provides real insights or entertainment value.';
      
      try {
        const response = await hf.chatCompletion({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7
        });

        console.log('Hugging Face API response:', response);
        
        // Extract generated text from response
        if (response && response.choices && response.choices[0] && response.choices[0].message) {
          generatedText = response.choices[0].message.content;
        } else {
          console.log('Unexpected response format, using mock content');
          generatedText = generateMockContent(topic, keyword, contentType, platformTarget);
        }
        
      } catch (apiError) {
        console.error('Hugging Face API error:', apiError);
        
        // Handle specific errors
        if (apiError.message.includes('model') && apiError.message.includes('not supported')) {
          console.log('Model not supported, falling back to mock content');
          generatedText = generateMockContent(topic, keyword, contentType, platformTarget);
        } else if (apiError.message.includes('401') || apiError.message.includes('403')) {
          throw new Error('Authentication failed. Please check your Hugging Face token.');
        } else if (apiError.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          console.log('API error, falling back to mock content');
          generatedText = generateMockContent(topic, keyword, contentType, platformTarget);
        }
      }
    }

    // Calculate metrics
    const wordCount = generatedText.split(/\s+/).length;
    const characterCount = generatedText.length;
    
    // Calculate potential reach (simplified simulation)
    const potentialReach = calculatePotentialReach(contentType, platformTarget, wordCount, characterCount);

    return {
      generatedText: generatedText.trim(),
      wordCount,
      characterCount,
      potentialReach,
    };
    
  } catch (error) {
    console.error('Content generation error:', error);
    
    // Handle specific errors
    if (error.message.includes('token') || error.message.includes('401')) {
      throw new Error('Authentication failed. Please check your Hugging Face token.');
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    } else if (error.message.includes('quota') || error.message.includes('403')) {
      throw new Error('API quota exceeded or access denied. Please try again later.');
    } else if (error.message.includes('network') || error.name === 'NetworkError') {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw new Error('Failed to generate content. Please try again.');
  }
};

// Mock content generation for testing without API keys
const generateMockContent = (topic, keyword, contentType, platformTarget) => {
  const templates = {
    blog_post: [
      `# Understanding ${topic}\n\n${topic} is an essential aspect of modern life that deserves our attention. ${keyword ? `When we focus on ${keyword}, we` : 'We'} can discover new insights and opportunities for growth.\n\nThe key benefits include improved efficiency, better decision-making, and enhanced understanding. By implementing best practices and staying informed about latest developments, we can make meaningful progress.\n\nIn conclusion, ${topic} offers valuable opportunities for those willing to explore and learn. Start your journey today and discover the potential that awaits.`,
      
      `# The Power of ${topic}\n\nIn today's fast-paced world, ${topic} has become increasingly important. ${keyword ? `Particularly when considering ${keyword}, the` : 'The'} impact on our daily lives cannot be understated.\n\nResearch shows that understanding ${topic} leads to better outcomes and more informed decisions. Whether you're a beginner or experienced professional, there's always room for improvement and learning.\n\nTake action today by exploring ${topic} further. Your future self will thank you for the investment in knowledge and understanding you make now.`
    ],
    
    social_caption: {
      Twitter: [
        `🚀 Diving deep into ${topic} today! ${keyword ? `#${keyword.replace(/\s+/g, '')}` : ''} #Innovation #Learning #Growth\n\nWhat's your experience with ${topic}? Share your thoughts! 👇`,
        
        `💡 ${topic} is changing the game! ${keyword ? `Especially when it comes to ${keyword}.` : ''} \n\n${keyword ? `#${keyword.replace(/\s+/g, '')}` : ''} #TechTrends #Future #Success`
      ],
      
      LinkedIn: [
        `🎯 Reflecting on the impact of ${topic} in today's professional landscape.\n\n${keyword ? `When we examine ${keyword}, we` : 'We'} see incredible opportunities for growth and innovation. The key is staying informed and adapting to change.\n\nWhat strategies have you found most effective when dealing with ${topic}?\n\n${keyword ? `#${keyword.replace(/\s+/g, '')}` : ''} #ProfessionalDevelopment #Innovation #Leadership`,
        
        `🌟 ${topic} continues to reshape how we work and think.\n\n${keyword ? `The intersection with ${keyword} presents` : 'This presents'} unique challenges and opportunities. Success comes from embracing change and continuous learning.\n\nI'd love to hear your perspectives on ${topic}!\n\n#Innovation #Growth #Future`
      ],
      
      Instagram: [
        `✨ Exploring the wonderful world of ${topic} today! ${keyword ? `💫 ${keyword}` : ''} \n\n${topic} has taught me so much about growth, persistence, and innovation. Every day brings new discoveries! 🌱\n\n${keyword ? `#${keyword.replace(/\s+/g, '')}` : ''} #Inspiration #Learning #Growth #Motivation #Success`,
        
        `🌈 ${topic} vibes today! ${keyword ? `Especially loving ${keyword} 💖` : ''}\n\nThere's something magical about diving deep into ${topic} - it opens up so many possibilities! ✨\n\nWhat's inspiring you today? Drop it in the comments! 👇\n\n#Inspiration #Growth #Learning #Positivity`
      ],
      
      Facebook: [
        `Hey everyone! 👋\n\nI've been exploring ${topic} lately and it's fascinating how much there is to learn! ${keyword ? `Particularly interesting is ${keyword} and` : 'What'} how it impacts our daily lives.\n\n${topic} has really opened my eyes to new possibilities and ways of thinking. Anyone else interested in ${topic}? Would love to hear your thoughts and experiences!\n\n${keyword ? `#${keyword.replace(/\s+/g, '')}` : ''} #Learning #Growth #Community`,
        
        `🎉 Excited to share my journey with ${topic}!\n\n${keyword ? `Diving into ${keyword} has been` : 'It has been'} an incredible learning experience. The more I discover, the more I realize how much potential there is for growth and positive change.\n\nWhat's been your experience with ${topic}? Any tips or insights to share? Let's learn from each other! 💬\n\n#Community #Learning #Growth #Sharing`
      ]
    }
  };

  if (contentType === 'blog_post') {
    const blogTemplates = templates.blog_post;
    return blogTemplates[Math.floor(Math.random() * blogTemplates.length)];
  } else if (contentType === 'social_caption') {
    const platformTemplates = templates.social_caption[platformTarget] || templates.social_caption.Twitter;
    return platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
  }
  
  return `Discover the amazing world of ${topic}! ${keyword ? `Learn more about ${keyword} and` : ''} unlock new possibilities today. #${topic.replace(/\s+/g, '')} #Innovation #Growth`;
};

// Simulate potential reach calculation
const calculatePotentialReach = (contentType, platformTarget, wordCount, characterCount) => {
  let baseReach = 100;
  
  // Platform-specific multipliers
  const platformMultipliers = {
    'Twitter': 1.2,
    'LinkedIn': 0.8,
    'Instagram': 1.5,
    'Facebook': 1.0,
    'General': 1.0,
  };
  
  // Content type multipliers
  const contentMultipliers = {
    'blog_post': 1.3,
    'social_caption': 1.0,
  };
  
  // Quality score based on length (simplified)
  let qualityScore = 1.0;
  if (contentType === 'blog_post') {
    qualityScore = wordCount >= 100 && wordCount <= 250 ? 1.2 : 0.9;
  } else if (contentType === 'social_caption') {
    qualityScore = characterCount >= 50 && characterCount <= 300 ? 1.1 : 0.9;
  }
  
  const platformMultiplier = platformMultipliers[platformTarget] || 1.0;
  const contentMultiplier = contentMultipliers[contentType] || 1.0;
  
  const potentialReach = Math.round(
    baseReach * platformMultiplier * contentMultiplier * qualityScore * (Math.random() * 0.4 + 0.8)
  );
  
  return Math.max(50, potentialReach); // Minimum reach of 50
};

export default { generateContent };
