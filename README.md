# Pesa

A personal finance app built with React Native and Expo. Track transactions, manage budgets, plan debt payoff, and save towards goals — all in one place.

## Features

- **Transaction Logging** — Log expenses manually, paste M-Pesa/bank SMS messages for auto-parsing, or commit future transactions
- **Budget Management** — Set up monthly budgets with categories grouped by type (needs, wants, savings, debt, etc.) and track spending against projections
- **Debt Tracker** — Monitor multiple debts with APR, payment schedules, payoff projections, and a "What If I Pay More?" simulator
- **Savings Goals** — Create goals with target amounts and dates, track progress, and see monthly contribution requirements
- **Reminders** — Set payment reminders linked to transactions or categories with recurring schedules
- **Insights** — View spending patterns and budget analytics
- **Data Export** — Export financial data via XLSX

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) with [expo-router](https://docs.expo.dev/router/introduction/) |
| Language | TypeScript |
| UI | React Native + custom themed components |
| State | [Zustand](https://zustand-demo.pmnd.rs/) with AsyncStorage persistence |
| Animations | React Native Reanimated |
| Date Handling | date-fns |

## Getting Started

### Prerequisites

- Node.js 18+
- [Bun](https://bun.sh/) (or npm/yarn)
- iOS Simulator or Android Emulator (or Expo Go on a physical device)

### Install & Run

```bash
# Install dependencies
bun install

# Start the dev server
bun start

# Run on iOS
bun ios

# Run on Android
bun android
```

## Project Structure

```
src/
  screens/        # App screens (Dashboard, Budget, Plan, Settings, etc.)
  stores/         # Zustand stores (transactions, budgets, debts, goals, reminders, settings)
  components/     # Reusable UI components (Card, ProgressBar, FAB, etc.)
  hooks/          # Custom hooks (useTheme)
  theme/          # Colors, spacing, and design tokens
  utils/          # Helpers (formatters, SMS parser, debt/goal calculators)
app/              # Expo Router file-based routing
```
