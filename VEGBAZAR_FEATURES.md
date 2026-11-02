# VegBazar - Complete Feature Documentation

## Project Overview
VegBazar is a comprehensive e-commerce platform for selling fresh vegetables with advanced features like AI chat suggestions, wallet system, basket recommendations, order management, and multi-user admin roles.

**Version:** 0.0.2  
**Author:** Pritesh Patel  
**Tech Stack:** Node.js, Express, MongoDB (Mongoose), Razorpay Payment Gateway, Cloudinary, JWT, Nodemailer

---

## 🔐 Authentication & Authorization

### User Authentication (Simple - No Email Verification)
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/google` - Google OAuth authentication

### Admin Authentication (With Email Verification)
- **POST** `/api/auth/admin/register` - Admin registration
- **POST** `/api/auth/admin/login` - Admin login
- **GET** `/api/auth/verify-email/:token` - Email verification link
- **POST** `/api/auth/resend-verification` - Resend verification email

### Password Management
- **POST** `/api/auth/forgot-password` - Request password reset
- **POST** `/api/auth/reset-password/:token` - Reset password with token

### Token Management
- **POST** `/api/auth/refresh-token` - Refresh JWT token
- **POST** `/api/auth/logout` - User logout (protected)

### Profile Management
- **GET** `/api/auth/me` - Get current user (protected)
- **PUT** `/api/auth/profile` - Update profile (protected)
- **PATCH** `/api/auth/update-details` - Update user details (protected)
- **PUT** `/api/auth/change-password` - Change password (protected)

### Admin User Management
- **GET** `/api/auth/users` - Get all users (admin only)
- **PATCH** `/api/auth/users/:userId/status` - Update user status (admin only)
- **DELETE** `/api/auth/users/:userId` - Delete user (admin only)

**Rate Limiting Applied:**
- Auth Limiter: 10 requests/minute
- Registration Limiter: 5 requests/hour
- Password Reset Limiter: 3 requests/hour
- Email Verification Limiter: 3 requests/hour

---

## 🥬 Product Management (Vegetables)

### Public Routes
- **GET** `/api/vegetables` - Get all vegetables with filters/pagination
- **GET** `/api/vegetables/home/veg` - Homepage featured vegetables
- **GET** `/api/vegetables/:id` - Get vegetable details

### Sorting Routes
- **GET** `/api/vegetables/sort/price-low` - Sort by price ascending
- **GET** `/api/vegetables/sort/price-high` - Sort by price descending
- **GET** `/api/vegetables/sort/name-az` - Sort by name A-Z
- **GET** `/api/vegetables/sort/name-za` - Sort by name Z-A
- **GET** `/api/vegetables/sort/newest` - Sort by newest first
- **GET** `/api/vegetables/sort/oldest` - Sort by oldest first
- **GET** `/api/vegetables/sort/stock-high` - Sort by high stock
- **GET** `/api/vegetables/sort/stock-low` - Sort by low stock

### Filter Routes
- **GET** `/api/vegetables/featured` - Featured vegetables
- **GET** `/api/vegetables/popular` - Popular vegetables
- **GET** `/api/vegetables/random` - Random vegetables
- **GET** `/api/vegetables/in-stock` - In-stock vegetables
- **GET** `/api/vegetables/out-of-stock` - Out-of-stock vegetables
- **GET** `/api/vegetables/offers` - Vegetables with offers

### Pagination
- **GET** `/api/vegetables/page/:page` - Get vegetables by page
- **GET** `/api/vegetables/limit/:limit` - Get vegetables with limit

### Combined Routes
- **GET** `/api/vegetables/featured/sort/price-low` - Featured vegetables sorted by price
- **GET** `/api/vegetables/popular/in-stock` - Popular in-stock vegetables
- **GET** `/api/vegetables/offers/sort/price-high` - Offers sorted by high price

### Admin Routes (Protected)
- **POST** `/api/vegetables/add` - Add new vegetable
- **PUT** `/api/vegetables/:id` - Update vegetable
- **PATCH** `/api/vegetables/:id` - Partial update vegetable
- **DELETE** `/api/vegetables/:id` - Delete vegetable

**Vegetable Properties:** name, prices (weight-based), stock, featured flag, popular flag, offers, images

---

## 🛒 Shopping Cart

### Core Cart Operations (All Protected)
- **GET** `/api/cart` - Get current user's cart
- **POST** `/api/cart/add` - Add item to cart
- **PUT** `/api/cart/update` - Update cart item quantity/price
- **DELETE** `/api/cart/remove` - Remove item from cart
- **DELETE** `/api/cart/clear` - Clear entire cart

### Coupon Management
- **POST** `/api/cart/coupon/apply` - Apply coupon to cart
- **DELETE** `/api/cart/coupon` - Remove coupon from cart

### Cart Features
- **GET** `/api/cart/recommendations` - Get recommendations based on cart
- **GET** `/api/cart/analytics` - Get cart analytics
- **POST** `/api/cart/merge` - Merge guest cart with user cart

---

## 🧺 Basket Recommendations

### Public Routes
- **GET** `/api/baskets` - Get all baskets
- **GET** `/api/baskets/top-baskets/suggestion` - Get top 3 baskets
- **GET** `/api/baskets/all/baskets-click` - Get baskets sorted by clicks
- **GET** `/api/baskets/:_id` - Get basket details
- **POST** `/api/baskets/click/:_id` - Increment basket click count

### Admin Routes (Protected)
- **POST** `/api/baskets/add` - Create new basket
- **PATCH** `/api/baskets/:_id` - Update basket
- **DELETE** `/api/baskets/:_id` - Delete basket

**Use Case:** Pre-configured vegetable bundles for quick purchase

---

## 💳 Payment & Orders

### Order Creation & Verification
- **POST** `/api/orders/create-order` - Create new order (protected)
- **POST** `/api/orders/verify-payment` - Verify Razorpay payment (protected)

### Order Retrieval
- **GET** `/api/orders/:orderId` - Get order details (protected)
- **GET** `/api/orders/all` - Get all orders (admin/editor/packaging/delivery)

### Order Filtering
- **GET** `/api/orders/status/:status` - Get orders by status
- **GET** `/api/orders/statuses/multiple` - Get orders by multiple statuses
- **GET` `/api/orders/date-range` - Get orders in date range

### Order Management
- **PATCH** `/api/orders/:_id/status` - Update order status
- **PATCH** `/api/orders/:id` - Update order (admin only)
- **DELETE** `/api/orders/:id` - Delete order (admin only)

### Payment & Analytics
- **GET** `/api/orders/get-key` - Get Razorpay public key
- **POST** `/api/orders/calculate-price` - Calculate order total
- **GET** `/api/orders/today/total` - Today's order total
- **GET** `/api/orders/stats/status` - Order status statistics
- **POST** `/api/orders/validate-coupon-basket` - Validate coupon

**Payment Gateway:** Razorpay  
**Order Statuses:** pending, processing, packed, shipped, delivered, cancelled

---

## 🎟️ Coupons & Discounts

### Public Routes
- **GET** `/api/coupons` - Get all active coupons
- **GET** `/api/coupons/:id` - Get coupon details
- **POST** `/api/coupons/validate` - Validate coupon code
- **POST** `/api/coupons/apply` - Apply coupon

### Admin Routes (Protected)
- **POST** `/api/coupons` - Create new coupon
- **PATCH** `/api/coupons/:id` - Update coupon
- **DELETE** `/api/coupons/:id` - Delete coupon

**Coupon Features:** code, discount percentage/fixed amount, expiry date, usage limits, applicable categories

---

## 💰 Wallet System

### User Wallet Routes (Protected)
- **GET** `/api/wallet` - Get wallet details
- **POST** `/api/wallet` - Create wallet
- **GET** `/api/wallet/transactions` - Get transaction history
- **GET** `/api/wallet/balance` - Check wallet balance

### Admin Wallet Management (Protected)
- **POST** `/api/wallet/credit` - Credit amount to wallet
- **POST** `/api/wallet/debit` - Debit amount from wallet
- **PATCH** `/api/wallet/:walletId/status` - Update wallet status
- **POST** `/api/wallet/transactions/:transactionId/reverse` - Reverse transaction
- **GET** `/api/wallet/stats` - Wallet statistics

**Features:** Balance tracking, transaction history, credit/debit operations, transaction reversal

---

## 📍 Address Management

### User Address Routes (Protected)
- **GET** `/api/addresses` - Get addresses with filters
- **GET** `/api/addresses/all` - Get all user addresses
- **GET** `/api/addresses/active` - Get active addresses
- **GET** `/api/addresses/user/:userId` - Get specific user's addresses
- **POST** `/api/addresses/add` - Add new address
- **PUT** `/api/addresses/:addressId` - Update address
- **DELETE** `/api/addresses/:addressId` - Delete address
- **PUT** `/api/addresses/:addressId/default` - Set default address
- **GET** `/api/addresses/:addressId/delivery-charges` - Calculate delivery charges
- **PUT** `/api/addresses/:addressId/location` - Update address location

### Admin Address Routes (Protected)
- **GET** `/api/addresses/analytics/overview` - Address analytics
- **GET** `/api/addresses/admin/nearby` - Get nearby addresses

### Advanced Features
- **GET** `/api/addresses/search/autocomplete` - Autocomplete address search
- **POST** `/api/addresses/route/optimize` - Optimize delivery routes

**Features:** Multiple addresses per user, default address, delivery charge calculation, geolocation support

---

## 🧾 Invoice Management

### User Routes (Protected)
- **POST** `/api/invoice` - Generate invoice for order
- **GET** `/api/invoice/pdf` - Get invoice PDF

### Admin Routes (Protected)
- **POST** `/api/invoice/bulk-process` - Process bulk invoices
- **GET** `/api/invoice/analytics` - Invoice analytics
- **POST** `/api/invoice/retry-emails` - Retry failed invoice emails

**Features:** PDF generation, email delivery, bulk processing, analytics tracking

---

## 📊 Reports & Analytics

### Revenue Reports
- **GET** `/api/reports/revenue` - Total revenue (excluding cancelled orders)
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  
- **GET** `/api/reports/daily-excel` - Daily order report (Excel export)
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  
- **GET** `/api/reports/stats` - Report statistics
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  
- **GET** `/api/reports/cancelled` - Cancelled orders report
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  
- **GET** `/api/reports/comparison` - Revenue comparison (active vs cancelled)
  - Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Order Reports
- **GET** `/api/reports` - All order reports

**Features:** Revenue tracking, Excel export, date-range filtering, cancellation analysis

---

## 🗣️ Testimonials & Reviews

### Public Routes
- **POST** `/api/testimonials` - Create testimonial
- **GET** `/api/testimonials/published` - Get published testimonials

### Admin Routes (Protected)
- **GET** `/api/testimonials` - Get all testimonials
- **GET** `/api/testimonials/stats` - Testimonial statistics
- **GET** `/api/testimonials/:id` - Get testimonial details
- **PATCH** `/api/testimonials/:id` - Update/approve testimonial
- **DELETE** `/api/testimonials/:id` - Delete testimonial

**Features:** Customer reviews, approval workflow, published/unpublished status, ratings

---

## 🤖 AI Features

### AI Chat Routes
- **GET** `/api/ai/suggestions` - Get AI chat suggestions
- **POST** `/api/ai/chat` - Create AI chat completion

**Features:** Product recommendations, customer support, smart suggestions powered by AI

---

## 📞 OTP & Verification

### OTP Routes (Rate Limited)
- **POST** `/api/otp/send` - Send OTP to phone/email
- **POST** `/api/otp/verify` - Verify OTP
- **POST** `/api/otp/resend` - Resend OTP

**Rate Limiting:** Sensitive limiter applied (adjustable frequency)

---

## 👤 User Management

### User Info Routes (Protected)
- **GET** `/api/user/me` - Get current user profile
- **GET** `/api/user/order-history` - Get user's order history
- **GET** `/api/user/:userId/order-history` - Get specific user's order history
- **GET** `/api/user/addresses` - Get user's addresses

---

## 🏙️ City Management

### Public Routes
- **GET** `/api/cities` - Get all cities

### Admin Routes (Protected)
- **POST** `/api/cities/add` - Add new city
- **PATCH** `/api/cities/:id` - Update city
- **DELETE** `/api/cities/:id` - Delete city

**Features:** City-based delivery, multi-city support

---

## 📤 Export & Data Management

### Export Routes
- **GET** `/api/export` - Export data (vegetables, orders, users)
- **GET** `/api/export/daily-excel` - Export daily sales report
- **GET** `/api/export/users` - Export user data

**Supported Formats:** Excel (.xlsx), PDF (for reports)

---

## 🏥 Health Check

- **GET** `/health` - API health status
  - Returns: status, timestamp, uptime

---

## 🔧 Middleware & Security

### Authentication Middleware
- **verifyJWT** - Verify JWT token in Authorization header
- **isAdmin** - Check if user has admin role
- **optionalAuth** - Optional authentication

### Authorization Roles
- **Admin** - Full system access
- **Editor** - Content and order management
- **Packaging** - Order packing and fulfillment
- **Delivery Partner** - Delivery management

### Rate Limiting
- **General Limiter** - Standard API requests
- **Sensitive Limiter** - Authentication, OTP endpoints
- **Major Limiter** - Critical operations

### Other Middleware
- **Multer** - File upload handling
- **CORS** - Cross-Origin Resource Sharing
- **Cookie Parser** - Parse cookies
- **Body Parser** - Parse JSON/URL-encoded bodies

---

## 🗄️ Database Models

### User Model
- Email, password, phone, name
- Profile picture, addresses
- Role (user/admin/editor/packaging/delivery_partner)
- Status (active/inactive)
- Created/updated timestamps

### Vegetable Model
- Name, description, images
- Prices (weight-based: 500g, 1kg, 2kg, 5kg)
- Stock quantity, category
- Featured, popular, offer flags
- Ratings, reviews

### Order Model
- User reference, items, quantities
- Status tracking, total amount
- Payment details (Razorpay transaction ID)
- Delivery address, tracking info
- Coupon applied, discount amount

### Cart Model
- User reference, items
- Quantities, prices
- Applied coupon
- Total amount with/without discount

### Basket Model
- Name, description, items
- Price, image
- Click count, popularity metrics

### Wallet Model
- User reference, balance
- Transaction history
- Status (active/frozen)

### Coupon Model
- Code, discount percentage/fixed
- Validity dates, usage limits
- Applicable categories/items

### Address Model
- User reference, type (home/office/other)
- Street, city, postal code, country
- Latitude/longitude for geolocation
- Default flag, delivery charges

### Testimonial Model
- User reference, rating, comment
- Published status
- Created/updated timestamps

### Invoice Model
- Order reference, items details
- Total amount, tax
- Email status, PDF URL

### City Model
- City name, state, country
- Delivery charges, status

### WalletTransaction Model
- Wallet reference, type (credit/debit)
- Amount, balance before/after
- Description, reference ID
- Created timestamp

---

## 🚀 Key Features Summary

| Feature | Status | Details |
|---------|--------|---------|
| **User Authentication** | ✅ | JWT-based with Google OAuth |
| **Admin Panel** | ✅ | Multi-role authorization system |
| **Product Catalog** | ✅ | Advanced filtering & sorting |
| **Shopping Cart** | ✅ | Add/remove items, coupon support |
| **Basket System** | ✅ | Pre-configured bundles |
| **Wallet** | ✅ | Balance tracking, transactions |
| **Payment Gateway** | ✅ | Razorpay integration |
| **Orders** | ✅ | Full lifecycle management |
| **Coupons** | ✅ | Discount codes with limits |
| **Addresses** | ✅ | Multiple addresses, geolocation |
| **Invoices** | ✅ | PDF generation & email |
| **Reports** | ✅ | Revenue, daily, analytics |
| **Testimonials** | ✅ | Customer reviews with approval |
| **AI Chat** | ✅ | Smart recommendations |
| **OTP** | ✅ | Phone/email verification |
| **Export** | ✅ | Excel data export |

---

## 📝 Configuration

### Environment Variables Required
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret
- `CLOUDINARY_NAME` - Cloudinary account
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary secret
- `NODEMAILER_EMAIL` - Email sender address
- `NODEMAILER_PASSWORD` - Email password
- `GOOGLE_CLIENT_ID` - Google OAuth client ID

### Database Configuration
- **Name:** VegBazar_1
- **ODM:** Mongoose 8.6.3
- **Provider:** MongoDB

### Delivery Charges
- **Default:** ₹20 (2000 paise)

---

## 📦 Dependencies

### Core
- **express** ^4.22.1 - Web framework
- **mongoose** ^8.6.3 - MongoDB ODM
- **jsonwebtoken** ^9.0.2 - JWT handling
- **bcryptjs** ^3.0.2 - Password hashing

### Payment & Services
- **razorpay** ^2.9.6 - Payment gateway
- **cloudinary** ^2.7.0 - Image storage
- **nodemailer** ^9.0.3 - Email service

### Utilities
- **express-rate-limit** ^8.2.1 - Rate limiting
- **multer** ^2.0.2 - File upload
- **exceljs** ^3.4.0 - Excel export
- **pdfkit** ^0.17.2 - PDF generation
- **cors** ^2.8.5 - CORS handling
- **cookie-parser** ^1.4.6 - Cookie parsing

---

## 🔗 API Base URL

**Production:** `https://api.vegbazar.cloud`  
**Staging:** `https://staging.vegbazar.cloud`  
**Development:** `http://localhost:3000`

---

## 📋 Allowed Origins

- https://admin.vegbazar.cloud
- https://vegbazar.store
- http://localhost:5173

---

## 🛡️ Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on sensitive endpoints
- ✅ CORS protection
- ✅ Role-based access control
- ✅ Email verification for admins
- ✅ OTP verification
- ✅ Secure payment processing (Razorpay)
- ✅ File upload validation (Multer)

---

## 📞 Support & Contact

**Author:** Pritesh Patel  
**Version:** 0.0.2  
**License:** ISC

---

*Last Updated: 2025*  
*For API documentation and integration guides, refer to individual route files in `/src/routes/`*
