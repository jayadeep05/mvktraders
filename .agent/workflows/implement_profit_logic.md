---
description: Implement Profit Calculation & Compounding Logic
---

# Feature Implementation: Profit Calculation & Compounding

This workflow guides the implementation of the specified Profit Engine.

## Step 1: Database & Entity Updates ([Backend])
- [x] **Create `GlobalConfiguration` Entity:**
    - [x] Table: `global_configuration`
    - [x] Fields: `key` (String, unique), `value` (String), `description` (String).
- [x] **Create `ProfitMode` Enum:**
    - [x] Values: `FIXED`, `COMPOUNDING`
- [x] **Update `Portfolio` Entity:**
    - [x] Add `profitMode` field (EnumType.STRING).
- [x] **Update `MonthlyProfitHistory` Entity:**
    - [x] Add `eligibleCapital` (BigDecimal).
    - [x] Add `profitMode` (String/Enum).
    - [x] Add `isProrated` (boolean).

## Step 2: Global Configuration Service ([Backend])
- [x] **Create `GlobalConfigRepository`:** Standard JPA Repository.
- [x] **Create `GlobalConfigService`:**
    - [x] Methods to `getValue(key)`, `setValue(key, value)`.
    - [x] Methods specifically for the typed parameters (e.g., `getFixedMonthlyRate()` returning BigDecimal).
    - [x] Pre-seed default values if keys don't exist.

## Step 3: Core Profit Logic ([Backend])
- [x] **Create `ProfitCalculationService`:**
    - [x] Algorithm:
        1.  Fetch active users/portfolios.
        2.  For each portfolio, determine `eligibleCapital`.
        3.  Check `USE_FIRST_MONTH_PRORATION` config.
        4.  Calculate `activeDays` or `monthlyCutoff` based on `User.createdAt` (or a new `adminApprovalDate` if added).
        5.  Select Rate based on `profitMode`.
        6.  `profit = eligibleCapital * rate`.
        7.  If `COMPOUNDING` && `not first month`: `portfolio.totalInvested += profit`.
        8.  Else: `portfolio.availableProfit += profit`.
        9.  Save `MonthlyProfitHistory`.
        10. Create `Transaction` record (Type: PROFIT).

## Step 4: Admin API ([Backend])
- [x] **Update `AdminController`:**
    - [x] `GET /api/admin/config`: Fetch all global configs.
    - [x] `PUT /api/admin/config`: Update configs.
    - [x] `POST /api/admin/profit/calculate`: Trigger the monthly calculation (idempotent, takes month/year).
    - [x] `GET /api/admin/profit/preview`: (Optional) Dry-run to show what would happen.

## Step 5: Frontend Integration ([Frontend/Mobile])
*   (Optional for this workflow, can be separate) Add UI screens for Admin to set these configs.

// turbo-all
