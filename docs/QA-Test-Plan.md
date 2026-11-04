# Sprint 1 Quality Assurance Test Plan

## 1. Introduction

The purpose of this test plan is to check whether the Hope, Inc. ERP system works correctly and meets the requirements of Sprint 1.

## 2. Testing Objectives

- Verify that users can log in using valid credentials.
- Check that invalid login attempts are handled correctly.
- Verify user access permissions.
- Check user management functions.
- Identify and report software defects.
- Confirm that fixed defects work correctly after retesting.

## 3. Scope of Testing

The testing will cover:

- Authentication and login
- Access control and user permissions
- User management
- Input validation and error messages
- Basic navigation and system functionality

## 4. Testing Methods

### Manual Testing
A tester will manually use the system to check whether its features work as expected.

### Edge-Case Testing
The tester will check unusual or incorrect inputs, such as empty fields, invalid credentials, and unauthorized access attempts.

### Automated Testing
Automated tests may be used to check important functions, such as login validation and page loading, when the necessary test scripts are available.

## 5. Test Environment

- Project: Hope, Inc. ERP
- Repository: 2BSIT-2_AltF4Project
- Browser: Google Chrome or another supported browser
- Test data: Sample user accounts and test credentials
- Environment: The development or test environment provided by the team

No real passwords or sensitive personal information should be used in test data.

## 6. Entry Criteria

- The feature being tested is available.
- Requirements and expected results are documented.
- Test accounts or sample data are prepared.

## 7. Exit Criteria

- Planned test cases have been executed where the features are available.
- Test results are documented.
- Critical defects are reported to the development team.
- Fixed defects are retested.
- Remaining defects are documented.

## 8. Bug Severity and Priority

### Severity
- Critical: A major system failure that prevents essential functions from working.
- High: An important feature is unusable.
- Medium: A feature has a problem but the system remains usable.
- Low: A minor issue with limited impact.

### Priority
- P1 – Urgent: Needs immediate attention.
- P2 – High: Should be fixed soon.
- P3 – Medium: Can be fixed in the normal development cycle.
- P4 – Low: Can be addressed later.

Severity describes the impact of a defect, while priority describes how urgently it should be fixed.

## 9. Defect Reporting

Each bug report should contain:

- Bug title and description
- Steps to reproduce the issue
- Expected result
- Actual result
- Severity and priority
- Screenshot or other evidence, when available
- Current status

## 10. Responsibilities

The tester prepares test cases, executes available tests, records results, reports defects, and verifies fixes. Developers investigate and resolve reported defects.

## 11. Conclusion

This test plan provides a basic approach for checking Sprint 1 functionality, recording defects, and helping ensure that the system meets its documented requirements.
