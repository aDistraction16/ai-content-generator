/**
 * AdvancedAnalytics component displays detailed analytics for content generation and scheduling.
 *
 * This component fetches and visualizes advanced analytics data, including:
 * - Overview statistics (total content, average reach, total reach, average word count)
 * - Content breakdown by type and platform
 * - Daily trends with bar charts for content count and reach
 * - Period comparison between current and previous timeframes
 * - Trend indicators for content and reach growth or decline
 *
 * Users can select the timeframe (last 7, 30, or 90 days) to update the analytics view.
 *
 * @component
 * @returns {JSX.Element} The rendered advanced analytics dashboard.
 *
 * @example
 * ```tsx
 * <AdvancedAnalytics />
 * ```
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  AdvancedAnalytics as AdvancedAnalyticsType,
  contentAPI,
} from "../../services/content";
import "./AdvancedAnalytics.css";

const AdvancedAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdvancedAnalyticsType | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("7");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contentAPI.getAdvancedAnalytics(timeframe);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError("Failed to load analytics data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-container">
        <div className="no-data">No analytics data available</div>
      </div>
    );
  }

  const formatTrend = (trend: number) => {
    if (trend > 0) return `+${trend.toFixed(1)}%`;
    if (trend < 0) return `${trend.toFixed(1)}%`;
    return "0%";
  };

  const getTrendClass = (trend: number) => {
    if (trend > 0) return "trend-positive";
    if (trend < 0) return "trend-negative";
    return "trend-neutral";
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Advanced Analytics</h2>
        <div className="timeframe-selector">
          <label htmlFor="timeframe">Time Period:</label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="stat-card">
          <h3>Total Content</h3>
          <div className="stat-value">{analytics.overview.total}</div>
          <div
            className={`trend ${getTrendClass(analytics.trends.contentTrend)}`}
          >
            {formatTrend(analytics.trends.contentTrend)}
          </div>
        </div>

        <div className="stat-card">
          <h3>Average Reach</h3>
          <div className="stat-value">
            {analytics.overview.avgReach.toLocaleString()}
          </div>
          <div
            className={`trend ${getTrendClass(analytics.trends.reachTrend)}`}
          >
            {formatTrend(analytics.trends.reachTrend)}
          </div>
        </div>

        <div className="stat-card">
          <h3>Total Reach</h3>
          <div className="stat-value">
            {analytics.overview.totalReach.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <h3>Avg Word Count</h3>
          <div className="stat-value">
            {Math.round(analytics.overview.avgWordCount)}
          </div>
        </div>
      </div>

      {/* Content by Type */}
      <div className="analytics-section">
        <h3>Content by Type & Platform</h3>
        <div className="content-types-grid">
          {analytics.contentByType.map((item, index) => (
            <div key={index} className="content-type-card">
              <div className="content-type-header">
                <strong>{item.contentType}</strong>
                <span className="platform-badge">{item.platformTarget}</span>
              </div>
              <div className="content-type-stats">
                <div>Count: {item.count}</div>
                <div>Avg Reach: {item.avgReach.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Trends Chart */}
      <div className="analytics-section">
        <h3>Daily Trends</h3>
        <div className="trends-chart">
          {analytics.dailyTrends.map((day, index) => (
            <div key={index} className="trend-bar">
              <div className="trend-date">
                {new Date(day.date).toLocaleDateString()}
              </div>
              <div className="trend-metrics">
                <div className="trend-content">
                  <div
                    className="bar content-bar"
                    style={{
                      height: `${
                        (day.count /
                          Math.max(
                            ...analytics.dailyTrends.map((d) => d.count)
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                  <span>{day.count}</span>
                </div>
                <div className="trend-reach">
                  <div
                    className="bar reach-bar"
                    style={{
                      height: `${
                        (day.totalReach /
                          Math.max(
                            ...analytics.dailyTrends.map((d) => d.totalReach)
                          )) *
                        100
                      }%`,
                    }}
                  ></div>
                  <span>{day.totalReach.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color content-bar"></div>
            <span>Content Count</span>
          </div>
          <div className="legend-item">
            <div className="legend-color reach-bar"></div>
            <span>Total Reach</span>
          </div>
        </div>
      </div>

      {/* Period Comparison */}
      <div className="analytics-section">
        <h3>Period Comparison</h3>
        <div className="comparison-grid">
          <div className="comparison-card">
            <h4>Current Period</h4>
            <div>Content: {analytics.periodComparison.current.total}</div>
            <div>
              Reach: {analytics.periodComparison.current.reach.toLocaleString()}
            </div>
          </div>
          <div className="comparison-card">
            <h4>Previous Period</h4>
            <div>Content: {analytics.periodComparison.previous.total}</div>
            <div>
              Reach:{" "}
              {analytics.periodComparison.previous.reach.toLocaleString()}
            </div>
          </div>
          <div className="comparison-card comparison-change">
            <h4>Change</h4>
            <div className={getTrendClass(analytics.trends.contentTrend)}>
              Content: {formatTrend(analytics.trends.contentTrend)}
            </div>
            <div className={getTrendClass(analytics.trends.reachTrend)}>
              Reach: {formatTrend(analytics.trends.reachTrend)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
