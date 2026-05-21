rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {


    // HELPER FUNCTIONS

    function isAuthenticated() {
      return request.auth != null;
    }

    // JWT claim is faster; Firestore fallback handles stale tokens
    function getUserRole() {
      return request.auth.token.get('role', 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
      );
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'admin';
    }

    function isStandard() {
      return isAuthenticated() && getUserRole() == 'standard';
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Admins bypass this; others need the explicit claim
    function hasPermission(permission) {
      return isAuthenticated() &&
        (isAdmin() || (request.auth.token.permissions != null &&
        permission in request.auth.token.permissions));
    }


    // SENSOR DATA

    match /sensor_data/{docId} {
      allow read: if isAuthenticated();
      allow write: if false; // backend only via Admin SDK
    }

    // SECURITY EVENTS (includes alerts)

    match /security_events/{docId} {
      allow read: if isAuthenticated();

      // Require all core fields to prevent malformed documents
      allow create: if isAdmin() &&
        request.resource.data.keys().hasAll([
          'eventType', 'severity', 'description', 'timestamp'
        ]);

      // Only acknowledgement fields can change — event itself is immutable
      allow update: if isAdmin() &&
        request.resource.data.diff(resource.data)
          .affectedKeys().hasOnly(['acknowledged', 'acknowledgedBy', 'acknowledgedAt']);

      allow delete: if false; // permanent audit records
    }

 
    // SYSTEM LOGS
  
    // All authenticated users can read,admins see everything,
    // standard users can see operational logs
    match /system_logs/{docId} {
      allow read: if isAuthenticated();
      allow write: if false; // backend only via Admin SDK
    }


    // USERS


    match /users/{userId} {
      // Users can read their own profile,admins can read any
      allow read: if isAuthenticated() && (isOwner(userId) || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');

      allow create, delete: if isAdmin();

      // Non admins can only update display name and phone (not role)
      allow update: if isAdmin() ||
        (isOwner(userId) &&
          request.resource.data.diff(resource.data)
            .affectedKeys().hasOnly(['displayName', 'phoneNumber']));
    }

    // DEVICES

    // Any authenticated user can view device listings
    match /devices/{deviceId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAdmin();
      allow update: if isAdmin();
    }

 
    // DEVICE MITIGATION ACTIONS 
   

    match /devices/{deviceId}/mitigations/{mitigationId} {
      allow read: if isAdmin();

      // Allowlist prevents arbitrary commands from being written
      allow create: if isAdmin() &&
        request.resource.data.actionType in [
          'isolate', 'block_ip', 'reset_hmac', 'force_reauth'
        ];

      allow update, delete: if isAdmin();
    }

   
    // BLOCKED IPs (mitigation)
    

    match /blocked_ips/{ipAddress} {
      allow read: if isAdmin();

      // Require all fields so the enforcement layer always has full context
      allow create: if isAdmin() &&
        request.resource.data.keys().hasAll([
          'ipAddress', 'reason', 'blockedAt', 'expiresAt'
        ]);

      allow update, delete: if isAdmin();
    }

    
    // HMAC KEYS (device authentication)
    

    match /hmac_keys/{deviceId} {
      // Also allows service accounts that set the admin claim directly
      allow read: if isAdmin() || request.auth.token.admin == true;
      allow write: if isAdmin();
    }

    
    // AUDIT LOGS
    
    match /audit_logs/{docId} {
      allow read: if isAdmin();
      allow write: if false; // backend only (client writes would allow tampering)
    }

    
    // BACKUP METADATA
  

    match /backup_metadata/{docId} {
      allow read, write: if isAdmin();
    }


    // SESSIONS (force reauth tracking)

    match /sessions/{sessionId} {
       // Session invalidation is a privileged action (admins can force)
      allow read, write: if isAdmin();
    }
  }
}