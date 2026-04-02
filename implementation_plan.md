# Deep Architecture Plan: Collaborator Mode Workspace

You want to upgrade the platform to allow multiple registered users to collaborate on the same document natively within their dashboards. This is a massive enterprise feature that will turn the Ala-Too platform into a shared digital workspace.

## User Review Required
> [!IMPORTANT]
> This requires structural database enhancements to define permission barriers securely. Please review the plan below! Do you want "Real-Time WebSockets" (seeing cursors move live like Google Docs), or just standard Asynchronous Collaboration (both users can view and edit the document in their dashboard, but it saves chronologically)? **I highly recommend starting with Asynchronous Collaboration** for stability. 

## Phase 1: Database & Security Architecture (Backend)

We must break the strict "One-Owner" rule currently enforced by the database.
### [NEW] `document_collaborators` Database Table
We will create a new entity mapping users to documents they don't explicitly own.
- `document_id`: The target contract.
- `user_id`: The account granted access.
- `permission_level`: `VIEWER` (can only read), `EDITOR` (can add components), `ADMIN` (can invite others).

### [MODIFY] `DocumentService.java` Security Gates
Currently, if you try to fetch a document that you didn't upload yourself, the backend instantly throws a `403 Forbidden` Exception.
- We will rewrite `getDocument()`, `deleteDocument()`, and `stampDocument()` to verify the user's `permission_level` inside the new collaborators' matrix.

## Phase 2: Collaboration APIs (Backend)

### [NEW] `POST /api/v1/documents/{id}/collaborators`
- We will build an endpoint that accepts a target `email_address` and a `permission` level.
- It will verify the user exists in the `users` table, bind them to the document, and dispatch an internal notification/email to them.

### [NEW] `GET /api/v1/documents/shared`
- This endpoint will retrieve all documents where the current user is a listed collaborator, allowing us to build the "Shared With Me" tab on the frontend.

## Phase 3: The Front-End Workspace

### "Shared With Me" Dashboard
- We will add a toggle mode on the main dashboard page: **My Vault** vs **Shared Workspace**.
- Clicking **Shared Workspace** will list files shared by colleagues.

### The Share Modal
- Inside the Document Details page (`/dashboard/documents/[id]`), we will add a prestigious **"Share Document"** button.
- Clicking it opens a modal listing all current active internal collaborators on the project.
- You can type in your colleague's email (e.g., `client@alatoo.kg`) and press **Add Collaborator**, which immediately grants them dashboard access.

### Editor Permission Locks
- We will route the API responses down so the React Editor knows your active permission status. 
- If you are granted only `VIEWER` status, the entire Left Sidebar (Draw/Type/Upload toolkit) will be completely hidden. You can read the document safely without accidentally tampering with the company seal!

---

## Open Questions
1. Does your team need **Real-Time WebSockets** (where you see each other's mouse cursors on the same document simultaneously), or is **Asynchronous Sharing** (where User A edits, saves, and User B opens it later) sufficient for your current milestone?
2. Do you approve execution of this database and API overhaul?
