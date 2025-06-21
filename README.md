# StreamerStash API

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

The official backend API for **StreamerStash.com**, a marketplace for high-quality digital assets for streamers, creators, and artists.

---

<br>

### **Table of Contents**

1.  [About The Project](#about-the-project)
2.  [Tech Stack](#tech-stack)
3.  [Features Implemented](#features-implemented-mvp)
4.  [Future Plans](#future-plans)
5.  [Getting Started](#getting-started)
6.  [API Endpoint Documentation](#api-endpoint-documentation)
7.  [License](#license)

---

## About The Project

StreamerStash is a marketplace for high-quality digital assets tailored for streamers on platforms like Twitch, YouTube, and more. It provides a platform where talented artists can sell their unique designs—such as UI overlays, emotes, and branding kits—directly to the creator community.

This repository contains the Node.js backend that powers the platform. It's built to be scalable, secure, and ready for a modern frontend application, handling everything from user management and product uploads to secure payments.

## Tech Stack

-   **Backend:** Node.js, Express.js
-   **Database:** AWS DynamoDB (NoSQL)
-   **File Storage:** AWS S3 (for digital assets and preview images)
-   **Payments:** Stripe
-   **Authentication:** JSON Web Tokens (JWT)
-   **Security:** `bcryptjs` for password hashing

## Features Implemented (MVP)

The current version (`v0.2.0`) includes the complete Minimum Viable Product functionality.

✔️ **User Authentication & Authorization**
-   Secure user registration and login.
-   JWT-based session management.
-   Role-based access control (`customer`, `artist`, `admin`).
-   Protected routes and user profile fetching.

✔️ **Product & Asset Management**
-   Full CRUD API for managing product metadata.
-   Secure file upload system using pre-signed URLs for direct client-to-S3 uploads.
-   Support for a main product asset and multiple preview images per product.

✔️ **E-Commerce Logic**
-   Fully functional shopping cart API (add, view, remove items).
-   Order creation system that converts a user's cart into a permanent order record.

✔️ **Payment Processing**
-   Stripe integration for creating payment intents.
-   Secure webhook endpoint to confirm successful payments and update order status.

## Future Plans

While the core MVP is complete, the following features are planned for future development to enhance the platform:

-   **Artist & Admin Dashboards:**
    -   Dedicated API endpoints for artists to view their sales analytics and manage their products.
    -   Admin endpoints for user management, product approval workflows, and site-wide reporting.
-   **Advanced User Features:**
    -   Secure password reset functionality (e.g., via email link).
    -   Endpoints for users to update their own profile information.
-   **Social Authentication:**
    -   Integration with OAuth providers like Twitch and Google for alternative sign-in methods.
-   **Testing:**
    -   Implementation of a comprehensive testing suite (unit, integration, and end-to-end tests) to ensure code quality and reliability.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm
-   AWS CLI installed and configured with an IAM user.

### Installation

1.  **Clone the repo**
    ```
    git clone https://github.com/kerem-sirin/streamerstash-api.git
    ```
2.  **Change Directory and Install NPM packages**
    ```
    cd streamerstash-api
    ```
    ```
    npm install
    ```
3.  **Set up environment variables**
    -   Create a `.env` file in the root of the project.
    -   Add the following variables. **Do not commit this file to Git.**
        ```env
        # Server Configuration
        PORT=8080
        
        # JWT Configuration
        JWT_SECRET=YOUR_SUPER_SECRET_KEY
        JWT_EXPIRES_IN=5h
        
        # Security
        BCRYPT_SALT_ROUNDS=10
        
        # AWS Configuration
        AWS_S3_BUCKET_NAME=your-s3-bucket-name
        
        # Stripe Configuration
        STRIPE_SECRET_KEY=sk_test_...
        STRIPE_WEBHOOK_SECRET=whsec_...
        ```
4.  **Run the development server**
    ```
    npm run dev
    ```
    The server will be available at `http://localhost:8080`.

## API Endpoint Documentation

---

### **Authentication (`/api/auth`)**

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Public | Registers a new user. |
| `POST` | `/login` | Public | Logs in a user and returns a JWT. |
| `GET` | `/me` | Private | Gets the profile of the logged-in user. |

---

### **Products (`/api/products`)**

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Artist/Admin | Creates a new product. |
| `GET` | `/` | Public | Gets a list of published products. Supports filtering, sorting, and pagination. |
| `GET` | `/:id` | Public | Gets a single product by its ID. |
| `PUT` | `/:id` | Owner/Admin | Updates a product's details. |
| `DELETE`| `/:id` | Owner/Admin | Deletes a product. |
| `PUT`| `/:id/asset`| Owner/Admin | Links the main S3 asset key to a product. |
| `POST`| `/:id/previews`| Owner/Admin | Adds a preview image S3 key to a product. |

---

### **File Uploads (`/api/uploads`)**

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/url` | Artist/Admin | Generates a pre-signed URL for direct S3 upload. |

---

### **Shopping Cart (`/api/cart`)**

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Private | Gets the current user's cart. |
| `POST`| `/items` | Private | Adds a product to the cart. |
| `DELETE`| `/items/:productId`| Private | Removes a product from the cart. |

---

### **Orders (`/api/orders`)**

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Private | Creates a new order from the user's cart. |

---

### **Payments (`/api/payments`)**

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/create-intent` | Private | Creates a Stripe Payment Intent for an order. |
| `POST`| `/webhook` | Public | Stripe webhook for confirming successful payments. |

## License

Distributed under the MIT License. See `LICENSE` for more information.
