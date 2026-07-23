# API Documentation - Ain Sheen Qaf : The Muted Void

This application heavily leverages Firebase Firestore to store and retrieve data. The entire application is designed to be configurable directly from the database without requiring hard-coded content changes.

Below are the details on each dynamically rendered section and the schema of the documents expected in the Firestore database.

## 1. Static Pages (About Us, Careers, Contact Us, Privacy, Terms)

**Collection Name:** `pages`

Each generic page displayed within the application can be updated in this collection.

- **Document ID Structure:** `about`, `careers`, `contact`, `privacy`, `terms`
- **Schema:**
  ```json
  {
    "title": "String - The visible heading on the page",
    "body": "String - The raw HTML to render as the body of the page"
  }
  ```

*To update the About section, simply edit the document with ID `about` in the `pages` collection.*

## 2. Store Products (Volumes, Aesthetics, Decor)

**Collection Name:** `products`

All store elements (Books, Posters, Decor) are rendered dynamically from the database. To add a new product or change the price, create or edit a document here.

- **Schema:**
  ```json
  {
    "title": "String - The name of the product",
    "category": "String - Must be one of 'literature', 'aesthetics', 'decor'",
    "price": "String or Number - The price (e.g. '25.00')",
    "description": "String - A short snippet about the product",
    "imageUrl": "String - HTTPS URL of the image"
  }
  ```

## 3. Orders Checkout 

**Collection Name:** `orders`

When a user places an order, the application writes it into this collection. 

- **Schema:**
  ```json
  {
    "userId": "String - The UID of the user who ordered",
    "email": "String - Email of the user",
    "items": [
      {
        "id": "String - Product ID",
        "title": "String - Product Title",
        "price": "Number - Unit Price",
        "quantity": "Number - Quantity"
      }
    ],
    "total": "Number - The total cost",
    "status": "String - Status of the order (e.g., 'pending', 'shipped', 'delivered')",
    "createdAt": "Timestamp - Date when order was placed",
    "address": {
      "line1": "String",
      "line2": "String",
      "city": "String",
      "state": "String",
      "district": "String",
      "pincode": "String",
      "instructions": "String"
    }
  }
  ```

## 4. Blog / The Muted Log

**Collection Name:** `blogs`

The blog viewer handles both short updates and extensive long-form posts. The platform will automatically paginate or truncate content that exceeds 300 characters, introducing a "Read more" toggle.

- **Schema:**
  ```json
  {
    "title": "String - Title of the blog entry",
    "content": "String - Raw HTML content containing the blog text",
    "createdAt": "Timestamp - Date published"
  }
  ```

## 5. Masterpiece Suggestions 

**Collection Name:** `suggestions`

Users can suggest literary pieces to be discussed in the app.

- **Schema:**
  ```json
  {
    "poet": "String - The name of the writer",
    "work": "String - Title of the work",
    "email": "String - Email of the submitter",
    "timestamp": "String - ISO string of the time it was submitted"
  }
  ```

## 6. Real-time Broadcasts (Hub)

**Collection Name:** `broadcasts`

Admin notifications or announcements that scroll across the screen in the hub view.

- **Schema:**
  ```json
  {
    "message": "String - The text content",
    "type": "String - One of 'info', 'event', 'highlight'",
    "createdAt": "Timestamp",
    "active": "Boolean"
  }
  ```

---

*Note: For the best experience managing this content, use the Firebase Console directly to edit the Firestore Database, or implement an Admin Dashboard module writing to these collections.*

## 7. Invoice Configuration

**Collection Name:** `pages`
**Document ID:** `invoice_config`

Configure which fields and sections appear on the invoice.

- **Schema:**
  ```json
  {
    "organizationName": "String",
    "showEmail": "Boolean",
    "showAddress": "Boolean",
    "footerMessage": "String"
  }
  ```

## 8. Backend REST APIs

The backend server (`server.ts`) exposes several endpoints that the frontend consumes. 
For endpoints that modify data, an admin token is typically required.

### 8.1. `POST /api/literature-ai`
Interacts with the Gemini AI model as the "Nukta" literary companion.
- **Payload:** `{ "action": "analyze" | "summarize" | "custom", "text": "...", "context": "...", "userPrompt": "..." }`

### 8.2. `POST /api/generate-nukta-metadata`
Generates poetic AI metadata for uploaded literature.
- **Payload:** `{ "originalText": "...", "author": "...", "creatorPassword": "..." }`

### 8.3. `GET /api/literature`
Fetches all curated literature from the database.
- **Query Params:** `?category=ghazal` (optional)

### 8.4. `POST /api/literature`
Creates a new literature piece.
- **Payload:** `{ "title": "...", "author": "...", "category": "...", "originalText": "..." }`

### 8.5. `GET /api/broadcasts`
Fetches all real-time hub broadcasts.

### 8.6. `POST /api/broadcasts`
Creates a new broadcast event.
- **Payload:** `{ "title": "...", "type": "...", "embedId": "..." }`

### 8.7. `POST /api/fetch-media-meta`
Fetches metadata for Instagram/YouTube media and generates a poetic description.
- **Payload:** `{ "url": "..." }`

### 8.8. `POST /api/suggestions`
Submits a user feature suggestion or feedback.
- **Payload:** `{ "feature": "...", "email": "...", "message": "..." }`

