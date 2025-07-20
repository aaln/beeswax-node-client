# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-20

### Added
- Full TypeScript support with comprehensive type definitions
- `createLineItem()` helper method with sensible defaults
- Automatic retry logic with configurable options
- Campaign macros for complex operations:
  - `createFullCampaign()` - Create complete campaigns with line items and creatives
  - `cloneCampaign()` - Clone existing campaigns with modifications
  - `bulkCreateLineItems()` - Create multiple line items at once
  - `bulkUpdateCampaignStatus()` - Update multiple campaign statuses
- Jest test suite with integration tests
- Comprehensive documentation and examples

### Changed
- Migrated from JavaScript to TypeScript
- Updated API field mappings to match current Beeswax API:
  - Line items now use `bidding` object instead of `bid_price`
  - Creative types changed from strings to integers
  - Creative line item associations use `weighting` instead of `weight`
- Improved error handling with better error messages
- Set default `budget_type` to 2 (cents) for campaigns

### Fixed
- Line item creation with proper bidding structure
- Creative creation with required fields
- Campaign cloning by excluding read-only fields
- Proper cleanup order for deleting campaigns with dependencies

### Deprecated
- Targeting templates (use Targeting Expressions API v2 instead)

## [1.0.0] - Previous version

- Initial release with basic functionality