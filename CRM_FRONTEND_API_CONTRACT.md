# SEAGÖ CRM 2.0 — FRONTEND TO BACKEND API CONTRACT
**Document Version:** 2.0.0  
**Target Environment:** Node.js / Go / Python REST Service  
**Authentication Scheme:** Bearer JWT Token (`Authorization: Bearer <token>`)  
**Base URL:** `/api/v1` (Configurable via `window.SEAGO_API_BASE_URL` or Settings UI)

---

## 1. Overview & General Standards

This document establishes the official API contract between the SEAGÖ CRM frontend and backend services.

### Response Envelopes
All successful responses return a JSON object:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 25
  }
}
```

### Standard Error Envelope
HTTP Status Codes 400, 401, 403, 404, 422, 500 return:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Phone number must be a valid E.164 formatted number.",
    "details": {
      "field": "phone",
      "rule": "e164"
    }
  }
}
```

---

## 2. Authentication & Session Context

### `GET /auth/me`
* **Frontend Module:** Topbar, User Profile, CRM Session
* **Description:** Retrieves the authenticated user's profile and permissions.
* **Headers:** `Authorization: Bearer <jwt_token>`
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr-01",
    "name": "Anand R.",
    "email": "anand.r@seago.in",
    "role": "sales_lead",
    "avatar_url": null,
    "assigned_leads_count": 8
  }
}
```

---

## 3. Dashboard & Analytics Metrics

### `GET /reports/dashboard-metrics`
* **Frontend Module:** CRM Overview Dashboard
* **Description:** Calculates consolidated real-time KPI totals, channel distributions, and sales funnel values.
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_leads": 48,
    "new_leads_today": 5,
    "unassigned_leads": 3,
    "qualified_leads": 18,
    "active_opportunities": 12,
    "quotations_sent": 14,
    "followups_due": 7,
    "overdue_followups": 1,
    "orders_won": 9,
    "conversion_rate_pct": 38.5,
    "pipeline_value_inr": 14730000,
    "won_value_inr": 8200000,
    "channel_distribution": {
      "whatsapp": 22,
      "website": 12,
      "instagram": 5,
      "facebook": 4,
      "linkedin": 3,
      "x": 0,
      "direct": 2
    },
    "stage_distribution": {
      "new": 5,
      "contacted": 8,
      "qualified": 10,
      "quotation": 6,
      "negotiation": 6,
      "won": 9,
      "lost": 4
    }
  }
}
```

---

## 4. Leads & Inquiries Management

### `GET /leads`
* **Frontend Module:** Leads Table View & Kanban Board
* **Query Parameters:**
  * `page` (integer, default: 1)
  * `limit` (integer, default: 25)
  * `channel` (`all` | `whatsapp` | `website` | `instagram` | `facebook` | `linkedin` | `x` | `direct`)
  * `stage` (`all` | `new` | `contacted` | `qualified` | `quotation` | `negotiation` | `won` | `lost`)
  * `assigned_to` (string, employee name or `unassigned`)
  * `search` (string, matching name, company, location, or motor HP)
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "lead-1",
      "contact_id": "cont-1",
      "name": "Capt. Rajesh Varma",
      "phone": "+91 98470 23145",
      "email": "rajesh.varma@backwatercruises.in",
      "company": "Backwater Cruises Pvt Ltd",
      "customer_type": "Commercial Ferry Operator",
      "location": "Kochi, Kerala",
      "channel": "whatsapp",
      "source_ref": "WhatsApp Business Direct",
      "product_category": "Outboard Motor",
      "product_model": "Seagö 50 HP (36.8 kW) PMSM Outboard",
      "motor_hp": "50 HP",
      "vessel_length": "12 m",
      "seating_capacity": 18,
      "quantity": 2,
      "budget_estimate": 2500000,
      "estimated_value": 2480000,
      "currency": "INR",
      "purchase_timeline": "Immediate (< 2 wks)",
      "stage": "quotation",
      "priority": "high",
      "assigned_to": "Anand R.",
      "opt_in_whatsapp": true,
      "bot_status": "human_active",
      "tags": ["50 HP", "Kochi", "Twin Setup"],
      "created_at": "2026-11-09T08:30:00.000Z",
      "updated_at": "2026-11-11T09:15:00.000Z",
      "next_followup": "2026-11-12T10:00:00.000Z",
      "last_activity_at": "2026-11-11T09:15:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 25
  }
}
```

### `GET /leads/:id`
* **Frontend Module:** Detailed Lead Slide-Over Drawer
* **Response (200 OK):** Full single lead object including nested internal `notes` and `activity` references.

### `POST /leads`
* **Frontend Module:** New Fleet Inquiry Modal
* **Request Body:**
```json
{
  "name": "Capt. Rajesh Varma",
  "phone": "+91 98470 23145",
  "email": "rajesh.varma@backwatercruises.in",
  "company": "Backwater Cruises Pvt Ltd",
  "location": "Kochi, Kerala",
  "product_category": "Outboard Motor",
  "product_model": "Seagö 50 HP (36.8 kW) PMSM Outboard",
  "quantity": 2,
  "estimated_value": 2480000,
  "channel": "direct",
  "assigned_to": "Anand R."
}
```

### `PATCH /leads/:id`
* **Frontend Module:** Kanban Drag-and-Drop & Drawer Edit
* **Request Body:**
```json
{
  "stage": "negotiation",
  "assigned_to": "Priya M."
}
```

### `POST /leads/:id/notes`
* **Frontend Module:** Lead Notes Section
* **Request Body:**
```json
{
  "author": "Anand R.",
  "text": "Confirmed L-shaft 20in transom specification with customer dockmaster."
}
```

### `POST /leads/bulk-assign`
* **Frontend Module:** Lead Table Bulk Toolbar
* **Request Body:**
```json
{
  "ids": ["lead-1", "lead-2"],
  "employee": "Divya K."
}
```

---

## 5. Customer 360 & Contacts Directory

### `GET /contacts`
* **Frontend Module:** Customer 360 Directory View
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cont-1",
      "name": "Capt. Rajesh Varma",
      "phone": "+91 98470 23145",
      "email": "rajesh.varma@backwatercruises.in",
      "company": "Backwater Cruises Pvt Ltd",
      "customer_type": "Commercial Ferry Operator",
      "location": "Kochi, Kerala",
      "city": "Kochi",
      "state": "Kerala",
      "assigned_to": "Anand R.",
      "tags": ["50 HP", "Fleet Electrification", "High Value"],
      "priority": "high",
      "opt_in_whatsapp": true,
      "opt_in_timestamp": "2026-11-09T08:30:00.000Z",
      "created_at": "2026-11-09T08:30:00.000Z",
      "updated_at": "2026-11-11T09:15:00.000Z"
    }
  ]
}
```

### `GET /contacts/:id/timeline`
* **Frontend Module:** Customer 360 Unified Interaction Timeline Modal
* **Description:** Consolidates all touchpoints across WhatsApp, Web3Forms, Instagram, Facebook, and Inbound phone calls into a single chronological stream.
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "act-1",
      "contact_id": "cont-1",
      "type": "inquiry_received",
      "channel": "whatsapp",
      "title": "Inquiry Captured",
      "description": "Customer initiated contact requesting commercial propulsion specifications.",
      "actor": "Customer (Direct Inbound)",
      "timestamp": "2026-11-09T08:30:00.000Z"
    },
    {
      "id": "act-2",
      "contact_id": "cont-1",
      "type": "quotation_sent",
      "channel": "whatsapp",
      "title": "Quotation Generated · SG-QT-2026-089",
      "description": "Proposal for 2x 50 HP motors with twin LiFePO4 packs (₹24,80,000).",
      "actor": "Anand R.",
      "timestamp": "2026-11-10T11:00:00.000Z"
    }
  ]
}
```

---

## 6. Unified Multi-Channel Inbox & Conversations

### `GET /conversations`
* **Frontend Module:** Unified Inbox Left Panel
* **Query Parameters:** `channel` (`all` | `whatsapp` | `instagram` | `facebook` | `website` | `linkedin` | `x`)
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-1",
      "contact_id": "cont-1",
      "lead_id": "lead-1",
      "customer_name": "Capt. Rajesh Varma",
      "customer_phone": "+91 98470 23145",
      "channel": "whatsapp",
      "assigned_to": "Anand R.",
      "handover_status": "human_active",
      "unread_count": 0,
      "last_message": "Can we schedule sea trial inspection in Chennai this Friday?",
      "last_message_at": "2026-11-11T09:15:00.000Z",
      "priority": "high",
      "is_resolved": false
    }
  ]
}
```

### `GET /conversations/:id`
* **Frontend Module:** Unified Inbox Center & Right Panels
* **Response (200 OK):** Detailed conversation record with complete array of `messages`.

### `POST /conversations/:id/messages`
* **Frontend Module:** Reply Compose Box
* **Request Body:**
```json
{
  "text": "Hello Capt. Varma, Friday 10:00 AM at our Kovalam slipway is confirmed.",
  "channel": "whatsapp"
}
```

### `POST /conversations/:id/handover`
* **Frontend Module:** Human / Chatbot Automation Switcher
* **Request Body:**
```json
{
  "status": "human_active" // 'bot_active' | 'human_requested' | 'human_active' | 'resolved'
}
```

### `POST /conversations/:id/resolve`
* **Frontend Module:** Mark Resolved Action Button

---

## 7. Commercial Opportunities

### `GET /opportunities`
* **Frontend Module:** Opportunities Pipeline & Kanban Board
* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "opp-1",
      "name": "Backwater Cruises — 2x 50 HP Fleet Retrofit",
      "contact_id": "cont-1",
      "lead_id": "lead-1",
      "customer_name": "Capt. Rajesh Varma",
      "company": "Backwater Cruises Pvt Ltd",
      "product": "Seagö 50 HP (36.8 kW) PMSM Outboard",
      "quantity": 2,
      "estimated_value": 2480000,
      "currency": "INR",
      "expected_close_date": "2026-11-25",
      "assigned_to": "Anand R.",
      "stage": "quotation_demo",
      "probability_pct": 75,
      "quotation_ref": "SG-QT-2026-089"
    }
  ]
}
```

### `PATCH /opportunities/:id/stage`
* **Frontend Module:** Opportunity Kanban Drag-and-Drop
* **Request Body:**
```json
{
  "stage": "negotiation"
}
```

---

## 8. Tasks & Follow-ups

### `GET /tasks`
* **Frontend Module:** Tasks List & Calendar View
* **Query Parameters:** `status` (`all` | `pending` | `completed`)

### `POST /tasks`
* **Frontend Module:** New Task Modal
* **Request Body:**
```json
{
  "title": "Send Revised Proforma Invoice to Mandovi Watersports",
  "task_type": "quotation_prep",
  "customer_name": "Capt. Vikram Prabhu",
  "assigned_to": "Priya M.",
  "due_date": "2026-11-11T16:30:00.000Z",
  "priority": "urgent",
  "notes": "Include Bimini canopy (₹45,000) and marine sound system (₹28,000)."
}
```

### `PATCH /tasks/:id/status`
* **Frontend Module:** Checkbox Toggle
* **Request Body:**
```json
{
  "status": "completed"
}
```

---

## 9. Integration Configuration & Webhook Monitoring

### `GET /integrations`
* **Frontend Module:** Integration Centre Cards
* **Returns:** Status, last synchronization timestamp, error logs, and capabilities for WhatsApp Cloud API, Web3Forms, Facebook, Instagram, LinkedIn, and X.

### `PUT /integrations/:provider/config`
* **Frontend Module:** Integration Configuration Modal
* **Request Body:**
```json
{
  "app_id": "847291048201948",
  "waba_id": "389274910283741",
  "phone_number_id": "109847291847192",
  "access_token": "<TOKEN>"
}
```
*Note: Tokens must be stored securely server-side; frontend only receives masked values.*

### `GET /integrations/webhooks/events`
* **Frontend Module:** Real-Time Webhook Activity Log
* **Returns:** Event ID, provider, event type, timestamp, payload summary, retry count, and processing status.

### `POST /integrations/webhooks/events/:id/retry`
* **Frontend Module:** Webhook Event "Retry" button
* **Description:** Requests the backend to reprocess a failed webhook payload.

---

## 10. Notifications

### `GET /notifications`
* **Frontend Module:** Topbar Notification Bell
* **Returns:** Unread in-app alerts (New Lead, Inbound Message, Follow-up Due, Integration Warning).

### `POST /notifications/mark-all-read`
* **Frontend Module:** "Mark all read" link in notification dropdown.
