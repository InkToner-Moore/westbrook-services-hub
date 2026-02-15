# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode  
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Architecture

This is a React + TypeScript application built with Vite, using shadcn/ui components and Tailwind CSS.

### Key Technologies
- **React 18** with TypeScript
- **Vite** as build tool with SWC for fast compilation
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with custom theme system
- **React Router** for client-side routing
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Lucide React** for icons

### Project Structure
- `src/App.tsx` - Main app component with routing setup
- `src/pages/` - Page components (Index.tsx, NotFound.tsx)
- `src/components/ui/` - shadcn/ui components (Button, Card, Input, etc.)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and configurations
- `components.json` - shadcn/ui configuration

### Theme & Styling
- **Dual theme support**: Dark mode (default) and light mode
- Theme toggle implemented with state management in Index.tsx:272
- Custom CSS variables for theme switching
- Extensive use of backdrop-blur effects and gradients
- Responsive design with mobile-first approach

### Business Domain
This is a website for "Ink, Toner, & Moore" - a Calgary-based office services business located in Westbrook Mall. The site features:

- **Package tracking** with intelligent courier detection (UPS, FedEx, Purolator)
- **Service availability checkers** for ink cartridges, key cutting, and refills
- **Business information** including hours, location, and contact details
- **Interactive UI** with animated backgrounds and smooth transitions

### Key Features
- **Smart package tracking**: Advanced courier detection algorithm in Index.tsx:18-151
- **UPS checksum validation**: Validates UPS tracking numbers using checksum algorithm
- **Dynamic theme switching**: Light/dark mode toggle with smooth transitions
- **Responsive animations**: Floating particles, gradient backgrounds, hover effects
- **Form validation**: Uses React Hook Form with proper error handling

### Component Patterns
- Components use conditional classes based on `isDarkMode` state
- Extensive use of backdrop-blur and gradient effects
- Consistent use of shadcn/ui components for forms and UI elements
- Icons from Lucide React with consistent sizing and styling

### Development Notes
- TypeScript configuration is relaxed (noImplicitAny: false, strictNullChecks: false)
- Path aliases configured: `@/*` maps to `./src/*`
- Vite dev server runs on port 8080 with host "::" for network access
- Uses lovable-tagger plugin in development mode for component tagging

### Testing
No test framework is currently configured in this project.

## Final Product Summary

**IMPORTANT**: The current code is a draft made by Lovable AI. Track all changes in git comprehensively. This website is being built for staff at Ink, Toner, & Moore to make their job better and easier. The design should be sleek and good looking but also simple and not overwhelming so older customers can use it easily.

### Staff Portal (Login Required)

- Smart Shipping Tracker - Auto-detects courier from tracking number, redirects to proper website
- Custom Receipt Generator - Templates specific to business needs
- Website Directory - list of all sites we commonly access
- Customer Cartridge Manager - Track refill status, update completion
- Inventory System - Keys/cartridges stock levels, prices, availability
- Notes System - Internal staff notes and reminders
- Blog/Announcements - Simple CMS for updates

### Public Customer Portal

- Package Tracker - Same smart tracking system as staff
- Refill Status Checker - Check if their cartridge is ready
- Compatibility Checker - Enter model number to see if refillable
- Product Lookup - Search keys/printers availability
- Contact Hub - Forms, details, hours, location
- Blog/News - Customer-facing announcements

### Technical Features

- Email/SMS Notifications (optional) - Auto-remind customers when cartridges ready
- Mobile Responsive - Works on phones/tablets as well as desktop
- Fast & Reliable - No downtime, quick loading
- Easy Content Management - Staff can manage data through the staff portal (persisted in Firestore)
- Secure - Staff login, API keys protected

### Cost Structure

- Domain: $12/year
- Hosting/Database/API: Free (within business usage limits)
- SMS notifications: ~$1-2/month (optional) (for now don't implement)
- Total: $12-36/year

## Tech Stack Implementation

### Frontend

- React - Main application framework
- React Router - Multi-page navigation (staff vs public views)
- React Hook Form - Form handling for receipts/updates
- CSS Framework - Tailwind CSS

### Backend/Database

- Firebase Firestore - Primary database (cartridge orders, notes, public order status)
- Firebase Auth - Staff authentication (email/password)

### Hosting & Deployment

- GitHub Pages - Free static site hosting
- GitHub Actions - Auto-deployment on code changes
- Custom Domain - Business domain pointing to GitHub Pages

### External Services

- EmailJS - Email notifications (free tier)
- Twilio - SMS notifications (~$0.0075/message) (not for now)

### Development Tools

- Vite - Fast build tool and dev server
- Claude/AI Tools - Development assistance
- Git/GitHub - Version control and deployment

### Firestore Collections

- `cartridgeOrders` - Full cartridge order data (staff-only read/write)
- `notes` - Staff notes (staff-only read/write)
- `orderStatus` - Minimal order status mirror (public read, staff write) containing only orderId, customerPhone, and status

### Security

- Firebase Auth - Email/password login for staff
- Firestore Security Rules - Auth-gated writes, public read only on orderStatus
- Environment Variables - Firebase config in .env
- HTTPS - SSL certificates (free with GitHub Pages)
- Input Validation - Form sanitization