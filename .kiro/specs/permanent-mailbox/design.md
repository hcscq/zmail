# Design Document: Permanent Mailbox Feature

## Overview

This design document describes the implementation of permanent mailbox functionality for ZMAIL. The feature allows users to create mailboxes that never expire, providing a persistent email address for long-term use. The implementation uses a sentinel value approach to mark mailboxes as permanent while maintaining backward compatibility with existing temporary mailboxes.

The design follows a full-stack approach, modifying the database schema interpretation, backend API, and frontend UI to support permanent mailboxes. Key design decisions include using a far-future timestamp as a sentinel value (9999999999) to represent permanence, storing the mailbox address_type to enforce eligibility (name/custom only), excluding permanent mailboxes and their emails from scheduled cleanup, preventing deletion of permanent mailboxes through both UI and API restrictions, and providing a conversion mechanism for upgrading eligible temporary mailboxes to permanent status.

## Architecture

The permanent mailbox feature integrates into the existing ZMAIL architecture at multiple layers:

### Database Layer
- Extends the existing `mailboxes` table with an `address_type` column
- Interprets `expires_at` field values to determine mailbox type:
  - Normal timestamp (< 9999999999): Temporary mailbox
  - Sentinel value (9999999999): Permanent mailbox
- Uses `address_type` to enforce permanence eligibility (name/custom only)
- Cleanup tasks filter out permanent mailboxes when deleting expired entries
- Email cleanup tasks skip emails that belong to permanent mailboxes

### Backend Layer (Cloudflare Worker)
- Extends `CreateMailboxParams` type to include `addressType` and `isPermanent` flags
- Validates that `isPermanent` is only allowed for address types name/custom
- Modifies mailbox creation logic to set sentinel value when `isPermanent` is true
- Adds new PATCH endpoint for converting eligible temporary mailboxes to permanent
- Adds validation to prevent deletion of permanent mailboxes
- Updates mailbox queries to return `address_type` and include permanent mailboxes
- Updates email cleanup logic to exclude emails owned by permanent mailboxes
- Updates CORS configuration to allow PATCH requests

### Frontend Layer
- Keeps `AddressType` as name/random/custom and adds a permanent toggle
- Shows permanent option only for name/custom address types
- Displays permanent status indicator in mailbox information
- Hides delete button for permanent mailboxes
- Provides conversion button for eligible temporary mailboxes
- Updates localStorage handling to persist permanent status and address type

## Components and Interfaces

### Backend Types (worker/src/types.ts)

```typescript
export type AddressType = 'name' | 'random' | 'custom';

// Extended CreateMailboxParams to support permanent mailboxes
export interface CreateMailboxParams {
  address: string;
  addressType: AddressType;
  expiresInHours: number;  // Ignored when isPermanent is true
  ipAddress: string;
  isPermanent?: boolean;    // New field
}

// Extended Mailbox type to include addressType and permanent status
export interface Mailbox {
  id: string;
  address: string;
  addressType: AddressType;
  createdAt: number;
  expiresAt: number;        // Sentinel value 9999999999 for permanent
  ipAddress: string;
  lastAccessed: number;
  isPermanent?: boolean;    // Computed field for convenience
}
```

### Backend Utility Functions (worker/src/utils.ts)

```typescript
// Sentinel value for permanent mailboxes
export const PERMANENT_MAILBOX_SENTINEL = 9999999999;

/**
 * Check if a mailbox is permanent based on expires_at value
 */
export function isPermanentMailbox(expiresAt: number): boolean {
  return expiresAt === PERMANENT_MAILBOX_SENTINEL;
}

/**
 * Check if an address type is eligible for permanence
 */
export function isPermanentAllowedForAddressType(addressType: AddressType): boolean {
  return addressType === 'name' || addressType === 'custom';
}

/**
 * Calculate expiry timestamp for mailbox creation
 * Returns sentinel value if permanent, otherwise calculates normal expiry
 */
export function calculateMailboxExpiry(hours: number, isPermanent: boolean): number {
  if (isPermanent) {
    return PERMANENT_MAILBOX_SENTINEL;
  }
  return getCurrentTimestamp() + (hours * 60 * 60);
}
```

### Backend Database Functions (worker/src/database.ts)

```typescript
/**
 * Modified createMailbox to support permanent mailboxes
 */
export async function createMailbox(
  db: D1Database, 
  params: CreateMailboxParams
): Promise<Mailbox> {
  const now = getCurrentTimestamp();
  const isPermanent = !!params.isPermanent && isPermanentAllowedForAddressType(params.addressType);
  const expiresAt = calculateMailboxExpiry(
    params.expiresInHours, 
    isPermanent
  );
  
  const mailbox: Mailbox = {
    id: generateId(),
    address: params.address,
    addressType: params.addressType,
    createdAt: now,
    expiresAt: expiresAt,
    ipAddress: params.ipAddress,
    lastAccessed: now,
    isPermanent: isPermanentMailbox(expiresAt)
  };
  
  await db.prepare(
    `INSERT INTO mailboxes (id, address, address_type, created_at, expires_at, ip_address, last_accessed) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    mailbox.id, 
    mailbox.address, 
    mailbox.addressType,
    mailbox.createdAt, 
    mailbox.expiresAt, 
    mailbox.ipAddress, 
    mailbox.lastAccessed
  ).run();
  
  return mailbox;
}

/**
 * Modified getMailbox to include isPermanent flag
 */
export async function getMailbox(
  db: D1Database, 
  address: string
): Promise<Mailbox | null> {
  const now = getCurrentTimestamp();
  
  // Query includes permanent mailboxes (expires_at > now OR expires_at = sentinel)
  const result = await db.prepare(
    `SELECT id, address, address_type, created_at, expires_at, ip_address, last_accessed 
     FROM mailboxes 
     WHERE address = ? AND (expires_at > ? OR expires_at = ?)`
  ).bind(address, now, PERMANENT_MAILBOX_SENTINEL).first();
  
  if (!result) return null;
  
  // Update last accessed time
  await db.prepare(
    `UPDATE mailboxes SET last_accessed = ? WHERE id = ?`
  ).bind(now, result.id).run();
  
  const expiresAt = result.expires_at as number;
  
  return {
    id: result.id as string,
    address: result.address as string,
    addressType: result.address_type as AddressType,
    createdAt: result.created_at as number,
    expiresAt: expiresAt,
    ipAddress: result.ip_address as string,
    lastAccessed: now,
    isPermanent: isPermanentMailbox(expiresAt)
  };
}

/**
 * New function to convert temporary mailbox to permanent
 */
export async function convertMailboxToPermanent(
  db: D1Database,
  address: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE mailboxes 
     SET expires_at = ? 
     WHERE address = ? AND address_type IN ('name', 'custom') AND expires_at != ?`
  ).bind(PERMANENT_MAILBOX_SENTINEL, address, PERMANENT_MAILBOX_SENTINEL).run();
  
  return (result.meta?.changes || 0) > 0;
}

/**
 * Modified deleteMailbox to prevent deletion of permanent mailboxes
 */
export async function deleteMailbox(
  db: D1Database, 
  address: string
): Promise<{ success: boolean; error?: string }> {
  // Check if mailbox is permanent
  const mailbox = await getMailbox(db, address);
  
  if (!mailbox) {
    return { success: false, error: 'Mailbox not found' };
  }
  
  if (mailbox.isPermanent) {
    return { success: false, error: 'Cannot delete permanent mailbox' };
  }
  
  await db.prepare(
    `DELETE FROM mailboxes WHERE address = ?`
  ).bind(address).run();
  
  return { success: true };
}

/**
 * Modified cleanupExpiredMailboxes to exclude permanent mailboxes
 */
export async function cleanupExpiredMailboxes(db: D1Database): Promise<number> {
  const now = getCurrentTimestamp();
  
  // Only delete mailboxes that are expired AND not permanent
  const result = await db.prepare(
    `DELETE FROM mailboxes 
     WHERE expires_at <= ? AND expires_at != ?`
  ).bind(now, PERMANENT_MAILBOX_SENTINEL).run();
  
  await cleanupOrphanedAttachments(db);
  
  return result.meta?.changes || 0;
}

/**
 * Modified cleanupExpiredMails to exclude emails for permanent mailboxes
 */
export async function cleanupExpiredMails(db: D1Database): Promise<number> {
  const now = getCurrentTimestamp();
  const oneDayAgo = now - 24 * 60 * 60;
  const result = await db.prepare(
    `DELETE FROM emails
     WHERE received_at <= ?
       AND mailbox_id IN (
         SELECT id FROM mailboxes WHERE expires_at != ?
       )`
  ).bind(oneDayAgo, PERMANENT_MAILBOX_SENTINEL).run();
  
  await cleanupOrphanedAttachments(db);
  
  return result.meta?.changes || 0;
}

/**
 * Modified cleanupReadMails to exclude emails for permanent mailboxes
 */
export async function cleanupReadMails(db: D1Database): Promise<number> {
  const result = await db.prepare(
    `DELETE FROM emails
     WHERE is_read = 1
       AND mailbox_id IN (
         SELECT id FROM mailboxes WHERE expires_at != ?
       )`
  ).bind(PERMANENT_MAILBOX_SENTINEL).run();
  
  await cleanupOrphanedAttachments(db);
  
  return result.meta?.changes || 0;
}
```

### Backend API Routes (worker/src/routes.ts)

```typescript
// Modified POST /api/mailboxes to support isPermanent flag
app.post('/api/mailboxes', async (c) => {
  try {
    const body = await c.req.json();
    const addressType: AddressType = body.addressType || 'random';
    const isPermanent: boolean = typeof body.isPermanent === 'boolean' ? body.isPermanent : false;
    
    if (isPermanent && addressType === 'random') {
      return c.json({ 
        success: false, 
        error: 'Random mailboxes cannot be permanent' 
      }, 400);
    }
    const expiresInHours = isPermanent ? 0 : 24; // Ignored if permanent
    
    // ... address generation logic ...
    
    const mailbox = await createMailbox(c.env.DB, {
      address,
      addressType,
      expiresInHours,
      ipAddress: ip,
      isPermanent
    });
    
    return c.json({ 
      success: true, 
      mailbox: {
        ...mailbox,
        addressType
      }
    });
  } catch (error) {
    // ... error handling ...
  }
});

// New PATCH /api/mailboxes/:address/convert-to-permanent endpoint
app.patch('/api/mailboxes/:address/convert-to-permanent', async (c) => {
  try {
    const address = c.req.param('address');
    
    // Check if mailbox exists
    const mailbox = await getMailbox(c.env.DB, address);
    if (!mailbox) {
      return c.json({ success: false, error: 'Mailbox not found' }, 404);
    }
    
    if (mailbox.addressType === 'random') {
      return c.json({ 
        success: false, 
        error: 'Random mailboxes cannot be converted to permanent' 
      }, 403);
    }
    
    // Check if already permanent
    if (mailbox.isPermanent) {
      return c.json({ 
        success: true, 
        message: 'Mailbox is already permanent',
        mailbox 
      });
    }
    
    // Convert to permanent
    const converted = await convertMailboxToPermanent(c.env.DB, address);
    
    if (!converted) {
      return c.json({ 
        success: false, 
        error: 'Failed to convert mailbox' 
      }, 500);
    }
    
    // Fetch updated mailbox
    const updatedMailbox = await getMailbox(c.env.DB, address);
    
    return c.json({ 
      success: true, 
      message: 'Mailbox converted to permanent',
      mailbox: updatedMailbox 
    });
  } catch (error) {
    console.error('Convert mailbox failed:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to convert mailbox',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Modified DELETE /api/mailboxes/:address to prevent permanent deletion
app.delete('/api/mailboxes/:address', async (c) => {
  try {
    const address = c.req.param('address');
    const result = await deleteMailbox(c.env.DB, address);
    
    if (!result.success) {
      if (result.error === 'Cannot delete permanent mailbox') {
        return c.json({ 
          success: false, 
          error: result.error 
        }, 403);
      }
      return c.json({ 
        success: false, 
        error: result.error 
      }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    // ... error handling ...
  }
});
```

### Frontend Types and API (frontend/src/utils/api.ts)

```typescript
// AddressType remains the creation mode (no permanent type)
export type AddressType = 'name' | 'random' | 'custom';

// Extended createMailboxWithType to support isPermanent flag
export const createMailboxWithType = async (
  addressType: AddressType = 'random',
  customAddress?: string,
  expiresInHours = 24,
  isPermanent = false
) => {
  try {
    const requestBody: {
      addressType: AddressType;
      expiresInHours: number;
      address?: string;
      isPermanent?: boolean;
    } = {
      addressType,
      expiresInHours
    };
    
    if (addressType === 'custom' && customAddress) {
      requestBody.address = customAddress.trim();
    }
    
    if (isPermanent) {
      requestBody.isPermanent = true;
    }
    
    const response = await fetch(apiUrl('/api/mailboxes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create mailbox' };
    }
    
    return { success: true, mailbox: data.mailbox };
  } catch (error) {
    return { success: false, error };
  }
};

// New function to convert mailbox to permanent
export const convertMailboxToPermanent = async (address: string) => {
  try {
    const response = await fetch(apiUrl(`/api/mailboxes/${address}/convert-to-permanent`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to convert mailbox' };
    }
    
    return { success: true, mailbox: data.mailbox, message: data.message };
  } catch (error) {
    console.error('Error converting mailbox:', error);
    return { success: false, error };
  }
};
```

### Frontend Context (frontend/src/contexts/MailboxContext.tsx)

```typescript
interface MailboxContextType {
  // ... existing fields ...
  convertToPermanent: () => Promise<void>;
  isPermanentOption: boolean;
  setIsPermanentOption: (value: boolean) => void;
}

export const MailboxProvider: React.FC<MailboxProviderProps> = ({ children }) => {
  // ... existing state ...
  const [isPermanentOption, setIsPermanentOption] = useState(false);
  
  // New function to convert current mailbox to permanent
  const convertToPermanent = async () => {
    if (!mailbox) return;
    
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const result = await convertMailboxToPermanent(mailbox.address);
      
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        saveMailboxToLocalStorage(result.mailbox);
        showSuccessMessage(t('mailbox.convertSuccess'));
      } else {
        showErrorMessage(result.error || t('mailbox.convertFailed'));
      }
    } catch (error) {
      console.error('Error converting mailbox:', error);
      showErrorMessage(t('mailbox.convertFailed'));
    }
  };
  
  const createMailboxWithAddressType = async (customAddress?: string) => {
    const isEligible = addressType === 'name' || addressType === 'custom';
    const isPermanent = isEligible && isPermanentOption;
    // ... existing logic ...
    const result = await createMailboxWithType(addressType, customAddress, 24, isPermanent);
    // ... existing logic ...
  };
  
  return (
    <MailboxContext.Provider
      value={{
        // ... existing values ...
        convertToPermanent,
        isPermanentOption,
        setIsPermanentOption
      }}
    >
      {children}
    </MailboxContext.Provider>
  );
};
```

## Data Models

### Mailbox Data Model

The `Mailbox` type represents an email address that can receive emails. The permanent mailbox feature extends this model with a computed `isPermanent` field:

```typescript
interface Mailbox {
  id: string;              // UUID
  address: string;         // Email address prefix (without domain)
  addressType: AddressType; // name | random | custom
  createdAt: number;       // Unix timestamp (seconds)
  expiresAt: number;       // Unix timestamp or PERMANENT_MAILBOX_SENTINEL
  ipAddress: string;       // Client IP address
  lastAccessed: number;    // Unix timestamp (seconds)
  isPermanent?: boolean;   // Computed from expiresAt value
}
```

**Sentinel Value Approach:**
- Temporary mailboxes: `expiresAt` contains a normal Unix timestamp
- Permanent mailboxes: `expiresAt` = 9999999999 (September 9, 2286)
- This approach keeps permanence encoded in `expiresAt` while `address_type` enforces eligibility
- The far-future date ensures permanent mailboxes are never considered expired

**Computed Field:**
- `isPermanent` is computed by comparing `expiresAt` to the sentinel value
- Not stored in database, calculated when mailbox is retrieved
- Simplifies frontend logic and API responses

**Eligibility:**
- `addressType` is persisted to enforce that only name/custom mailboxes can be permanent

### Database Schema

The database schema is extended to persist mailbox address_type for permanence eligibility. The `mailboxes` table becomes:

```sql
CREATE TABLE mailboxes (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  address_type TEXT NOT NULL DEFAULT 'random',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,  -- Sentinel value for permanent mailboxes
  ip_address TEXT,
  last_accessed INTEGER NOT NULL
);
```

**Query Modifications:**
- Mailbox retrieval: `WHERE expires_at > ? OR expires_at = ?` (includes permanent)
- Cleanup: `WHERE expires_at <= ? AND expires_at != ?` (excludes permanent)
- Conversion: `UPDATE SET expires_at = ? WHERE address = ? AND address_type IN ('name', 'custom')`
- Email cleanup: filter emails by mailboxes where `expires_at != ?`


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

The following properties define the correctness criteria for the permanent mailbox feature. Each property is universally quantified and references the specific requirements it validates.

### Property 1: Permanent Mailbox Creation Sets Sentinel Value

*For any* mailbox created with `isPermanent=true` and addressType in {name, custom}, the `expires_at` field SHALL equal the sentinel value 9999999999.

**Validates: Requirements 1.2, 1.3, 5.1, 6.2**

### Property 2: Cleanup Task Excludes Permanent Mailboxes

*For any* permanent mailbox in the database, running the cleanup task SHALL NOT delete that mailbox.

**Validates: Requirements 2.1, 5.3**

### Property 3: Permanent Mailboxes Always Queryable

*For any* permanent mailbox and any timestamp greater than its creation time, querying the mailbox SHALL return the mailbox successfully.

**Validates: Requirements 2.2**

### Property 4: Email Reception for Permanent Mailboxes

*For any* permanent mailbox and any valid email, the email handler SHALL accept and store the email for that mailbox address.

**Validates: Requirements 2.3**

### Property 5: Delete Button Visibility Based on Mailbox Type

*For any* mailbox displayed in the UI, the delete button SHALL be visible if and only if the mailbox is temporary (not permanent).

**Validates: Requirements 3.1, 3.2**

### Property 6: API Rejects Permanent Mailbox Deletion

*For any* permanent mailbox, attempting to delete it via the DELETE API SHALL return a 403 status code with an error message.

**Validates: Requirements 3.3, 6.8**

### Property 7: Mailbox Conversion Updates to Sentinel Value

*For any* eligible temporary mailbox, calling the convert-to-permanent API SHALL update the `expires_at` field to the sentinel value 9999999999.

**Validates: Requirements 4.3, 4.4, 6.5**

### Property 8: UI Updates After Conversion

*For any* eligible temporary mailbox that is converted to permanent, the UI SHALL update to hide the delete button and display the permanent status indicator.

**Validates: Requirements 4.5**

### Property 9: Conversion Idempotence

*For any* mailbox that is already permanent, calling the convert-to-permanent API SHALL return success without modifying the mailbox.

**Validates: Requirements 6.6**

### Property 10: Sentinel Value Determines Permanent Status

*For any* mailbox with `expires_at` equal to the sentinel value 9999999999, the computed `isPermanent` field SHALL be true.

**Validates: Requirements 5.2**

### Property 11: Backward Compatibility with Temporary Mailboxes

*For any* mailbox with `expires_at` less than the sentinel value, all existing operations (create, query, delete, email reception) SHALL function identically to the pre-feature behavior.

**Validates: Requirements 5.4**

### Property 12: Random Mailboxes Cannot Be Permanent

*For any* mailbox with addressType random, creation or conversion requests with `isPermanent=true` SHALL be rejected and the mailbox SHALL remain temporary.

**Validates: Requirements 1.4, 4.2, 6.3, 6.7, 7.3**

### Property 13: Email Cleanup Skips Permanent Mailboxes

*For any* email belonging to a permanent mailbox, cleanup tasks for expired or read emails SHALL NOT delete that email.

**Validates: Requirements 2.5**

### Property 14: API Request Includes isPermanent Flag

*For any* mailbox creation request with the permanent option selected in the UI, the API request body SHALL include `isPermanent: true`.

**Validates: Requirements 7.4**

## Error Handling

The permanent mailbox feature introduces new error conditions that must be handled gracefully:

### Backend Error Handling

**Permanent Mailbox Deletion Attempt:**
- Error Code: 403 Forbidden
- Error Message: "Cannot delete permanent mailbox"
- Response: `{ success: false, error: "Cannot delete permanent mailbox" }`
- Behavior: Request is rejected, mailbox remains unchanged

**Permanent Creation Not Allowed for Random:**
- Error Code: 400 Bad Request
- Error Message: "Random mailboxes cannot be permanent"
- Response: `{ success: false, error: "Random mailboxes cannot be permanent" }`
- Behavior: Request is rejected, mailbox remains temporary

**Conversion of Non-Existent Mailbox:**
- Error Code: 404 Not Found
- Error Message: "Mailbox not found"
- Response: `{ success: false, error: "Mailbox not found" }`
- Behavior: Request is rejected with appropriate error

**Database Errors During Conversion:**
- Error Code: 500 Internal Server Error
- Error Message: "Failed to convert mailbox"
- Response: `{ success: false, error: "Failed to convert mailbox", message: <details> }`
- Behavior: Transaction is rolled back, mailbox remains in original state
- Logging: Full error details logged to console for debugging

**Conversion Not Allowed for Random:**
- Error Code: 403 Forbidden
- Error Message: "Random mailboxes cannot be converted to permanent"
- Response: `{ success: false, error: "Random mailboxes cannot be converted to permanent" }`
- Behavior: Request is rejected, mailbox remains temporary

### Frontend Error Handling

**Deletion Attempt on Permanent Mailbox:**
- UI Prevention: Delete button is hidden for permanent mailboxes
- API Fallback: If API is called directly, display error toast with message from backend
- User Feedback: "This permanent mailbox cannot be deleted"

**Conversion Failure:**
- Display error toast with specific error message
- Mailbox state remains unchanged in UI
- User can retry conversion operation
- Error messages:
  - "Failed to convert mailbox" (generic error)
  - "Mailbox not found" (mailbox was deleted)
  - Network errors handled with generic "Network error" message

**localStorage Errors:**
- If localStorage is full or unavailable, log error to console
- Application continues to function using in-memory state
- User may lose mailbox on page refresh (existing behavior)

### Validation Errors

**Invalid isPermanent Parameter:**
- Backend validates that `isPermanent` is a boolean if provided
- Non-boolean values are treated as false (default behavior)
- No error is returned, mailbox is created as temporary

**Invalid isPermanent Combination:**
- If `isPermanent=true` and `addressType=random`, return 400
- If conversion is requested for a random mailbox, return 403

**Concurrent Modification:**
- If mailbox is deleted while conversion is in progress, return 404
- If mailbox is already converted by another request, return success (idempotent)
- No race condition protection needed due to idempotent design

## Testing Strategy

The permanent mailbox feature will be tested using a dual approach combining unit tests for specific scenarios and property-based tests for universal correctness properties.

### Unit Testing

Unit tests will verify specific examples, edge cases, and integration points:

**Backend Unit Tests:**
- Test mailbox creation with `isPermanent=true` sets sentinel value
- Test mailbox creation with `isPermanent=false` sets normal expiry
- Test mailbox creation without `isPermanent` defaults to temporary
- Test mailbox creation with `addressType=random` and `isPermanent=true` returns 400
- Test conversion API with valid temporary mailbox
- Test conversion API with already-permanent mailbox (idempotence)
- Test conversion API with non-existent mailbox (404 error)
- Test conversion API with random mailbox returns 403
- Test delete API with permanent mailbox (403 error)
- Test delete API with temporary mailbox (success)
- Test cleanup task with mixed temporary and permanent mailboxes
- Test cleanupExpiredMails skips permanent mailboxes
- Test cleanupReadMails skips permanent mailboxes
- Test query with expired temporary and permanent mailboxes

**Frontend Unit Tests:**
- Test delete button hidden when `isPermanent=true`
- Test delete button visible when `isPermanent=false`
- Test permanent status indicator displays for permanent mailboxes
- Test conversion button displays for temporary mailboxes
- Test conversion button hidden for permanent mailboxes
- Test permanent option hidden or disabled for random address type
- Test API call includes `isPermanent` flag when permanent option selected for name/custom
- Test localStorage saves and retrieves permanent status correctly

### Property-Based Testing

Property-based tests will verify universal properties across randomized inputs. Each test will run a minimum of 100 iterations.

**Testing Framework:** fast-check (JavaScript/TypeScript property-based testing library)

**Property Test Configuration:**
```typescript
import fc from 'fast-check';

// Minimum 100 iterations per property test
const testConfig = { numRuns: 100 };

// Example property test structure
fc.assert(
  fc.property(
    // Generators for test inputs
    fc.record({
      address: fc.string({ minLength: 3, maxLength: 30 }),
      isPermanent: fc.boolean(),
      // ... other fields
    }),
    // Property assertion
    async (mailbox) => {
      // Test logic
    }
  ),
  testConfig
);
```

**Property Tests to Implement:**

1. **Property 1: Permanent Mailbox Creation Sets Sentinel Value**
   - Generator: Random mailbox parameters with `isPermanent=true` and `addressType` in {name, custom}
   - Assertion: Created mailbox has `expires_at === 9999999999`
   - Tag: `Feature: permanent-mailbox, Property 1: Permanent Mailbox Creation Sets Sentinel Value`

2. **Property 2: Cleanup Task Excludes Permanent Mailboxes**
   - Generator: Random mix of temporary and permanent mailboxes
   - Assertion: After cleanup, all permanent mailboxes still exist
   - Tag: `Feature: permanent-mailbox, Property 2: Cleanup Task Excludes Permanent Mailboxes`

3. **Property 3: Permanent Mailboxes Always Queryable**
   - Generator: Random permanent mailbox and future timestamp
   - Assertion: Query returns mailbox successfully
   - Tag: `Feature: permanent-mailbox, Property 3: Permanent Mailboxes Always Queryable`

4. **Property 4: Email Reception for Permanent Mailboxes**
   - Generator: Random permanent mailbox and valid email
   - Assertion: Email is accepted and stored
   - Tag: `Feature: permanent-mailbox, Property 4: Email Reception for Permanent Mailboxes`

5. **Property 5: Delete Button Visibility Based on Mailbox Type**
   - Generator: Random mailbox with random `isPermanent` value
   - Assertion: Delete button visibility matches `!isPermanent`
   - Tag: `Feature: permanent-mailbox, Property 5: Delete Button Visibility Based on Mailbox Type`

6. **Property 6: API Rejects Permanent Mailbox Deletion**
   - Generator: Random permanent mailbox
   - Assertion: DELETE API returns 403 status
   - Tag: `Feature: permanent-mailbox, Property 6: API Rejects Permanent Mailbox Deletion`

7. **Property 7: Mailbox Conversion Updates to Sentinel Value**
   - Generator: Random temporary mailbox with `addressType` in {name, custom}
   - Assertion: After conversion, `expires_at === 9999999999`
   - Tag: `Feature: permanent-mailbox, Property 7: Mailbox Conversion Updates to Sentinel Value`

8. **Property 8: UI Updates After Conversion**
   - Generator: Random eligible temporary mailbox
   - Assertion: After conversion, UI hides delete button and shows permanent indicator
   - Tag: `Feature: permanent-mailbox, Property 8: UI Updates After Conversion`

9. **Property 9: Conversion Idempotence**
   - Generator: Random permanent mailbox
   - Assertion: Conversion returns success, `expires_at` unchanged
   - Tag: `Feature: permanent-mailbox, Property 9: Conversion Idempotence`

10. **Property 10: Sentinel Value Determines Permanent Status**
    - Generator: Random mailbox with `expires_at = 9999999999`
    - Assertion: `isPermanent === true`
    - Tag: `Feature: permanent-mailbox, Property 10: Sentinel Value Determines Permanent Status`

11. **Property 11: Backward Compatibility with Temporary Mailboxes**
    - Generator: Random temporary mailbox (normal timestamp)
    - Assertion: All operations work identically to pre-feature behavior
    - Tag: `Feature: permanent-mailbox, Property 11: Backward Compatibility with Temporary Mailboxes`

12. **Property 12: Random Mailboxes Cannot Be Permanent**
    - Generator: Random mailbox with `addressType=random` and `isPermanent=true`
    - Assertion: Create/convert requests are rejected and mailbox remains temporary
    - Tag: `Feature: permanent-mailbox, Property 12: Random Mailboxes Cannot Be Permanent`

13. **Property 13: Email Cleanup Skips Permanent Mailboxes**
    - Generator: Random emails associated with permanent and temporary mailboxes
    - Assertion: Cleanup does not remove emails from permanent mailboxes
    - Tag: `Feature: permanent-mailbox, Property 13: Email Cleanup Skips Permanent Mailboxes`

14. **Property 14: API Request Includes isPermanent Flag**
    - Generator: Random mailbox creation with permanent option for name/custom
    - Assertion: API request body contains `isPermanent: true`
    - Tag: `Feature: permanent-mailbox, Property 14: API Request Includes isPermanent Flag`

### Test Data Generators

Property-based tests require generators for creating random test data:

```typescript
// Generator for mailbox addresses
const addressGen = fc.string({ 
  minLength: 3, 
  maxLength: 30,
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-')
});

// Generator for address types
const addressTypeGen = fc.constantFrom('name', 'random', 'custom');

// Generator for mailbox parameters
const mailboxParamsGen = fc.record({
  address: addressGen,
  addressType: addressTypeGen,
  isPermanent: fc.boolean(),
  ipAddress: fc.ipV4(),
  expiresInHours: fc.integer({ min: 1, max: 168 })
}).map(params => ({
  ...params,
  isPermanent: params.addressType === 'random' ? false : params.isPermanent
}));

// Generator for random mailboxes that incorrectly request permanence
const randomPermanentParamsGen = fc.record({
  address: addressGen,
  addressType: fc.constant('random'),
  isPermanent: fc.constant(true),
  ipAddress: fc.ipV4(),
  expiresInHours: fc.integer({ min: 1, max: 168 })
});

// Generator for email content
const emailGen = fc.record({
  fromAddress: fc.emailAddress(),
  toAddress: addressGen,
  subject: fc.string({ maxLength: 200 }),
  textContent: fc.string({ maxLength: 10000 }),
  htmlContent: fc.option(fc.string({ maxLength: 10000 }))
});

// Generator for timestamps (future dates)
const futureTimestampGen = fc.integer({ 
  min: Math.floor(Date.now() / 1000), 
  max: 9999999998 
});
```

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Create Permanent Mailbox Flow:**
   - User selects permanent option in UI
   - Mailbox is created with sentinel value
   - UI displays permanent status
   - Delete button is hidden

2. **Convert Temporary to Permanent Flow:**
   - User creates temporary mailbox
   - User clicks convert button
   - API updates mailbox to permanent
   - UI updates to show permanent status
   - Delete button disappears

3. **Email Reception for Permanent Mailbox:**
   - Create permanent mailbox
   - Send email to mailbox address
   - Verify email is received and stored
   - Verify email persists after cleanup tasks run

4. **Cleanup Task with Mixed Mailboxes:**
   - Create mix of expired temporary, active temporary, and permanent mailboxes
   - Run cleanup task
   - Verify only expired temporary mailboxes are deleted
   - Verify permanent mailboxes remain

5. **Random Mailbox Cannot Be Permanent:**
   - Attempt to create a random mailbox with `isPermanent=true`
   - Verify API returns 400 and mailbox is temporary
   - Attempt to convert a random mailbox
   - Verify API returns 403 and mailbox remains temporary

### Test Coverage Goals

- Backend code coverage: > 90%
- Frontend component coverage: > 85%
- All 14 correctness properties tested with property-based tests
- All error conditions tested with unit tests
- All user workflows tested with integration tests
