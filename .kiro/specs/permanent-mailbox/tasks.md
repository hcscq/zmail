# Implementation Plan: Permanent Mailbox Feature

## Overview

This implementation plan breaks down the permanent mailbox feature into discrete coding tasks. The approach follows a bottom-up strategy: starting with backend utilities and database functions, then API endpoints, and finally frontend components. Each task builds on previous work to ensure incremental progress with no orphaned code.

## Tasks

- [x] 1. Add backend utility functions for permanent mailbox support
  - Add `PERMANENT_MAILBOX_SENTINEL` constant (value: 9999999999)
  - Implement `isPermanentMailbox(expiresAt: number): boolean` function
  - Implement `isPermanentAllowedForAddressType(addressType: AddressType): boolean` function
  - Implement `calculateMailboxExpiry(hours: number, isPermanent: boolean): number` function
  - _Requirements: 5.1, 5.2_

- [ ]* 1.1 Write property test for calculateMailboxExpiry
  - **Property 1: Permanent Mailbox Creation Sets Sentinel Value**
  - **Validates: Requirements 1.2, 1.3, 5.1, 6.2**

- [x] 2. Update TypeScript types for permanent mailbox support
  - Extend `CreateMailboxParams` interface to include `addressType` and optional `isPermanent?: boolean` fields
  - Extend `Mailbox` interface to include `addressType` and optional `isPermanent?: boolean` computed field
  - _Requirements: 1.2, 5.2, 5.5_

- [x] 3. Modify database functions to support permanent mailboxes
  - [x] 3.0 Update `mailboxes` schema to store address type
    - Add `address_type` column with default 'random'
    - Backfill existing rows to 'random' for compatibility
    - _Requirements: 5.5, 5.6_
  - [x] 3.1 Update `createMailbox` function to use `calculateMailboxExpiry` and set `isPermanent` field
    - Modify to accept `isPermanent` parameter from `CreateMailboxParams`
    - Store `address_type` in the mailboxes table
    - Enforce `isPermanent` only for addressType name/custom
    - Use `calculateMailboxExpiry` to set `expiresAt` value
    - Set `isPermanent` computed field in returned mailbox object
    - _Requirements: 1.2, 1.3, 1.4, 5.5_

  - [ ]* 3.2 Write property test for createMailbox with isPermanent
    - **Property 1: Permanent Mailbox Creation Sets Sentinel Value**
    - **Validates: Requirements 1.2, 1.3, 5.1, 6.2**

  - [x] 3.3 Update `getMailbox` function to handle permanent mailboxes
    - Modify WHERE clause to include: `(expires_at > ? OR expires_at = ?)`
    - Bind both current timestamp and `PERMANENT_MAILBOX_SENTINEL`
    - Set `isPermanent` computed field using `isPermanentMailbox` helper
    - Return `addressType` from `address_type`
    - _Requirements: 2.2, 5.2, 5.5_

  - [ ]* 3.4 Write property test for getMailbox with permanent mailboxes
    - **Property 3: Permanent Mailboxes Always Queryable**
    - **Validates: Requirements 2.2**

  - [x] 3.5 Implement `convertMailboxToPermanent` function
    - Create new function that updates `expires_at` to sentinel value
    - Return boolean indicating if update occurred (for idempotence check)
    - Ensure conversion only applies to addressType name/custom
    - _Requirements: 4.3, 4.4, 4.7_

  - [ ]* 3.6 Write property tests for convertMailboxToPermanent
    - **Property 7: Mailbox Conversion Updates to Sentinel Value**
    - **Validates: Requirements 4.3, 4.4, 6.5**
    - **Property 9: Conversion Idempotence**
    - **Validates: Requirements 6.6**

  - [x] 3.7 Update `deleteMailbox` function to prevent permanent mailbox deletion
    - Check if mailbox is permanent before deletion
    - Return error object: `{ success: false, error: 'Cannot delete permanent mailbox' }`
    - Only delete if mailbox is temporary
    - _Requirements: 3.3, 6.8_

  - [ ]* 3.8 Write property test for deleteMailbox rejection
    - **Property 6: API Rejects Permanent Mailbox Deletion**
    - **Validates: Requirements 3.3, 6.8**

  - [x] 3.9 Update `cleanupExpiredMailboxes` function to exclude permanent mailboxes
    - Modify WHERE clause to: `WHERE expires_at <= ? AND expires_at != ?`
    - Bind both current timestamp and `PERMANENT_MAILBOX_SENTINEL`
    - _Requirements: 2.1, 5.3_

  - [ ]* 3.10 Write property test for cleanup exclusion
    - **Property 2: Cleanup Task Excludes Permanent Mailboxes**
    - **Validates: Requirements 2.1, 5.3**

  - [x] 3.11 Update email cleanup to preserve permanent mailbox emails
    - Update `cleanupExpiredMails` to skip mailboxes with sentinel value
    - Update `cleanupReadMails` to skip mailboxes with sentinel value
    - _Requirements: 2.5_

  - [ ]* 3.12 Write property test for email cleanup exclusion
    - **Property 13: Email Cleanup Skips Permanent Mailboxes**
    - **Validates: Requirements 2.5**

  - [ ]* 3.13 Write property test for backward compatibility
    - **Property 11: Backward Compatibility with Temporary Mailboxes**
    - **Validates: Requirements 5.4**

- [x] 4. Checkpoint - Ensure backend database tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add API endpoints for permanent mailbox functionality
  - [x] 5.1 Update CORS configuration to allow PATCH
    - Add PATCH to allowMethods for the new convert endpoint
    - _Requirements: 6.4_

  - [x] 5.2 Update POST /api/mailboxes endpoint to accept isPermanent parameter
    - Extract `isPermanent` from request body (default: false)
    - Reject `isPermanent=true` when `addressType=random` with 400
    - Pass `isPermanent` and `addressType` to `createMailbox` function
    - Return mailbox with `isPermanent` field in response
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.3 Write unit test for POST /api/mailboxes with isPermanent
    - Test with `isPermanent: true` and addressType name/custom creates permanent mailbox
    - Test with `isPermanent: true` and addressType random returns 400
    - Test with `isPermanent: false` creates temporary mailbox
    - Test without `isPermanent` defaults to temporary
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.4 Implement PATCH /api/mailboxes/:address/convert-to-permanent endpoint
    - Check if mailbox exists (return 404 if not)
    - Reject conversion for random mailboxes with 403
    - Check if already permanent (return success with message)
    - Call `convertMailboxToPermanent` function
    - Fetch and return updated mailbox
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.5 Write unit tests for convert-to-permanent endpoint
    - Test conversion of eligible temporary mailbox succeeds
    - Test conversion of permanent mailbox is idempotent
    - Test conversion of non-existent mailbox returns 404
    - Test conversion of random mailbox returns 403
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.6 Write property test for random permanence rejection
    - **Property 12: Random Mailboxes Cannot Be Permanent**
    - **Validates: Requirements 1.4, 4.2, 6.3, 6.7, 7.3**

  - [x] 5.7 Update DELETE /api/mailboxes/:address endpoint to handle permanent mailboxes
    - Check result from `deleteMailbox` function
    - Return 403 status if error is "Cannot delete permanent mailbox"
    - Return 404 status for other errors
    - _Requirements: 3.3, 6.8_

  - [ ]* 5.8 Write unit test for DELETE endpoint with permanent mailbox
    - Test deletion of permanent mailbox returns 403
    - Test deletion of temporary mailbox succeeds
    - _Requirements: 3.3, 6.8_

- [x] 6. Checkpoint - Ensure backend API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update frontend API utilities for permanent mailbox support
  - [x] 7.1 Keep AddressType limited to name/random/custom
    - Ensure type definition remains `export type AddressType = 'name' | 'random' | 'custom';`
    - _Requirements: 7.1_

  - [x] 7.2 Update createMailboxWithType function to support isPermanent parameter
    - Add optional `isPermanent` parameter (default: false)
    - Include `isPermanent` in request body only when true
    - Ensure callers only set `isPermanent` for name/custom
    - _Requirements: 6.1, 7.4_

  - [ ]* 7.3 Write unit test for createMailboxWithType with isPermanent
    - **Property 14: API Request Includes isPermanent Flag**
    - **Validates: Requirements 7.4**

  - [x] 7.4 Implement convertMailboxToPermanent API function
    - Create new function that calls PATCH /api/mailboxes/:address/convert-to-permanent
    - Return success/error result with updated mailbox
    - _Requirements: 6.4_

  - [ ]* 7.5 Write unit test for convertMailboxToPermanent function
    - Test successful conversion returns updated mailbox
    - Test error handling for failed conversion
    - _Requirements: 6.4_

- [x] 8. Update MailboxContext to support permanent mailbox operations
  - [x] 8.1 Add convertToPermanent function to context
    - Call `convertMailboxToPermanent` API function
    - Update mailbox state with returned mailbox
    - Save updated mailbox to localStorage
    - Show success/error message
    - _Requirements: 4.3, 4.6_

  - [x] 8.2 Add permanent option state and enforce eligibility
    - Track permanent toggle state (default false)
    - Reset permanent option when switching to random
    - Pass `isPermanent: true` only for name/custom
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ]* 8.3 Write unit tests for MailboxContext permanent operations
    - Test convertToPermanent updates state correctly
    - Test createMailboxWithAddressType with permanent option for name/custom
    - Test permanent option is cleared/blocked for random
    - _Requirements: 4.3, 7.2, 7.3, 7.4_

- [x] 9. Add UI components for permanent mailbox selection
  - [x] 9.1 Update AddressTypeSelector component to support permanent toggle
    - Keep random/name/custom address type options
    - Show permanent toggle only for name/custom
    - Display explanatory text for permanence and ineligibility of random
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.2 Update mailbox creation controls to honor permanent toggle
    - Pass `isPermanent` based on the toggle for name/custom
    - Ensure random selection disables or clears the permanent toggle
    - _Requirements: 7.3, 7.4_

  - [ ]* 9.3 Write unit tests for address type selection
    - Test permanent toggle is shown for name/custom and hidden/disabled for random
    - Test explanatory text for permanence and random restriction
    - Test creating mailbox with permanent passes correct flag for name/custom
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Add UI components for displaying permanent mailbox status
  - [x] 10.1 Update MailboxInfo component to show permanent status
    - Display "Permanent" badge or indicator when `isPermanent` is true
    - Display expiration time only for temporary mailboxes
    - Use distinct visual styling for permanent mailboxes
    - _Requirements: 1.5, 8.1, 8.2, 8.4_

  - [x] 10.2 Add conversion button for temporary mailboxes
    - Show "Make Permanent" button only when `isPermanent` is false and addressType is name/custom
    - Call `convertToPermanent` from context when clicked
    - Hide button after successful conversion
    - _Requirements: 4.1, 4.5_

  - [x] 10.3 Hide delete button for permanent mailboxes
    - Conditionally render delete button based on `!isPermanent`
    - Add explanatory text for permanent mailboxes
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ]* 10.4 Write property test for delete button visibility
    - **Property 5: Delete Button Visibility Based on Mailbox Type**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 10.5 Write unit tests for permanent mailbox UI
    - Test permanent badge displays for permanent mailboxes
    - Test conversion button displays for temporary mailboxes
    - Test delete button hidden for permanent mailboxes
    - Test UI updates after conversion
    - _Requirements: 1.5, 3.1, 3.2, 3.4, 4.1, 4.5, 8.1, 8.2, 8.4_

- [x] 11. Add internationalization strings for permanent mailbox feature
  - Add translation keys for permanent mailbox UI text
  - Include: permanent option label, description, status indicator, conversion button, success/error messages, random ineligibility message
  - Add translations for both English and Chinese
  - _Requirements: 1.5, 3.4, 4.6, 7.2, 7.3, 8.2_

- [x] 12. Final checkpoint - Integration testing
  - Test complete flow: create permanent mailbox, verify status, verify delete button hidden
  - Test complete flow: create temporary mailbox, convert to permanent, verify UI updates
  - Test email reception for permanent mailboxes and verify emails persist after cleanup
  - Test cleanup task with mixed mailboxes
  - Test random mailbox creation with `isPermanent=true` returns error
  - Test conversion attempt on random mailbox returns error
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: utilities → database → API → frontend
- All code changes maintain backward compatibility with existing temporary mailboxes
