CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    reset_token VARCHAR(255),
    reset_token_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);


CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_name VARCHAR(150),
    description TEXT,
    image_url VARCHAR(255),
    category VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_upload_date (upload_date)
);


CREATE TABLE predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    predicted_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    api_used VARCHAR(100),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    INDEX idx_item_id (item_id),
    INDEX idx_prediction_date (prediction_date)
);


CREATE TABLE price_comparisons (
    comparison_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    platform_name VARCHAR(100),
    platform_price DECIMAL(10,2),
    listing_title VARCHAR(255),
    platform_url VARCHAR(255),
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    INDEX idx_item_id (item_id),
    INDEX idx_platform_name (platform_name)
);


CREATE TABLE api_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    api_name VARCHAR(100),
    request_url VARCHAR(255),
    response_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_name (api_name),
    INDEX idx_created_at (created_at)
);


CREATE TABLE feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating)
);


CREATE TABLE appraisal_items (
    appraisal_item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    item_condition VARCHAR(50), -- Excellent, Good, Fair, Poor
    estimated_price DECIMAL(10,2),
    image_url VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active', -- active, closed, reported, removed
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_is_public (is_public),
    INDEX idx_created_at (created_at)
);


CREATE TABLE appraisals (
    appraisal_id INT AUTO_INCREMENT PRIMARY KEY,
    appraisal_item_id INT NOT NULL,
    appraiser_id INT NOT NULL,
    estimated_price DECIMAL(10,2),
    comments TEXT,
    authenticity_rating INT CHECK (authenticity_rating BETWEEN 1 AND 5), -- 1=Likely Fake, 5=Authentic
    confidence_level VARCHAR(50), -- Low, Medium, High
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appraisal_item_id) REFERENCES appraisal_items(appraisal_item_id) ON DELETE CASCADE,
    FOREIGN KEY (appraiser_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_appraisal_item_id (appraisal_item_id),
    INDEX idx_appraiser_id (appraiser_id),
    UNIQUE KEY unique_appraiser_item (appraisal_item_id, appraiser_id) -- One appraisal per user per item
);


CREATE TABLE appraisal_notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appraisal_item_id INT,
    appraisal_id INT,
    notification_type VARCHAR(50), -- new_appraisal, item_reported, item_removed
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appraisal_item_id) REFERENCES appraisal_items(appraisal_item_id) ON DELETE CASCADE,
    FOREIGN KEY (appraisal_id) REFERENCES appraisals(appraisal_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read)
);


CREATE TABLE appraisal_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    appraisal_item_id INT,
    appraisal_id INT,
    report_type VARCHAR(50), -- inappropriate_content, spam, fake_item, other
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, action_taken, dismissed
    reviewed_by INT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appraisal_item_id) REFERENCES appraisal_items(appraisal_item_id) ON DELETE CASCADE,
    FOREIGN KEY (appraisal_id) REFERENCES appraisals(appraisal_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_reporter_id (reporter_id)
);

