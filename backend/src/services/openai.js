import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Content generation service
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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional content creator specialized in creating engaging, high-quality content for various platforms. Always create original, valuable content that provides real insights or entertainment value."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const generatedText = completion.choices[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error('No content generated');
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
    console.error('OpenAI API error:', error);
    
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please try again later.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key configuration.');
    }
    
    throw new Error('Failed to generate content. Please try again.');
  }
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
