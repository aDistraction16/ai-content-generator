/**
 * Dashboard component displays an overview of the user's content creation statistics,
 * usage, and analytics in a tabbed interface. It fetches dashboard data from the API,
 * handles loading and error states, and presents key metrics such as content generated,
 * reach, usage limits, and content breakdowns. The component also provides navigation
 * to content generation, content listing, and detailed reports, as well as access to
 * advanced and performance analytics via tabs.
 *
 * @component
 * @returns {JSX.Element} The rendered dashboard overview and analytics.
 *
 * @example
 * ```tsx
 * <Dashboard />
 * ```
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import {
  TrendingUp,
  Create,
  Assessment,
  Schedule,
  Analytics,
  Speed,
} from "@mui/icons-material";
import { reportsAPI, DashboardData } from "../../services/reports";
import AdvancedAnalytics from "../analytics/AdvancedAnalytics";
import PerformanceAnalytics from "../analytics/PerformanceAnalytics";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getDashboard();
      setDashboardData(response.dashboard);
    } catch (error: any) {
      setError("Failed to load dashboard data");
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={loadDashboardData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!dashboardData) {
    return <Alert severity="info">No dashboard data available</Alert>;
  }

  const { last30Days, last7Days, allTime, usage, trends } = dashboardData;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Welcome back! Here's your content creation overview.
      </Typography>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="dashboard tabs"
        >
          <Tab icon={<Assessment />} label="Overview" />
          <Tab icon={<Analytics />} label="Advanced Analytics" />
          <Tab icon={<Speed />} label="Performance" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <>
          {/* Quick Actions and Stats */}
          <Stack spacing={3} sx={{ mt: 3 }}>
            {/* Top Row - Quick Actions and 7-Day Stats */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Create color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Quick Generate</Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Create new content with AI assistance
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate("/generate")}
                  >
                    Generate Content
                  </Button>
                </CardActions>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrendingUp color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Last 7 Days</Typography>
                  </Box>
                  <Typography variant="h4" color="primary.main">
                    {last7Days.totalContent}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Content pieces created
                  </Typography>
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      {last7Days.averageDaily.toFixed(1)} avg/day
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Assessment color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Total Reach</Typography>
                  </Box>
                  <Typography variant="h4" color="secondary.main">
                    {last30Days.totalReach.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Potential reach (30 days)
                  </Typography>
                  {trends && (
                    <Box mt={1}>
                      <Chip
                        label={`${trends.reachTrend > 0 ? "+" : ""}${
                          trends.reachTrend
                        }%`}
                        color={trends.reachTrend >= 0 ? "success" : "error"}
                        size="small"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Schedule color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Daily Limit</Typography>
                  </Box>
                  <Typography variant="h4" color="text.primary">
                    {usage.totalGenerations}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Generations used today
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(usage.totalGenerations / 50) * 100}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {50 - usage.totalGenerations} remaining
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            {/* Second Row - Content Breakdown and Status */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Content Breakdown (30 days)
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Box textAlign="center" p={2} sx={{ flex: 1 }}>
                      <Typography variant="h3" color="primary.main">
                        {last30Days.contentByType.blog_post}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Blog Posts
                      </Typography>
                    </Box>
                    <Box textAlign="center" p={2} sx={{ flex: 1 }}>
                      <Typography variant="h3" color="secondary.main">
                        {last30Days.contentByType.social_caption}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Social Captions
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Content Status (30 days)
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Box textAlign="center" p={1} sx={{ flex: 1 }}>
                      <Typography variant="h4" color="warning.main">
                        {last30Days.contentByStatus.draft}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Draft
                      </Typography>
                    </Box>
                    <Box textAlign="center" p={1} sx={{ flex: 1 }}>
                      <Typography variant="h4" color="info.main">
                        {last30Days.contentByStatus.scheduled}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Scheduled
                      </Typography>
                    </Box>
                    <Box textAlign="center" p={1} sx={{ flex: 1 }}>
                      <Typography variant="h4" color="success.main">
                        {last30Days.contentByStatus.posted}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Posted
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions>
                  <Button onClick={() => navigate("/content")}>
                    View All Content
                  </Button>
                </CardActions>
              </Card>
            </Stack>

            {/* Third Row - All-Time Statistics */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  All-Time Statistics
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
                  <Box textAlign="center" sx={{ flex: 1 }}>
                    <Typography variant="h3" color="primary.main">
                      {allTime.totalContent}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Total Content Created
                    </Typography>
                  </Box>
                  <Box textAlign="center" sx={{ flex: 1 }}>
                    <Typography variant="h3" color="secondary.main">
                      {allTime.totalReach.toLocaleString()}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Total Potential Reach
                    </Typography>
                  </Box>
                  <Box textAlign="center" sx={{ flex: 1 }}>
                    <Typography variant="h3" color="info.main">
                      {allTime.averageReachPerContent}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Avg. Reach Per Content
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions>
                <Button onClick={() => navigate("/reports")}>
                  View Detailed Reports
                </Button>
              </CardActions>
            </Card>
          </Stack>
        </>
      )}

      {/* Advanced Analytics Tab */}
      {activeTab === 1 && <AdvancedAnalytics />}

      {/* Performance Analytics Tab */}
      {activeTab === 2 && <PerformanceAnalytics />}
    </Container>
  );
};

export default Dashboard;
