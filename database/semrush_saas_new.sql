-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gazdă: 127.0.0.1
-- Timp de generare: aug. 15, 2025 la 05:28 PM
-- Versiune server: 10.4.32-MariaDB
-- Versiune PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Bază de date: `semrush_saas`
--

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('keyword_added','position_change','website_analyzed','report_generated','setting_changed','login','upgrade','alert') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `category` enum('seo','system','account','alert') NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `analyses`
--

CREATE TABLE `analyses` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `overall_score` decimal(5,2) DEFAULT NULL,
  `technical_report` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`technical_report`)),
  `content_report` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`content_report`)),
  `seo_report` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`seo_report`)),
  `recommendations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`recommendations`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `semrush_report` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`semrush_report`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `articles`
--

CREATE TABLE `articles` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `slug` varchar(500) NOT NULL,
  `content` longtext NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` varchar(500) DEFAULT NULL,
  `target_keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_keywords`)),
  `word_count` int(11) DEFAULT 0,
  `seo_score` decimal(5,2) DEFAULT NULL,
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `backlinks`
--

CREATE TABLE `backlinks` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `source_url` varchar(2048) NOT NULL,
  `source_domain` varchar(255) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `snippet` text DEFAULT NULL,
  `discovered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `content_gaps`
--

CREATE TABLE `content_gaps` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `competitors_ranking` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`competitors_ranking`)),
  `opportunity_score` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `crawled_pages`
--

CREATE TABLE `crawled_pages` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `url` varchar(2048) NOT NULL,
  `title` varchar(500) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `headings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`headings`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `seo_score` decimal(5,2) DEFAULT NULL,
  `issues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`issues`)),
  `suggestions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`suggestions`)),
  `ai_recommendations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ai_recommendations`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `google_analytics_connections`
--

CREATE TABLE `google_analytics_connections` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `ga_property_id` varchar(255) NOT NULL,
  `ga_view_id` varchar(255) DEFAULT NULL,
  `access_token` text DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_sync_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `google_analytics_data`
--

CREATE TABLE `google_analytics_data` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `sessions` int(11) DEFAULT 0,
  `users` int(11) DEFAULT 0,
  `page_views` int(11) DEFAULT 0,
  `bounce_rate` decimal(5,2) DEFAULT NULL,
  `avg_session_duration` int(11) DEFAULT NULL,
  `top_pages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`top_pages`)),
  `top_keywords` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`top_keywords`)),
  `device_breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`device_breakdown`)),
  `traffic_sources` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`traffic_sources`)),
  `conversions` int(11) DEFAULT 0,
  `conversion_rate` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `keywords`
--

CREATE TABLE `keywords` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `keyword` varchar(500) NOT NULL,
  `search_volume` int(11) DEFAULT NULL,
  `difficulty_score` decimal(5,2) DEFAULT NULL,
  `current_position` int(11) DEFAULT NULL,
  `intent_type` enum('informational','commercial','transactional','navigational') DEFAULT 'informational',
  `is_tracking` tinyint(1) DEFAULT 1,
  `enrichment_status` enum('pending','completed','failed') DEFAULT 'pending',
  `ai_trend_score` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `keyword_positions`
--

CREATE TABLE `keyword_positions` (
  `id` int(11) NOT NULL,
  `keyword_id` int(11) NOT NULL,
  `position` int(11) DEFAULT NULL,
  `search_volume` int(11) DEFAULT NULL,
  `traffic` int(11) DEFAULT 0,
  `click_through_rate` decimal(5,2) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `keyword_trends`
--

CREATE TABLE `keyword_trends` (
  `id` int(11) NOT NULL,
  `keyword_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `interest_score` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `notification_settings`
--

CREATE TABLE `notification_settings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `email_notifications` tinyint(1) DEFAULT 1,
  `keyword_alerts` tinyint(1) DEFAULT 1,
  `report_digest` tinyint(1) DEFAULT 0,
  `security_alerts` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `pricing_plans`
--

CREATE TABLE `pricing_plans` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `monthly_price` decimal(8,2) DEFAULT NULL,
  `yearly_price` decimal(8,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `is_popular` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `serp_snapshots`
--

CREATE TABLE `serp_snapshots` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `total_results` bigint(20) DEFAULT NULL,
  `organic_results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`organic_results`)),
  `related_questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`related_questions`)),
  `featured_snippet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`featured_snippet`)),
  `knowledge_graph` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`knowledge_graph`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `traffic_analytics`
--

CREATE TABLE `traffic_analytics` (
  `id` int(11) NOT NULL,
  `website_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `organic_traffic` int(11) DEFAULT 0,
  `paid_traffic` int(11) DEFAULT 0,
  `desktop_traffic` int(11) DEFAULT 0,
  `mobile_traffic` int(11) DEFAULT 0,
  `tablet_traffic` int(11) DEFAULT 0,
  `click_through_rate` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `plan_type` enum('starter','professional','enterprise') DEFAULT 'starter',
  `is_active` tinyint(1) DEFAULT 1,
  `email_verified` tinyint(1) DEFAULT 0,
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `subscription_ends_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `user_profiles`
--

CREATE TABLE `user_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `timezone` varchar(255) DEFAULT 'Europe/Bucharest',
  `language` varchar(255) DEFAULT 'ro',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structură tabel pentru tabel `websites`
--

CREATE TABLE `websites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `last_crawled_at` timestamp NULL DEFAULT NULL,
  `crawl_status` enum('pending','crawling','completed','failed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexuri pentru tabele eliminate
--

--
-- Indexuri pentru tabele `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `activities_user_id_created_at` (`user_id`,`created_at`),
  ADD KEY `activities_category_priority` (`category`,`priority`);

--
-- Indexuri pentru tabele `analyses`
--
ALTER TABLE `analyses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `website_id` (`website_id`);

--
-- Indexuri pentru tabele `articles`
--
ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_articles_website_id` (`website_id`);

--
-- Indexuri pentru tabele `backlinks`
--
ALTER TABLE `backlinks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `backlinks_website_id` (`website_id`);

--
-- Indexuri pentru tabele `content_gaps`
--
ALTER TABLE `content_gaps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `content_gaps_website_id_keyword` (`website_id`,`keyword`);

--
-- Indexuri pentru tabele `crawled_pages`
--
ALTER TABLE `crawled_pages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `website_id` (`website_id`);

--
-- Indexuri pentru tabele `google_analytics_connections`
--
ALTER TABLE `google_analytics_connections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_ga_connections_website_id` (`website_id`);

--
-- Indexuri pentru tabele `google_analytics_data`
--
ALTER TABLE `google_analytics_data`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_ga_data_website_date` (`website_id`,`date`);

--
-- Indexuri pentru tabele `keywords`
--
ALTER TABLE `keywords`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_keywords_website_id` (`website_id`);

--
-- Indexuri pentru tabele `keyword_positions`
--
ALTER TABLE `keyword_positions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `keyword_positions_keyword_id_recorded_at` (`keyword_id`,`recorded_at`);

--
-- Indexuri pentru tabele `keyword_trends`
--
ALTER TABLE `keyword_trends`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_keyword_date_trend` (`keyword_id`,`date`);

--
-- Indexuri pentru tabele `notification_settings`
--
ALTER TABLE `notification_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexuri pentru tabele `pricing_plans`
--
ALTER TABLE `pricing_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexuri pentru tabele `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexuri pentru tabele `serp_snapshots`
--
ALTER TABLE `serp_snapshots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `serp_snapshots_website_id_keyword` (`website_id`,`keyword`);

--
-- Indexuri pentru tabele `traffic_analytics`
--
ALTER TABLE `traffic_analytics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `traffic_analytics_website_id_date` (`website_id`,`date`),
  ADD KEY `traffic_analytics_date` (`date`);

--
-- Indexuri pentru tabele `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexuri pentru tabele `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexuri pentru tabele `websites`
--
ALTER TABLE `websites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_websites_user_id` (`user_id`);

--
-- AUTO_INCREMENT pentru tabele eliminate
--

--
-- AUTO_INCREMENT pentru tabele `activities`
--
ALTER TABLE `activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `analyses`
--
ALTER TABLE `analyses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `articles`
--
ALTER TABLE `articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `backlinks`
--
ALTER TABLE `backlinks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `content_gaps`
--
ALTER TABLE `content_gaps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `crawled_pages`
--
ALTER TABLE `crawled_pages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `google_analytics_connections`
--
ALTER TABLE `google_analytics_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `google_analytics_data`
--
ALTER TABLE `google_analytics_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `keywords`
--
ALTER TABLE `keywords`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `keyword_positions`
--
ALTER TABLE `keyword_positions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `keyword_trends`
--
ALTER TABLE `keyword_trends`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `notification_settings`
--
ALTER TABLE `notification_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `pricing_plans`
--
ALTER TABLE `pricing_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `serp_snapshots`
--
ALTER TABLE `serp_snapshots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `traffic_analytics`
--
ALTER TABLE `traffic_analytics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `user_profiles`
--
ALTER TABLE `user_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pentru tabele `websites`
--
ALTER TABLE `websites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constrângeri pentru tabele eliminate
--

--
-- Constrângeri pentru tabele `activities`
--
ALTER TABLE `activities`
  ADD CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `analyses`
--
ALTER TABLE `analyses`
  ADD CONSTRAINT `analyses_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `articles`
--
ALTER TABLE `articles`
  ADD CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `articles_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `backlinks`
--
ALTER TABLE `backlinks`
  ADD CONSTRAINT `backlinks_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `content_gaps`
--
ALTER TABLE `content_gaps`
  ADD CONSTRAINT `content_gaps_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `crawled_pages`
--
ALTER TABLE `crawled_pages`
  ADD CONSTRAINT `crawled_pages_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `google_analytics_connections`
--
ALTER TABLE `google_analytics_connections`
  ADD CONSTRAINT `google_analytics_connections_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `google_analytics_data`
--
ALTER TABLE `google_analytics_data`
  ADD CONSTRAINT `google_analytics_data_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `keywords`
--
ALTER TABLE `keywords`
  ADD CONSTRAINT `keywords_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `keyword_positions`
--
ALTER TABLE `keyword_positions`
  ADD CONSTRAINT `keyword_positions_ibfk_1` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `keyword_trends`
--
ALTER TABLE `keyword_trends`
  ADD CONSTRAINT `keyword_trends_ibfk_1` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `notification_settings`
--
ALTER TABLE `notification_settings`
  ADD CONSTRAINT `notification_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `serp_snapshots`
--
ALTER TABLE `serp_snapshots`
  ADD CONSTRAINT `serp_snapshots_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE;

--
-- Constrângeri pentru tabele `traffic_analytics`
--
ALTER TABLE `traffic_analytics`
  ADD CONSTRAINT `traffic_analytics_ibfk_1` FOREIGN KEY (`website_id`) REFERENCES `websites` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constrângeri pentru tabele `websites`
--
ALTER TABLE `websites`
  ADD CONSTRAINT `websites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
