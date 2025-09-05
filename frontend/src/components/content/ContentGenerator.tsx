import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  Create as CreateIcon,
  TrendingUp,
  ContentCopy,
} from '@mui/icons-material';
import { contentAPI, ContentGenerationRequest, ContentItem } from '../../services/content';

// Form interface
interface FormData {
  topic: string;
  keyword?: string;
  contentType: 'blog_post' | 'social_caption';
  platformTarget?: string;
}

// Validation schema
const schema = yup.object().shape({
  topic: yup.string().required('Topic is required').min(2, 'Topic must be at least 2 characters'),
  keyword: yup.string().notRequired(),
  contentType: yup.string().oneOf(['blog_post', 'social_caption']).required('Content type is required'),
  platformTarget: yup.string().notRequired(),
}) as yup.ObjectSchema<FormData>;

const ContentGenerator: React.FC = () => {
  const [generatedContent, setGeneratedContent] = useState<ContentItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null);

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      topic: '',
      keyword: '',
      contentType: 'blog_post',
      platformTarget: '',
    },
  });

  const contentType = watch('contentType');

  const onSubmit = async (data: FormData) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const request: ContentGenerationRequest = {
        topic: data.topic,
        keyword: data.keyword || undefined,
        contentType: data.contentType as 'blog_post' | 'social_caption',
        platformTarget: data.platformTarget && data.platformTarget !== '' 
          ? data.platformTarget as 'Twitter' | 'LinkedIn' | 'Facebook' | 'Instagram' | 'General'
          : undefined,
      };

      const response = await contentAPI.generateContent(request);
      setGeneratedContent(response.content);
      setRemainingGenerations(response.remainingGenerations);
    } catch (error: any) {
      console.error('Content generation error:', error);
      
      if (error.response?.status === 429) {
        setError('Daily generation limit exceeded. Please try again tomorrow.');
      } else if (error.response?.status === 503) {
        setError(error.response.data.message || 'AI service temporarily unavailable');
      } else {
        setError(error.response?.data?.message || 'Failed to generate content');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.generatedText);
    }
  };

  const handleGenerateAnother = () => {
    setGeneratedContent(null);
    reset();
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Generate Content
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Create AI-powered content for your blog or social media platforms.
      </Typography>

      {remainingGenerations !== null && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have {remainingGenerations} content generations remaining today.
        </Alert>
      )}

      <Stack spacing={3}>
        {!generatedContent ? (
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={3}>
                  <Controller
                    name="topic"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Topic"
                        placeholder="e.g., Benefits of remote work, Healthy breakfast ideas"
                        fullWidth
                        error={!!errors.topic}
                        helperText={errors.topic?.message}
                        disabled={isGenerating}
                      />
                    )}
                  />

                  <Controller
                    name="keyword"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Keyword (Optional)"
                        placeholder="e.g., productivity, nutrition, technology"
                        fullWidth
                        error={!!errors.keyword}
                        helperText={errors.keyword?.message || 'Optional: Add a specific keyword to focus on'}
                        disabled={isGenerating}
                      />
                    )}
                  />

                  <Controller
                    name="contentType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.contentType}>
                        <InputLabel>Content Type</InputLabel>
                        <Select
                          {...field}
                          label="Content Type"
                          disabled={isGenerating}
                        >
                          <MenuItem value="blog_post">Blog Post (150-200 words)</MenuItem>
                          <MenuItem value="social_caption">Social Media Caption</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  {contentType === 'social_caption' && (
                    <Controller
                      name="platformTarget"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.platformTarget}>
                          <InputLabel>Platform (Optional)</InputLabel>
                          <Select
                            {...field}
                            label="Platform (Optional)"
                            disabled={isGenerating}
                          >
                            <MenuItem value="">General</MenuItem>
                            <MenuItem value="Twitter">Twitter</MenuItem>
                            <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                            <MenuItem value="Instagram">Instagram</MenuItem>
                            <MenuItem value="Facebook">Facebook</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  )}

                  {error && (
                    <Alert severity="error">
                      {error}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isGenerating}
                    startIcon={isGenerating ? <CircularProgress size={20} /> : <CreateIcon />}
                    fullWidth
                  >
                    {isGenerating ? 'Generating Content...' : 'Generate Content'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={3}>
            {/* Generated Content Display */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Generated Content</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={generatedContent.contentType.replace('_', ' ').toUpperCase()}
                      color="primary"
                      size="small"
                    />
                    {generatedContent.platformTarget && (
                      <Chip
                        label={generatedContent.platformTarget}
                        color="secondary"
                        size="small"
                      />
                    )}
                  </Stack>
                </Box>

                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 3, 
                    mb: 2, 
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {generatedContent.generatedText}
                  </Typography>
                </Paper>

                {/* Content Stats */}
                <Stack direction="row" spacing={3} mb={2}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="primary.main">
                      {generatedContent.wordCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Words
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" color="secondary.main">
                      {generatedContent.characterCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Characters
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" color="success.main">
                      {generatedContent.potentialReachMetric}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Potential Reach
                    </Typography>
                  </Box>
                </Stack>

                {/* Action Buttons */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<ContentCopy />}
                    onClick={handleCopyContent}
                    fullWidth
                  >
                    Copy Content
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleGenerateAnother}
                    fullWidth
                  >
                    Generate Another
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Success Message */}
            <Alert severity="success" icon={<TrendingUp />}>
              Content generated successfully! You can copy it, edit it in your content list, or generate another piece.
            </Alert>
          </Stack>
        )}
      </Stack>
    </Container>
  );
};

export default ContentGenerator;
