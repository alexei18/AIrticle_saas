-- AIrticle SaaS Platform Database Schema
-- Rulează în phpMyAdmin sau MySQL Workbench
CREATE DATABASE IF NOT EXISTS semrush_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE semrush_saas;
-- Tabela utilizatori
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    plan_type ENUM('starter', 'professional', 'enterprise') DEFAULT 'starter',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP NULL,
    subscription_ends_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- Website-uri utilizatori
CREATE TABLE websites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    last_crawled_at TIMESTAMP NULL,
    crawl_status ENUM('pending', 'crawling', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Audit-uri website
CREATE TABLE website_audits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    website_id INT NOT NULL,
    audit_type ENUM('technical', 'content', 'performance', 'seo') NOT NULL,
    score DECIMAL(5, 2) DEFAULT NULL,
    issues_found INT DEFAULT 0,
    audit_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);
-- Keywords
CREATE TABLE keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    website_id INT NOT NULL,
    keyword VARCHAR(500) NOT NULL,
    search_volume INT DEFAULT NULL,
    difficulty_score DECIMAL(5, 2) DEFAULT NULL,
    current_position INT DEFAULT NULL,
    intent_type ENUM(
        'informational',
        'commercial',
        'transactional',
        'navigational'
    ) DEFAULT 'informational',
    is_tracking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);
-- Istoric poziții keywords
CREATE TABLE keyword_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword_id INT NOT NULL,
    position INT NOT NULL,
    search_engine ENUM('google', 'bing') DEFAULT 'google',
    device ENUM('desktop', 'mobile') DEFAULT 'desktop',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);
-- Articole generate
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    website_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    content LONGTEXT NOT NULL,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    target_keywords JSON,
    word_count INT DEFAULT 0,
    seo_score DECIMAL(5, 2) DEFAULT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Competitori
CREATE TABLE competitors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    website_id INT NOT NULL,
    competitor_domain VARCHAR(255) NOT NULL,
    competitor_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_analyzed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
);
-- Planuri abonament
CREATE TABLE subscription_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_type ENUM('starter', 'professional', 'enterprise') UNIQUE NOT NULL,
    max_websites INT NOT NULL,
    max_articles_per_month INT NOT NULL,
    max_keywords_tracking INT NOT NULL,
    max_competitors INT NOT NULL,
    price_monthly DECIMAL(10, 2) NOT NULL,
    features JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Date inițiale planuri
INSERT INTO subscription_plans
VALUES (
        1,
        'starter',
        3,
        25,
        500,
        5,
        79.00,
        '{"site_audit": true, "basic_competitor_analysis": true}',
        NOW()
    ),
    (
        2,
        'professional',
        15,
        100,
        2000,
        20,
        199.00,
        '{"white_label": true, "api_integration": true}',
        NOW()
    ),
    (
        3,
        'enterprise',
        999,
        500,
        999999,
        50,
        499.00,
        '{"unlimited": true, "custom_ai": true}',
        NOW()
    );
-- Indexuri pentru performanță
CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_keywords_website_id ON keywords(website_id);
CREATE INDEX idx_articles_website_id ON articles(website_id);
CREATE INDEX idx_competitors_website_id ON competitors(website_id);