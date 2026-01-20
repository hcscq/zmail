# Requirements Document

## Introduction

This document specifies the requirements for adding permanent mailbox functionality to ZMAIL. Currently, all mailboxes expire after 24 hours. This feature will allow users to create mailboxes that never expire and can be retained indefinitely. Permanent mailboxes will not display delete functionality in the UI. Existing temporary mailboxes created via name or custom address types can be converted to permanent status; random mailboxes cannot be permanent.

## Glossary

- **System**: The ZMAIL temporary email service
- **Mailbox**: An email address that can receive emails
- **Temporary_Mailbox**: A mailbox that expires after 24 hours
- **Permanent_Mailbox**: A mailbox that never expires and cannot be deleted by the user
- **Address_Type**: The mailbox creation mode: random, name, or custom
- **Permanent_Eligible**: Address types that can be permanent (name, custom)
- **User**: A person accessing the ZMAIL service
- **Expiry_Status**: A property indicating whether a mailbox is temporary or permanent
- **UI**: The user interface (frontend application)
- **Backend**: The Cloudflare Worker and D1 database
- **Cleanup_Task**: The scheduled cron job that removes expired mailboxes

## Requirements

### Requirement 1: Create Permanent Mailbox

**User Story:** As a user, I want to create a mailbox that never expires, so that I can use the same email address indefinitely without worrying about losing access.

#### Acceptance Criteria

1. WHEN creating a new mailbox with address type name or custom, THE System SHALL provide an option to mark the mailbox as permanent
2. WHEN a user selects the permanent option, THE System SHALL create a mailbox with expires_at set to the sentinel value indicating permanence
3. WHEN a permanent mailbox is created, THE System SHALL store the permanent status and address_type in the database
4. WHEN a request attempts to create a permanent mailbox with address type random, THE Backend SHALL reject the request with an appropriate error
5. WHERE a mailbox is marked as permanent, THE System SHALL display a visual indicator in the UI showing the mailbox will not expire

### Requirement 2: Permanent Mailbox Persistence

**User Story:** As a user with a permanent mailbox, I want my mailbox to remain accessible indefinitely, so that I can continue receiving emails without interruption.

#### Acceptance Criteria

1. WHEN the cleanup task runs, THE System SHALL exclude permanent mailboxes from deletion
2. WHEN querying mailboxes, THE Backend SHALL return permanent mailboxes regardless of time elapsed since creation
3. WHEN a permanent mailbox exists, THE System SHALL continue accepting emails for that address indefinitely
4. THE System SHALL maintain all functionality for permanent mailboxes including email reception, storage, and retrieval
5. WHEN the cleanup tasks for expired or read emails run, THE System SHALL NOT delete emails that belong to permanent mailboxes

### Requirement 3: Hide Delete Functionality for Permanent Mailboxes

**User Story:** As a user with a permanent mailbox, I want the delete button to be hidden, so that I cannot accidentally delete my permanent mailbox.

#### Acceptance Criteria

1. WHEN displaying a permanent mailbox in the UI, THE System SHALL hide the delete button
2. WHEN displaying a temporary mailbox in the UI, THE System SHALL show the delete button
3. WHEN a user attempts to delete a permanent mailbox via API, THE Backend SHALL reject the request with an appropriate error
4. WHERE a mailbox is permanent, THE UI SHALL display explanatory text indicating the mailbox cannot be deleted

### Requirement 4: Convert Temporary Mailbox to Permanent

**User Story:** As a user with an existing temporary mailbox, I want to convert it to a permanent mailbox, so that I can keep using the same address without it expiring.

#### Acceptance Criteria

1. WHEN viewing a temporary mailbox created with address type name or custom, THE System SHALL provide a conversion option in the UI
2. WHEN viewing a temporary mailbox created with address type random, THE System SHALL NOT provide a conversion option in the UI
3. WHEN a user initiates conversion for an eligible mailbox, THE System SHALL update the mailbox status to permanent
4. WHEN conversion occurs, THE Backend SHALL update the expires_at field to the permanent sentinel value
5. WHEN conversion completes, THE UI SHALL update to reflect the permanent status and hide the delete button
6. WHEN conversion is successful, THE System SHALL display a confirmation message to the user
7. WHEN conversion is attempted on a random mailbox via API, THE Backend SHALL reject the request with an appropriate error

### Requirement 5: Database Schema Support

**User Story:** As a system administrator, I want the database to properly store and query permanent mailbox status, so that the system can reliably distinguish between temporary and permanent mailboxes.

#### Acceptance Criteria

1. THE Backend SHALL use a sentinel value of 9999999999 (far future timestamp) to represent permanent mailboxes in the expires_at field
2. WHEN querying mailboxes, THE Backend SHALL treat mailboxes with the sentinel expires_at value as permanent
3. WHEN filtering expired mailboxes, THE Backend SHALL exclude mailboxes with the permanent sentinel value
4. THE Backend SHALL maintain backward compatibility with existing temporary mailboxes
5. THE Backend SHALL store mailbox address_type in the database for permanence eligibility checks
6. WHERE address_type is missing on legacy rows, THE Backend SHALL default address_type to random for permanence eligibility decisions

### Requirement 6: API Endpoints for Permanent Mailboxes

**User Story:** As a frontend developer, I want clear API endpoints for creating and converting permanent mailboxes, so that I can implement the UI functionality correctly.

#### Acceptance Criteria

1. WHEN creating a mailbox via POST to /api/mailboxes, THE Backend SHALL accept an optional isPermanent parameter
2. WHEN isPermanent is true and addressType is name or custom, THE Backend SHALL create a permanent mailbox
3. WHEN isPermanent is true and addressType is random, THE Backend SHALL return an error with status code 400
4. THE Backend SHALL provide a PATCH endpoint at /api/mailboxes/:address/convert-to-permanent
5. WHEN the convert endpoint is called on an eligible mailbox, THE Backend SHALL update the mailbox to permanent status
6. WHEN the convert endpoint is called on a permanent mailbox, THE Backend SHALL return success without modification
7. WHEN the convert endpoint is called on a random mailbox, THE Backend SHALL return an error with status code 403
8. WHEN attempting to delete a permanent mailbox, THE Backend SHALL return an error with status code 403

### Requirement 7: UI Address Type Selection

**User Story:** As a user, I want to see the permanent option when selecting how to create my mailbox, so that I can easily choose between temporary and permanent mailboxes.

#### Acceptance Criteria

1. WHEN the address type selector is displayed, THE UI SHALL include random, name, and custom address type options
2. WHEN the selected address type is name or custom, THE UI SHALL display a permanent mailbox option and explanatory text
3. WHEN the selected address type is random, THE UI SHALL hide or disable the permanent option and explain that random mailboxes cannot be permanent
4. WHEN creating a mailbox with the permanent option enabled, THE UI SHALL pass the isPermanent flag to the API

### Requirement 8: Mailbox Information Display

**User Story:** As a user, I want to clearly see whether my mailbox is permanent or temporary, so that I understand its expiration behavior.

#### Acceptance Criteria

1. WHEN displaying mailbox information, THE UI SHALL show an expiration status indicator
2. WHERE a mailbox is permanent, THE UI SHALL display text indicating the mailbox will not expire and hide remaining time
3. WHERE a mailbox is temporary, THE UI SHALL display the remaining time until expiration
4. THE UI SHALL use distinct visual styling to differentiate permanent from temporary mailboxes
