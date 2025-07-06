# Google Sheets Data Structure

This document outlines the structure for the Google Sheets that will serve as our database.

## Sheet 1: Inventory
**Purpose:** Track keys, cartridges, stock levels, and prices

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| A | String | Product Type | "Cartridge", "Key" |
| B | String | Brand | "HP", "Canon", "House Key" |
| C | String | Model/Type | "HP 564XL", "Mailbox Key" |
| D | String | Color/Variant | "Black", "Cyan", "N/A" |
| E | Number | Stock Quantity | 15 |
| F | Number | Reorder Level | 5 |
| G | Number | Cost Price | 25.99 |
| H | Number | Sell Price | 45.99 |
| I | String | Supplier | "Supplier Name" |
| J | Date | Last Updated | 2024-01-15 |
| K | String | Notes | "Compatible with..." |

## Sheet 2: Customer Orders
**Purpose:** Track refill status and shipping orders

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| A | String | Order ID | "ORD-2024-001" |
| B | String | Customer Name | "John Smith" |
| C | String | Phone Number | "(403) 555-0123" |
| D | String | Email | "john@email.com" |
| E | String | Service Type | "Refill", "Shipping", "Key" |
| F | String | Item Description | "HP 564 Black Cartridge" |
| G | String | Status | "Received", "In Progress", "Ready", "Completed" |
| H | Date | Date Received | 2024-01-15 |
| I | Date | Date Completed | 2024-01-16 |
| J | Number | Price | 25.99 |
| K | String | Tracking Number | "1Z123456789" (if shipping) |
| L | String | Courier | "UPS", "FedEx", "Purolator" |
| M | String | Notes | "Customer prefers pickup calls" |

## Sheet 3: Website Directory
**Purpose:** Quick access links for staff

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| A | String | Category | "Suppliers", "Shipping", "Tools" |
| B | String | Website Name | "UPS Shipping" |
| C | String | URL | "https://ups.com/ship" |
| D | String | Username/Notes | "Login: staff@company.com" |
| E | String | Description | "Main shipping portal" |
| F | Boolean | Frequently Used | TRUE |

## Sheet 4: Blog/Announcements
**Purpose:** Customer-facing content management

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| A | String | Post ID | "POST-001" |
| B | String | Title | "Now Accepting Amazon Returns!" |
| C | String | Content | "We're excited to announce..." |
| D | String | Type | "Announcement", "News", "Update" |
| E | Date | Date Created | 2024-01-15 |
| F | Date | Date Published | 2024-01-15 |
| G | Boolean | Published | TRUE |
| H | String | Author | "Staff Member" |
| I | String | Tags | "amazon,returns,service" |

## Sheet 5: Staff Notes
**Purpose:** Internal staff communication

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| A | String | Note ID | "NOTE-001" |
| B | String | Title | "Reminder: New supplier contact" |
| C | String | Content | "Remember to call new supplier..." |
| D | String | Priority | "High", "Medium", "Low" |
| E | Date | Date Created | 2024-01-15 |
| F | String | Created By | "staff@company.com" |
| G | Boolean | Completed | FALSE |
| H | Date | Due Date | 2024-01-20 |
| I | String | Category | "Supplier", "Customer", "Maintenance" |

## Google Sheets API Integration Notes

### Authentication
- Use Google Service Account for server-side access
- Store credentials in environment variables
- Implement proper error handling for API limits

### API Endpoints to Create
- `GET /api/inventory` - Fetch all inventory items
- `POST /api/inventory` - Add new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `GET /api/orders` - Fetch customer orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status
- `GET /api/directory` - Fetch website directory
- `GET /api/blog` - Fetch published blog posts
- `GET /api/notes` - Fetch staff notes

### Data Validation Rules
- Phone numbers: Format as (XXX) XXX-XXXX
- Emails: Validate format before saving
- Dates: Use ISO format (YYYY-MM-DD)
- Prices: Validate as positive numbers
- Stock quantities: Must be integers >= 0

### Performance Considerations
- Implement caching for frequently accessed data
- Use batch operations for multiple updates
- Add loading states in UI for API calls
- Implement offline fallback where possible