# Team 6

## Project Name: **Worthify**

**Group No. 6:** Kunj Patel, Ria Gardharia, Amisha Patel  

---

## 1. Website Conceptualization

### **Theme**
The website combines computer vision, machine learning, and web technologies to build a platform for predicting antique prices. Antiques have a distinct value because of their rarity, historical significance, and condition. This website allows users to upload photos of their antiques and receive price estimates, benefiting both casual collectors and professional dealers.

### **Mission Statement**
Our objective is to make antique appraisal accessible, clear, and technologically advanced. The website's goal is to eliminate uncertainty in antique pricing by leveraging picture recognition, market data, and predictive modeling, while also providing customers with fast, reliable, and user-friendly insights.

---

## 2. Target Users

### **User Group 1: Antique Collectors**
**Demographics and Interests:**  
Individuals aged 25–60 who are interested in art, vintage furniture, coins, and historical items. Many are middle-class professionals who collect antiques as a hobby or investment.

- **Needs:** Quick and reliable estimates of item worth to make informed buying or selling decisions.  
- **Support:** The website provides immediate predictions, historical trends, and easy item management.

---

### **User Group 2: Antique Dealers & Auction Houses**
**Demographics and Interests:**  
Professionals or small enterprises aged 30–65 that operate physical or online stores. They rely on accurate pricing in sales, acquisitions, and auctions.

- **Needs:** Tools to quickly assess potential inventory and evaluate trends in customer interest.  
- **Support:** The site allows bulk uploads, generates consistent valuation ranges, and provides market trend reports.

---

### **User Group 3: Casual Sellers & Estate Managers**
**Demographics and Interests:**  
Individuals (typically over age 35) who have inherited items or are clearing estates. They are not experts but wish to avoid being underpaid.

- **Needs:** A trustworthy way to determine whether an item is valuable before selling or discarding it.  
- **Support:** The site provides a simple upload-and-predict workflow, explanations of predicted value, and suggestions on where to sell.

---

## 3. Main Functionalities

### ➤ **User Authentication (JWT-based)**
- Secure registration/login with role-based access (collectors, dealers, admins).  
- Supports account customization and saved predictions.

### ➤ **Antique Image Upload**
- Users can upload one or multiple high-resolution images of an antique item.  
- Backend performs preprocessing for analysis.

### ➤ **Price Prediction Engine**
- Core ML model analyzes the uploaded image and predicts estimated market value.  
- Provides a price range with confidence level.

### ➤ **Market Trend Analysis Dashboard**
- Users can view pricing trends for categories (e.g., vintage watches, furniture, artwork).  
- Dealers can use insights for investment decisions.

### ➤ **Saved Items & History**
- Users can track predictions of previously uploaded antiques.  
- Compare current vs. past valuations to measure appreciation/depreciation.

### ➤ **Community Rating & Feedback**
- Users can provide feedback on prediction accuracy.  
- Helps refine the model by comparing user-provided actual sale values.

### ➤ **Educational Resources**
- Articles, guides, and FAQs explaining how antiques are priced.  
- Supports casual users in understanding why their item is valued within a certain range.

### ➤ **Admin Panel**
- Admins can manage users, review flagged content, and monitor system performance.
- Access to analytics about prediction usage and model performance.

### ➤ **Content Moderation System**
- Users can report inappropriate appraisal items or appraisals.
- Admins can review reports, take actions (remove items/appraisals), and manage content status.
- Real-time moderation statistics dashboard for monitoring platform health.
- Automated notifications to users when their content is moderated.

---

### **Alignment with Mission & Needs**
- Collectors get fast and accurate insights.  
- Dealers benefit from consistent bulk predictions and market analysis.  
- Casual sellers gain easy, non-technical access to valuation.

---

### **Unique Selling Points (USPs)**
- AI-powered image-based antique valuation.  
- Combines prediction with market trend insights.  
- Community feedback loop improves accuracy over time.

---

## 4. Preliminary Development Plan

### **Phase 1: Research & Analysis**
- Conduct surveys with collectors, dealers, and casual sellers to refine user needs.  
- Study competitor platforms (e.g., eBay sold listings, antique appraisal sites).  
- Identify key factors (condition, rarity, provenance) influencing antique pricing.

---

### **Phase 2: Design**
**UI/UX Considerations:**
- Clean, minimalist interface for easy navigation.  
- Accessible design (WCAG-compliant for vision-impaired users).  
- Mobile-responsive layout for smartphone users.

**Wireframes & Mockups:**
- Landing page with clear call-to-action (“Upload Your Antique”).  
- Dashboard for predictions and trends.  
- Admin console for management.

---

### **Phase 3: Development**
**Front-End (React.js)**
- Components for image upload, dashboard charts, and authentication forms.  
- Responsive styling with CSS frameworks (TailwindCSS/Bootstrap).

**Back-End (Node.js + Express)**
- REST APIs for authentication, prediction requests, and database queries.  
- Middleware for JWT-based authentication and authorization.

**Database (MySQL)**
- Tables for users, uploaded antiques, prediction history, and market trends.

**Machine Learning Integration**
- Model hosted separately (Python/Flask microservice or TensorFlow.js integration).  
- Node.js communicates with model API for predictions.

---

### **Phase 4: Testing**
- **Usability Testing:** Ensure workflows are intuitive.  
- **Performance Testing:** Handle high-resolution image uploads efficiently.  
- **Security Testing:** Validate JWT authentication, prevent SQL injection, and ensure HTTPS connections.  
- **Accuracy Testing:** Benchmark model predictions against expert valuations.

---

### **Phase 5: Launch & Maintenance**
**Launch Strategy:**
- Beta release to small collector groups.  
- Gather feedback to improve model accuracy and UI.

**Ongoing Updates:**
- Periodic model retraining using new data from user feedback.  
- Regular bug fixes, feature updates, and security patches.  
- Expansion to global markets with multi-language support.


## Local Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

### Database Setup

#### 1. Install MySQL
Ensure MySQL is installed and running on your machine.

#### 2. Create Database
Open MySQL command line or MySQL Workbench and run:
```sql
CREATE DATABASE antique_predictor;
```

#### 3. Run Database Migrations
Execute the following SQL scripts in order to create all required tables:

```sql
USE antique_predictor;

-- Create users table
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  reset_token VARCHAR(255),
  token_expiry DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
CREATE TABLE items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  item_name VARCHAR(150),
  description TEXT,
  image_url VARCHAR(255),
  category VARCHAR(100),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create predictions table
CREATE TABLE predictions (
  prediction_id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT,
  predicted_price DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  api_used VARCHAR(100),
  prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

-- Create price_comparisons table
CREATE TABLE price_comparisons (
  comparison_id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT,
  platform_name VARCHAR(100),
  platform_price DECIMAL(10,2),
  platform_url VARCHAR(255),
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

-- Create api_logs table
CREATE TABLE api_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  api_name VARCHAR(100),
  request_url VARCHAR(255),
  response_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feedback table
CREATE TABLE feedback (
  feedback_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  message TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create appraisal items table
CREATE TABLE appraisal_items (
  appraisal_item_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  image_url VARCHAR(500),
  status ENUM('active', 'closed', 'reported', 'removed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create appraisals table
CREATE TABLE appraisals (
  appraisal_id INT AUTO_INCREMENT PRIMARY KEY,
  appraisal_item_id INT NOT NULL,
  appraiser_id INT NOT NULL,
  estimated_price DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appraisal_item_id) REFERENCES appraisal_items(appraisal_item_id) ON DELETE CASCADE,
  FOREIGN KEY (appraiser_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create appraisal reports table
CREATE TABLE appraisal_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  appraisal_item_id INT,
  appraisal_id INT,
  report_type VARCHAR(100) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'reviewed', 'action_taken', 'dismissed') DEFAULT 'pending',
  reviewed_by INT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (appraisal_item_id) REFERENCES appraisal_items(appraisal_item_id) ON DELETE CASCADE,
  FOREIGN KEY (appraisal_id) REFERENCES appraisals(appraisal_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Create appraisal notifications table
CREATE TABLE appraisal_notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  appraisal_item_id INT,
  appraisal_id INT,
  notification_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (appraisal_item_id) REFERENCES appraisal_items(appraisal_item_id) ON DELETE CASCADE,
  FOREIGN KEY (appraisal_id) REFERENCES appraisals(appraisal_id) ON DELETE CASCADE
);
```

### Backend Setup

#### 1. Navigate to Backend Directory
```bash
cd backend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Create a `.env` file in the `backend` directory by copying `.env.example`:
```bash
cp .env.example .env
```

Edit the `.env` file with your actual configuration:
```
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=antique_predictor
DB_PORT=3306

# JWT Secret (change this to a secure random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Image Analysis API (Optional - for future ML integration)
VISION_API_KEY=your_vision_api_key

# Marketplace API Keys (Optional - for price comparison features)
EBAY_APP_ID=your_ebay_app_id
EBAY_CERT_ID=your_ebay_cert_id
ETSY_API_KEY=your_etsy_api_key

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

#### 4. Create Uploads Directory
```bash
mkdir uploads
```

#### 5. Start Backend Server
For development with auto-reload:
```bash
npm run dev
```

For production:
```bash
npm start
```

The backend API will be available at `http://localhost:5000`

### Frontend Setup

#### 1. Navigate to Frontend Directory
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment (Optional)
If needed, create a `.env` file in the `frontend` directory:
```
REACT_APP_API_URL=http://localhost:5000
```

Note: The frontend is already configured to proxy API requests to `http://localhost:5002` via package.json. Update the `proxy` field in `package.json` if your backend runs on a different port.

#### 4. Start Frontend Development Server
```bash
npm start
```

The frontend application will open automatically at `http://localhost:3000`

### Verify Installation

1. **Backend Health Check**: Visit `http://localhost:5000` in your browser. You should see:
```json
{
  "message": "Antique Price Predictor API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "items": "/api/items",
    "prices": "/api/prices",
    "users": "/api/users"
  }
}
```

2. **Frontend**: Visit `http://localhost:3000` to access the application interface.

3. **Database Connection**: Check the backend terminal for:
```
✓ Database connected successfully
🚀 Server running on port 5000
```

### Troubleshooting

**Database Connection Issues:**
- Verify MySQL is running: `mysql -u root -p`
- Check database exists: `SHOW DATABASES;`
- Verify credentials in `.env` file

**Port Already in Use:**
- Change PORT in backend `.env` file
- Update proxy in frontend `package.json`

**Module Not Found:**
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`

### Available API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

#### Items & Predictions
- `GET /api/items` - Get user's items
- `POST /api/items` - Upload new item
- `GET /api/prices` - Get price predictions

#### User Management
- `GET /api/users/profile` - Get user profile
- `GET /api/users` - Get all users (Admin only)
- `PUT /api/users/:id/role` - Update user role (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

#### Appraisal Items
- `GET /api/appraisals/items/public` - Get public appraisal items
- `GET /api/appraisals/items/:id` - Get appraisal item by ID
- `POST /api/appraisals/items` - Create new appraisal item (Authenticated)
- `GET /api/appraisals/items/my/all` - Get user's appraisal items (Authenticated)
- `PUT /api/appraisals/items/:id` - Update appraisal item (Authenticated)
- `DELETE /api/appraisals/items/:id` - Delete appraisal item (Authenticated)

#### Appraisals
- `GET /api/appraisals/items/:appraisal_item_id/appraisals` - Get appraisals for an item
- `POST /api/appraisals/appraisals` - Create new appraisal (Authenticated)
- `GET /api/appraisals/appraisals/my/all` - Get user's appraisals (Authenticated)
- `PUT /api/appraisals/appraisals/:id` - Update appraisal (Authenticated)
- `DELETE /api/appraisals/appraisals/:id` - Delete appraisal (Authenticated)

#### Notifications
- `GET /api/appraisals/notifications` - Get user notifications (Authenticated)
- `GET /api/appraisals/notifications/unread/count` - Get unread count (Authenticated)
- `PUT /api/appraisals/notifications/:id/read` - Mark notification as read (Authenticated)
- `PUT /api/appraisals/notifications/read-all` - Mark all as read (Authenticated)
- `DELETE /api/appraisals/notifications/:id` - Delete notification (Authenticated)

#### Content Moderation
- `POST /api/appraisals/reports` - Create a report (Authenticated)
- `GET /api/appraisals/admin/reports` - Get all reports (Admin only)
- `PUT /api/appraisals/admin/reports/:id/review` - Review a report (Admin only)
- `GET /api/appraisals/admin/items` - Get all items for moderation (Admin only)
- `PUT /api/appraisals/admin/items/:id/status` - Update item status (Admin only)
- `GET /api/appraisals/admin/stats` - Get moderation statistics (Admin only)

#### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - Get all feedback (Admin only)

### New Features Added

#### Content Moderation System
A comprehensive content moderation system has been added to allow admins to manage user-reported content:

**Frontend:**
- **Moderation Page** (`/moderation`) - Admin-only page with three tabs:
  - **Statistics Tab**: Real-time dashboard showing pending reports, reported items, active items, removed items, and total appraisals
  - **Reports Tab**: View and manage user reports with filtering by status (pending/reviewed/action_taken/dismissed)
  - **Items Tab**: View and manage all appraisal items with status updates

**Backend:**
- **Moderation Controller** (`backend/controllers/moderationController.js`):
  - Report creation and management
  - Item status updates
  - Automated user notifications when content is moderated
  - Statistics dashboard for monitoring

**Database Tables:**
- `appraisal_items` - Stores items submitted for appraisal
- `appraisals` - Stores user appraisals/valuations
- `appraisal_reports` - Stores user reports about inappropriate content
- `appraisal_notifications` - Stores notifications sent to users

**Access:**
- Navigate to Admin Panel at `/admin`
- Click "Go to Content Moderation" button
- Only accessible to users with admin role

### Updated User Roles
The system now supports role-based access control:
- **user**: Regular users can create appraisals, report content, and manage their own items
- **admin**: Admins have all user permissions plus access to admin panel, moderation system, and user management
