import React, { useEffect, useState } from 'react';
import { ContentPerformance, contentAPI } from '../../services/content';
import './PerformanceAnalytics.css';

const PerformanceAnalytics: React.FC = () => {
  const [performance, setPerformance] = useState<ContentPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'performanceScore' | 'estimatedEngagements' | 'createdAt'>('performanceScore');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const data = await contentAPI.getContentPerformance();
        setPerformance(data);
        setError(null);
      } catch (err) {
        setError('Failed to load performance data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="performance-container">
        <div className="loading">Loading performance analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="performance-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="performance-container">
        <div className="no-data">No performance data available</div>
      </div>
    );
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#f56565';
  };

  const filteredContent = performance.contentScores
    .filter(content => {
      if (filterBy === 'all') return true;
      return getPerformanceLevel(content.performanceScore) === filterBy;
    })
    .sort((a, b) => {
      if (sortBy === 'performanceScore') return b.performanceScore - a.performanceScore;
      if (sortBy === 'estimatedEngagements') return b.estimatedEngagements - a.estimatedEngagements;
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

  return (
    <div className="performance-container">
      <div className="performance-header">
        <h2>Content Performance Analytics</h2>
        <div className="controls">
          <div className="control-group">
            <label htmlFor="sortBy">Sort by:</label>
            <select 
              id="sortBy"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="performanceScore">Performance Score</option>
              <option value="estimatedEngagements">Estimated Engagements</option>
              <option value="createdAt">Creation Date</option>
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="filterBy">Filter by:</label>
            <select 
              id="filterBy"
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value as any)}
            >
              <option value="all">All Content</option>
              <option value="high">High Performance (80+)</option>
              <option value="medium">Medium Performance (60-79)</option>
              <option value="low">Low Performance (0-59)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insights Summary */}
      <div className="insights-summary">
        <div className="insight-card">
          <h3>Average Score</h3>
          <div className="insight-value" style={{ color: getPerformanceColor(performance.insights.averageScore) }}>
            {performance.insights.averageScore.toFixed(1)}
          </div>
        </div>
        <div className="insight-card">
          <h3>Top Performers</h3>
          <div className="insight-value">{performance.insights.topPerformersCount}</div>
          <div className="insight-label">Content items scoring 80+</div>
        </div>
        <div className="insight-card">
          <h3>Needs Improvement</h3>
          <div className="insight-value">{performance.insights.needsImprovementCount}</div>
          <div className="insight-label">Content items scoring &lt;60</div>
        </div>
        {performance.insights.bestPerformingType && (
          <div className="insight-card">
            <h3>Best Content Type</h3>
            <div className="insight-value">{performance.insights.bestPerformingType.type}</div>
            <div className="insight-label">Avg: {performance.insights.bestPerformingType.averageScore.toFixed(1)}</div>
          </div>
        )}
        {performance.insights.bestPerformingPlatform && (
          <div className="insight-card">
            <h3>Best Platform</h3>
            <div className="insight-value">{performance.insights.bestPerformingPlatform.platform}</div>
            <div className="insight-label">Avg: {performance.insights.bestPerformingPlatform.averageScore.toFixed(1)}</div>
          </div>
        )}
      </div>

      {/* Content Performance List */}
      <div className="performance-list">
        <h3>Content Performance Details ({filteredContent.length} items)</h3>
        {filteredContent.length === 0 ? (
          <div className="no-results">No content matches the current filters</div>
        ) : (
          <div className="content-grid">
            {filteredContent.map((content) => (
              <div key={content.id} className="content-performance-card">
                <div className="card-header">
                  <div className="content-meta">
                    <span className="content-type">{content.contentType}</span>
                    <span className="platform-target">{content.platformTarget}</span>
                    <span className="content-status">{content.status}</span>
                  </div>
                  <div 
                    className="performance-score"
                    style={{ backgroundColor: getPerformanceColor(content.performanceScore) }}
                  >
                    {content.performanceScore.toFixed(0)}
                  </div>
                </div>

                <div className="content-preview">
                  <h4>{content.topic}</h4>
                  <p>{content.generatedText.substring(0, 150)}...</p>
                </div>

                <div className="performance-metrics">
                  <div className="metric">
                    <span className="metric-label">Est. Engagements</span>
                    <span className="metric-value">{content.estimatedEngagements.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Est. Clicks</span>
                    <span className="metric-value">{content.estimatedClicks.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Est. Shares</span>
                    <span className="metric-value">{content.estimatedShares.toLocaleString()}</span>
                  </div>
                </div>

                <div className="quality-factors">
                  <h5>Quality Factors</h5>
                  <div className="factors-grid">
                    <div className={`factor ${content.qualityFactors.hasHashtags ? 'positive' : 'negative'}`}>
                      <span>#{content.qualityFactors.hasHashtags ? '✓' : '✗'}</span>
                      <span>Hashtags</span>
                    </div>
                    <div className={`factor ${content.qualityFactors.hasQuestions ? 'positive' : 'negative'}`}>
                      <span>?{content.qualityFactors.hasQuestions ? '✓' : '✗'}</span>
                      <span>Questions</span>
                    </div>
                    <div className={`factor ${content.qualityFactors.hasCallToAction ? 'positive' : 'negative'}`}>
                      <span>!{content.qualityFactors.hasCallToAction ? '✓' : '✗'}</span>
                      <span>Call to Action</span>
                    </div>
                    <div className={`factor ${content.qualityFactors.hasEmojis ? 'positive' : 'negative'}`}>
                      <span>😊{content.qualityFactors.hasEmojis ? '✓' : '✗'}</span>
                      <span>Emojis</span>
                    </div>
                    <div className={`factor ${content.qualityFactors.optimalLength ? 'positive' : 'negative'}`}>
                      <span>📏{content.qualityFactors.optimalLength ? '✓' : '✗'}</span>
                      <span>Length</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <span className="created-date">
                    Created: {new Date(content.createdAt).toLocaleDateString()}
                  </span>
                  {content.scheduledAt && (
                    <span className="scheduled-date">
                      Scheduled: {new Date(content.scheduledAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
