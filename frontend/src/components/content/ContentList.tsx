/**
 * Displays a list of generated content items, allowing users to manage, edit, schedule, copy, share, and delete their content.
 *
 * Features:
 * - Fetches and displays content items from the backend.
 * - Provides filtering by content type (e.g., blog post, social caption) and status (draft, scheduled, published).
 * - Allows editing of content text via a dialog.
 * - Enables scheduling of content for future publication on various platforms.
 * - Supports copying content to clipboard and sharing via the Web Share API.
 * - Handles deletion of content with confirmation dialog.
 * - Displays loading, error, and success states.
 *
 * Uses Material UI components for layout and dialogs, and react-hook-form with Yup for schedule form validation.
 *
 * @component
 */
import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { contentAPI, ContentItem } from "../../services/content";

// Schedule form interface and validation
interface ScheduleFormData {
  scheduledDate: string;
  scheduledTime: string;
  platform: string;
  notes?: string;
}

const scheduleSchema = yup.object().shape({
  scheduledDate: yup.string().required("Date is required"),
  scheduledTime: yup.string().required("Time is required"),
  platform: yup.string().required("Platform is required"),
  notes: yup.string().notRequired(),
}) as yup.ObjectSchema<ScheduleFormData>;

const ContentList: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Menu and dialog states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Separate states for content being edited/deleted
  const [contentToEdit, setContentToEdit] = useState<ContentItem | null>(null);
  const [contentToDelete, setContentToDelete] = useState<ContentItem | null>(
    null
  );

  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Edit form state
  const [editText, setEditText] = useState("");

  // Schedule form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ScheduleFormData>({
    resolver: yupResolver(scheduleSchema),
    defaultValues: {
      scheduledDate: "",
      scheduledTime: "",
      platform: "",
      notes: "",
    },
  });

  useEffect(() => {
    loadContent();
  }, []);

  const applyFilters = React.useCallback(() => {
    let filtered = [...content];

    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.contentType === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => {
        switch (filterStatus) {
          case "scheduled":
            return item.scheduledAt !== null;
          case "published":
            return item.status === "posted_simulated";
          case "draft":
            return item.status === "draft";
          default:
            return true;
        }
      });
    }

    setFilteredContent(filtered);
  }, [content, filterType, filterStatus]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await contentAPI.getContent();
      setContent(response.content);
    } catch (error: any) {
      console.error("Error loading content:", error);
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to close dialogs and clear state
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setContentToEdit(null);
    setEditText("");
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setContentToDelete(null);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    contentItem: ContentItem
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedContent(contentItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContent(null);
  };

  const handleEdit = () => {
    console.log("handleEdit called", { selectedContent, editText });
    if (selectedContent) {
      setContentToEdit(selectedContent); // Store in separate state
      setEditText(selectedContent.generatedText);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleSchedule = () => {
    if (selectedContent) {
      setScheduleDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    console.log("handleDelete called", { selectedContent });
    if (selectedContent) {
      setContentToDelete(selectedContent); // Store in separate state
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    handleMenuClose();
  };

  const handleShare = (contentItem: ContentItem) => {
    if (navigator.share) {
      navigator.share({
        title: `Content: ${contentItem.topic}`,
        text: contentItem.generatedText,
      });
    } else {
      handleCopy(contentItem.generatedText);
    }
    handleMenuClose();
  };

  const saveEdit = async () => {
    console.log("saveEdit called", { contentToEdit, editText });
    if (!contentToEdit) return;

    try {
      console.log("Calling editContent API...");
      await contentAPI.editContent(contentToEdit.id, {
        generatedText: editText,
      });
      console.log("Edit successful, reloading content...");
      await loadContent();
      closeEditDialog();
      setError(null);
      setSuccess("Content updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Error updating content:", error);
      setError("Failed to update content. Please try again.");
    }
  };

  const saveSchedule = async (data: ScheduleFormData) => {
    if (!selectedContent) return;

    try {
      const scheduledDateTime = `${data.scheduledDate}T${data.scheduledTime}`;
      await contentAPI.scheduleContent(selectedContent.id, scheduledDateTime);
      await loadContent();
      setScheduleDialogOpen(false);
      reset();
    } catch (error: any) {
      console.error("Error scheduling content:", error);
      setError("Failed to schedule content. Please try again.");
    }
  };

  const confirmDelete = async () => {
    console.log("confirmDelete called", { contentToDelete });
    if (!contentToDelete) return;

    try {
      console.log("Calling deleteContent API...");
      await contentAPI.deleteContent(contentToDelete.id);
      console.log("Delete successful, reloading content...");
      await loadContent();
      closeDeleteDialog();
      setError(null);
      setSuccess("Content deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Error deleting content:", error);
      setError("Failed to delete content. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "success";
      case "scheduled":
        return "info";
      case "draft":
        return "default";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
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
          Your Content
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Manage, edit, and schedule your generated content
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FilterIcon />
          <Typography variant="subtitle2">Filters:</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filterType}
              label="Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="blog_post">Blog Posts</MenuItem>
              <MenuItem value="social_caption">Social Captions</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="published">Published</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No content found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {content.length === 0
              ? "You haven't generated any content yet. Start creating!"
              : "No content matches your current filters."}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {filteredContent.map((item) => (
            <Box key={item.id} sx={{ mb: 2 }}>
              <Card sx={{ width: "100%" }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {item.topic}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={
                            item.contentType === "blog_post"
                              ? "Blog Post"
                              : "Social Caption"
                          }
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={item.status}
                          size="small"
                          color={getStatusColor(item.status) as any}
                        />
                      </Stack>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, item)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {item.generatedText.length > 150
                      ? `${item.generatedText.substring(0, 150)}...`
                      : item.generatedText}
                  </Typography>

                  {item.keyword && (
                    <Typography
                      variant="caption"
                      color="primary"
                      sx={{ mb: 1, display: "block" }}
                    >
                      Keyword: {item.keyword}
                    </Typography>
                  )}

                  {item.platformTarget && (
                    <Typography
                      variant="caption"
                      color="secondary"
                      sx={{ mb: 1, display: "block" }}
                    >
                      Platform: {item.platformTarget}
                    </Typography>
                  )}

                  {item.scheduledAt && (
                    <Typography
                      variant="caption"
                      color="info.main"
                      sx={{ mb: 1, display: "block" }}
                    >
                      <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                      Scheduled: {formatDate(item.scheduledAt)}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Created: {formatDate(item.createdAt)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Stack>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleSchedule}>
          <ScheduleIcon sx={{ mr: 1 }} /> Schedule
        </MenuItem>
        <MenuItem
          onClick={() =>
            selectedContent && handleCopy(selectedContent.generatedText)
          }
        >
          <ContentCopyIcon sx={{ mr: 1 }} /> Copy
        </MenuItem>
        <MenuItem
          onClick={() => selectedContent && handleShare(selectedContent)}
        >
          <ShareIcon sx={{ mr: 1 }} /> Share
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Content</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={8}
            fullWidth
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule Content</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleSubmit(saveSchedule)}
            sx={{ mt: 1 }}
          >
            <Stack spacing={3}>
              <Controller
                name="scheduledDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.scheduledDate}
                    helperText={errors.scheduledDate?.message}
                  />
                )}
              />

              <Controller
                name="scheduledTime"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="time"
                    label="Time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.scheduledTime}
                    helperText={errors.scheduledTime?.message}
                  />
                )}
              />

              <Controller
                name="platform"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.platform}>
                    <InputLabel>Platform</InputLabel>
                    <Select {...field} label="Platform">
                      <MenuItem value="Twitter">Twitter</MenuItem>
                      <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                      <MenuItem value="Facebook">Facebook</MenuItem>
                      <MenuItem value="Instagram">Instagram</MenuItem>
                      <MenuItem value="Blog">Blog</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    multiline
                    rows={2}
                    label="Notes (Optional)"
                    fullWidth
                    error={!!errors.notes}
                    helperText={errors.notes?.message}
                  />
                )}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit(saveSchedule)} variant="contained">
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this content? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ContentList;
