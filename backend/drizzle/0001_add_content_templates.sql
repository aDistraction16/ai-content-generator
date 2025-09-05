CREATE TABLE content_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content_type VARCHAR(50) NOT NULL,
  platform_target VARCHAR(50) NOT NULL,
  template TEXT NOT NULL,
  variables TEXT DEFAULT '[]',
  is_public BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for performance
CREATE INDEX idx_content_templates_user_id ON content_templates(user_id);
CREATE INDEX idx_content_templates_public ON content_templates(is_public);
CREATE INDEX idx_content_templates_use_count ON content_templates(use_count);
CREATE INDEX idx_content_templates_content_type ON content_templates(content_type);
CREATE INDEX idx_content_templates_platform_target ON content_templates(platform_target);
