# Requirements Document

## Introduction

本功能为ZMAIL临时邮箱系统添加英文名邮箱生成器。用户在创建新邮箱时可以选择三种方式：生成具有合理英文名称的邮箱、生成完全随机的邮箱、或手动输入自定义邮箱地址。英文名邮箱将使用常见的英文名字组合，使邮箱地址更易读、更专业。

## Glossary

- **Name_Generator**: 英文名生成器模块，负责生成具有合理英文名称格式的邮箱地址
- **Address_Type**: 邮箱地址类型，包括 "name"（英文名）、"random"（随机）、"custom"（自定义）
- **Name_Pool**: 英文名字库，包含常见的英文名字和姓氏
- **Mailbox_Creator**: 邮箱创建组件，提供用户选择地址生成方式的界面
- **Address_Format**: 邮箱地址格式，如 "firstname.lastname"、"firstnamelastname123" 等

## Requirements

### Requirement 1: 地址类型选择

**User Story:** As a user, I want to choose how my email address is generated, so that I can have an address that suits my preference.

#### Acceptance Criteria

1. WHEN a user initiates mailbox creation, THE Mailbox_Creator SHALL display three options: "English Name", "Random", and "Custom Input"
2. WHEN a user selects "English Name" option, THE System SHALL generate an address using the Name_Generator
3. WHEN a user selects "Random" option, THE System SHALL generate a completely random address
4. WHEN a user selects "Custom Input" option, THE System SHALL display an input field for manual address entry
5. THE Mailbox_Creator SHALL remember the user's last selected option for future mailbox creations

### Requirement 2: 英文名生成器

**User Story:** As a user, I want to get a readable English name-based email address, so that my temporary email looks more professional and memorable.

#### Acceptance Criteria

1. THE Name_Generator SHALL maintain a Name_Pool containing at least 100 common English first names
2. THE Name_Generator SHALL maintain a Name_Pool containing at least 50 common English last names
3. WHEN generating a name-based address, THE Name_Generator SHALL combine first name and last name using one of the following formats: "firstname.lastname", "firstnamelastname", "firstname_lastname", or "firstnamelastname" followed by 2-3 random digits
4. THE Name_Generator SHALL ensure all generated addresses are lowercase
5. THE Name_Generator SHALL ensure generated addresses are between 6 and 20 characters in length
6. IF a generated address already exists, THEN THE Name_Generator SHALL regenerate with a different combination

### Requirement 3: 随机地址生成

**User Story:** As a user, I want to generate a completely random email address, so that I can have maximum anonymity.

#### Acceptance Criteria

1. WHEN generating a random address, THE System SHALL create an 8-12 character alphanumeric string
2. THE System SHALL use only lowercase letters and numbers for random addresses
3. THE System SHALL ensure random addresses do not start with a number

### Requirement 4: 自定义地址输入

**User Story:** As a user, I want to manually enter my preferred email address, so that I can use a specific address I have in mind.

#### Acceptance Criteria

1. WHEN a user enters a custom address, THE System SHALL validate the input in real-time
2. THE System SHALL accept only alphanumeric characters, dots, underscores, and hyphens
3. THE System SHALL require the address to be between 3 and 30 characters
4. IF the custom address is invalid, THEN THE System SHALL display a clear error message explaining the validation rules
5. IF the custom address already exists, THEN THE System SHALL inform the user and suggest alternatives

### Requirement 5: 用户界面集成

**User Story:** As a user, I want a seamless experience when creating mailboxes with different address types, so that the process is intuitive and efficient.

#### Acceptance Criteria

1. THE Mailbox_Creator SHALL display the address type selector prominently before the create button
2. WHEN an address type is selected, THE Mailbox_Creator SHALL show a preview of the generated address (for "English Name" and "Random" options)
3. THE Mailbox_Creator SHALL provide a "regenerate" button to get a new address without changing the selected type
4. THE Mailbox_Creator SHALL support both Chinese and English language interfaces
5. WHEN the mailbox is successfully created, THE System SHALL display the full email address with the selected domain

### Requirement 6: API扩展

**User Story:** As a developer, I want the API to support different address generation types, so that the frontend can request specific address formats.

#### Acceptance Criteria

1. THE API SHALL accept an optional "addressType" parameter with values "name", "random", or "custom"
2. WHEN "addressType" is "name", THE API SHALL use the Name_Generator to create the address
3. WHEN "addressType" is "random" or not provided, THE API SHALL use the existing random generation logic
4. WHEN "addressType" is "custom", THE API SHALL require the "address" parameter to be provided
5. THE API SHALL return the generated address type in the response for client reference
