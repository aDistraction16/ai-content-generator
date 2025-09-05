import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as GenerateIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  templatesAPI,
  ContentTemplate,
  TemplateVariable,
} from "../../services/templates";

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ContentTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<
    TemplateVariable[]
  >([]);

  // Form states
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    contentType: "social_caption",
    platformTarget: "instagram",
    template: "",
    variables: [] as string[],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await templatesAPI.getTemplates();
      setTemplates(response.templates);
    } catch (err) {
      setError("Failed to load templates");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTemplates();
      return;
    }

    try {
      setLoading(true);
      const response = await templatesAPI.searchTemplates(searchQuery, {
        contentType: filterType || undefined,
        platformTarget: filterPlatform || undefined,
      });
      setTemplates(response.templates);
    } catch (err) {
      setError("Search failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await templatesAPI.createTemplate(newTemplate);
      setTemplates([response.template, ...templates]);
      setCreateDialogOpen(false);
      setNewTemplate({
        name: "",
        description: "",
        contentType: "social_caption",
        platformTarget: "instagram",
        template: "",
        variables: [],
      });
    } catch (err) {
      setError("Failed to create template");
      console.error(err);
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await templatesAPI.generateFromTemplate({
        templateId: selectedTemplate.id,
        variables: templateVariables,
      });
      setGenerateDialogOpen(false);
      setSelectedTemplate(null);
      setTemplateVariables([]);
      // You might want to navigate to the content list or show success message
      alert("Content generated successfully!");
    } catch (err) {
      setError("Failed to generate content from template");
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this template?"))
      return;

    try {
      await templatesAPI.deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (err) {
      setError("Failed to delete template");
      console.error(err);
    }
  };

  const openGenerateDialog = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setTemplateVariables(
      template.variables.map((name) => ({ name, value: "" }))
    );
    setGenerateDialogOpen(true);
  };

  const extractVariablesFromTemplate = (template: string): string[] => {
    const matches = template.match(/{{(\w+)}}/g);
    return matches ? matches.map((match) => match.replace(/[{}]/g, "")) : [];
  };

  const updateTemplateText = (text: string) => {
    const variables = extractVariablesFromTemplate(text);
    setNewTemplate({ ...newTemplate, template: text, variables });
  };

  const filteredTemplates = templates.filter((template) => {
    if (filterType && template.contentType !== filterType) return false;
    if (filterPlatform && template.platformTarget !== filterPlatform)
      return false;
    return true;
  });

  if (loading && templates.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Content Templates
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Create reusable templates for faster content generation
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              label="Search templates"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              sx={{ flex: 1 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Content Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Content Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="social_caption">Social Caption</MenuItem>
                <MenuItem value="blog_post">Blog Post</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                label="Platform"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="website">Website</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Template
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <CardContent sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h3" gutterBottom>
                  {template.name}
                </Typography>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => openGenerateDialog(template)}
                  >
                    <GenerateIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {template.description}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={template.contentType}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={template.platformTarget}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 2, display: "block" }}
              >
                Variables: {template.variables.join(", ")}
              </Typography>

              <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1, mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                >
                  {template.template.length > 100
                    ? template.template.substring(0, 100) + "..."
                    : template.template}
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Used {template.useCount} times •{" "}
                {template.isPublic ? "Public" : "Private"}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {filteredTemplates.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first template to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Template
          </Button>
        </Box>
      )}

      {/* Create Template Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Template Name"
              value={newTemplate.name}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Description"
              value={newTemplate.description}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, description: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={newTemplate.contentType}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      contentType: e.target.value,
                    })
                  }
                  label="Content Type"
                >
                  <MenuItem value="social_caption">Social Caption</MenuItem>
                  <MenuItem value="blog_post">Blog Post</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Platform</InputLabel>
                <Select
                  value={newTemplate.platformTarget}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      platformTarget: e.target.value,
                    })
                  }
                  label="Platform"
                >
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="facebook">Facebook</MenuItem>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="website">Website</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Template Content"
              value={newTemplate.template}
              onChange={(e) => updateTemplateText(e.target.value)}
              fullWidth
              multiline
              rows={6}
              placeholder="Use {{variable_name}} for dynamic content. Example: 'Check out our new {{product}} for {{target_audience}}!'"
            />
            {newTemplate.variables.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Detected Variables:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {newTemplate.variables.map((variable) => (
                    <Chip key={variable} label={variable} size="small" />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTemplate}
            variant="contained"
            disabled={!newTemplate.name || !newTemplate.template}
          >
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate from Template Dialog */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Content from Template</DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Fill in the variables for:{" "}
                <strong>{selectedTemplate.name}</strong>
              </Typography>
              {templateVariables.map((variable, index) => (
                <TextField
                  key={variable.name}
                  label={variable.name.replace(/_/g, " ").toUpperCase()}
                  value={variable.value}
                  onChange={(e) => {
                    const newVariables = [...templateVariables];
                    newVariables[index].value = e.target.value;
                    setTemplateVariables(newVariables);
                  }}
                  fullWidth
                />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleGenerateFromTemplate}
            variant="contained"
            disabled={templateVariables.some((v) => !v.value.trim())}
          >
            Generate Content
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TemplateManager;
