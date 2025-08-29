# 🏥 pHLynk (PharmaLync) - Pharmaceutical Supply Chain Payment Collection System

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Business Problem](#business-problem)
- [Solution Architecture](#solution-architecture)
- [User Roles & Permissions](#user-roles--permissions)
- [System Flow Diagrams](#system-flow-diagrams)
- [Technical Architecture](#technical-architecture)
- [Core Features](#core-features)
- [User Manuals](#user-manuals)
- [System Requirements](#system-requirements)
- [API Documentation](#api-documentation)
- [Security Documentation](#security-documentation)
- [Testing Procedures](#testing-procedures)
- [Maintenance Guide](#maintenance-guide)
- [Technology Stack](#technology-stack)
- [Development Setup](#development-setup)

---

## 🎯 Project Overview

pHLynk (PharmaLync) is a comprehensive pharmaceutical supply chain payment collection system designed to streamline and automate payment processes between wholesalers, medical stores (retailers), and field workers (line workers). The system addresses the critical need for efficient payment tracking, verification, and management in the pharmaceutical supply chain.

### Key Objectives
- **Eliminate Manual Payment Tracking**: Replace paper-based systems with digital payment collection
- **Reduce Payment Disputes**: Implement OTP-based verification for all transactions
- **Real-time Visibility**: Provide instant access to payment status and outstanding amounts
- **Mobile-First Operations**: Enable field workers to collect payments efficiently
- **Multi-Tenant Architecture**: Support multiple wholesalers with data isolation

---

## 🔍 Business Problem

The pharmaceutical supply chain faces significant challenges in payment collection and management:

### Current Pain Points
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WHOLESALER    │    │   LINE WORKER   │    │    RETAILER     │
│                 │    │                 │    │                 │
│ • Manual        │◄───┤ • Field visits  │◄───┤ • Cash payments │
│   tracking     │    │ • Paper receipts │    │ • No verification│
│ • Delayed       │    │ • No real-time   │    │ • Disputes      │
│   settlements   │    │   updates        │    │ • Outstanding   │
│ • Payment       │    │ • Error-prone   │    │   balance       │
│   disputes     │    │   processes      │    │   confusion     │
│ • No analytics  │    │ • Limited        │    │ • No payment    │
│                 │    │   visibility     │    │   history       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Business Impact
- **Revenue Loss**: Due to payment delays and disputes
- **Operational Inefficiency**: Manual processes and lack of automation
- **Poor Visibility**: No real-time tracking of payment status
- **Customer Dissatisfaction**: Retailers frustrated with payment processes
- **Compliance Risks**: Lack of proper audit trails and documentation

---

## 🏗️ Solution Architecture

pHLynk provides a comprehensive digital solution that addresses all the identified pain points:

### System Architecture Overview
```
                    ┌─────────────────────────────────────────────────┐
                    │                pHLynk System                    │
                    │                                                 │
                    │  ┌─────────────────┐  ┌─────────────────┐      │
                    │  │   FRONTEND     │  │    BACKEND      │      │
                    │  │                 │  │                 │      │
                    │  │ • Next.js 15   │  │ • Next.js API   │      │
                    │  │ • TypeScript   │  │ • Firebase      │      │
                    │  │ • shadcn/ui    │  │ • Socket.IO     │      │
                    │  │ • Tailwind CSS │  │ • Prisma        │      │
                    │  │ • Responsive   │  │                 │      │
                    │  │                 │  │                 │      │
                    │  └─────────────────┘  └─────────────────┘      │
                    │                                                 │
                    │  ┌─────────────────────────────────────────────┐ │
                    │  │              DATABASE LAYER                 │ │
                    │  │                                             │ │
                    │  │ • Firebase Firestore (Primary)             │ │
                    │  │ • Prisma/SQLite (Secondary)                │ │
                    │  │ • Real-time Synchronization                │ │
                    │  │ • Multi-tenant Data Isolation              │ │
                    │  └─────────────────────────────────────────────┘ │
                    │                                                 │
                    │  ┌─────────────────────────────────────────────┐ │
                    │  │              INTEGRATION LAYER             │ │
                    │  │                                             │ │
                    │  │ • Firebase Authentication                  │ │
                    │  │ • Twilio SMS (OTP Delivery)                │ │
                    │  │ • Socket.IO (Real-time Updates)            │ │
                    │  │ • Firebase Storage (File Management)      │ │
                    │  └─────────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────────┘
```

### Key Components
- **User Management**: Role-based access control with multi-tenant support
- **Invoice Management**: Complete invoice lifecycle management
- **Payment Processing**: OTP-based verification with real-time processing
- **Real-time Notifications**: Instant updates via Socket.IO
- **Analytics Dashboard**: Business intelligence and reporting
- **Mobile Interface**: Responsive design for field operations

---

## 👥 User Roles & Permissions

pHLynk implements a hierarchical user structure with specific permissions and responsibilities:

### Role Hierarchy
```
                    ┌─────────────────────────────────────────────────┐
                    │                USER HIERARCHY                  │
                    │                                                 │
                    │              ┌─────────────────┐                │
                    │              │   SUPER ADMIN   │                │
                    │              │                 │                │
                    │              │ • System-wide   │                │
                    │              │   access       │                │
                    │              │ • Creates       │                │
                    │              │   wholesalers  │                │
                    │              │ • Monitors      │                │
                    │              │   all activity  │                │
                    │              └─────────────────┘                │
                    │                        │                        │
                    │                        ▼                        │
                    │              ┌─────────────────┐                │
                    │              │ WHOLESALER ADMIN│                │
                    │              │                 │                │
                    │              │ • Tenant-level  │                │
                    │              │   access       │                │
                    │              │ • Creates       │                │
                    │              │   retailers &   │                │
                    │              │   line workers  │                │
                    │              │ • Manages       │                │
                    │              │   areas         │                │
                    │              └─────────────────┘                │
                    │               /               \                 │
                    │              /                 \                │
                    │             ▼                   ▼               │
                    │  ┌─────────────────┐  ┌─────────────────┐      │
                    │  │   LINE WORKER  │  │    RETAILER     │      │
                    │  │                 │  │                 │      │
                    │  │ • Area-based    │  │ • Store-level   │      │
                    │  │   access       │  │   access        │      │
                    │  │ • Collects      │  │ • Makes         │      │
                    │  │   payments     │  │   payments      │      │
                    │  │ • Manages       │  │ • Views         │      │
                    │  │   assigned     │  │   outstanding   │      │
                    │  │   retailers    │  │   amounts       │      │
                    │  └─────────────────┘  └─────────────────┘      │
                    └─────────────────────────────────────────────────┘
```

### Detailed Role Descriptions

#### 1. SUPER ADMIN
**Responsibilities:**
- System-wide administration and monitoring
- Create and manage wholesaler accounts (tenants)
- Monitor system performance and usage analytics
- Manage system configuration and settings
- Handle system-level issues and support

**Permissions:**
- Full system access across all tenants
- Create, read, update, delete wholesaler accounts
- View system-wide analytics and reports
- Manage system settings and configurations
- Access audit logs and system monitoring

**Dashboard Features:**
- System overview with key metrics
- Wholesaler management interface
- System analytics and reporting
- User activity monitoring
- System health status

#### 2. WHOLESALER ADMIN
**Responsibilities:**
- Tenant-level administration
- Create and manage retailer accounts
- Create and manage line worker accounts
- Define and manage geographic areas
- Create and manage invoices
- Monitor payment collection and analytics

**Permissions:**
- Full access within their tenant
- Create, read, update, delete retailers
- Create, read, update, delete line workers
- Create, read, update, delete areas
- Create, read, update, delete invoices
- View tenant-specific analytics

**Dashboard Features:**
- Tenant overview with key metrics
- Retailer management interface
- Line worker management interface
- Area management interface
- Invoice creation and management
- Payment collection analytics
- Real-time notifications

#### 3. LINE WORKER
**Responsibilities:**
- Field-based payment collection
- Visit assigned retailers in designated areas
- Initiate payment collection process
- Verify payments via OTP
- Maintain retailer relationships
- Report field issues and feedback

**Permissions:**
- Access to assigned retailers only
- Initiate payment collection
- View retailer outstanding amounts
- View payment history for assigned retailers
- Update payment status
- Access area-specific analytics

**Dashboard Features:**
- Assigned retailers list
- Area-based retailer filtering
- Payment collection interface
- Outstanding amount tracking
- Daily/weekly collection targets
- Route optimization suggestions
- Real-time notifications

#### 4. RETAILER
**Responsibilities:**
- Make payments for outstanding invoices
- Verify payment authenticity via OTP
- View payment history and outstanding amounts
- Manage store information
- Communicate with wholesalers

**Permissions:**
- View own outstanding amounts
- View payment history
- Verify payments via OTP
- Update store information
- Receive payment notifications
- Access invoice details

**Dashboard Features:**
- Outstanding amount overview
- Payment history and receipts
- Invoice details and status
- OTP verification interface
- Real-time payment notifications
- Store profile management

---

## 🔄 System Flow Diagrams

### 1. User Creation Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SUPER ADMIN   │    │ WHOLESALER ADMIN│    │   LINE WORKER   │
│                 │    │                 │    │                 │
│ 1. Creates      │───►│ 2. Receives     │    │                 │
│    wholesaler   │    │    credentials  │    │                 │
│    account      │    │                 │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 3. Creates      │───►│ 4. Receives     │
│                 │    │    line worker  │    │    credentials  │
│                 │    │    account      │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 5. Creates      │───►│ 6. Receives     │
│                 │    │    retailer     │    │    credentials  │
│                 │    │    account      │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 7. Assigns      │    │ 8. Assigned to  │
│                 │    │    areas        │    │    specific      │
│                 │    │                 │    │    areas        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2. Invoice Creation & Payment Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ WHOLESALER ADMIN│    │   LINE WORKER   │    │    RETAILER     │
│                 │    │                 │    │                 │
│ 1. Creates      │    │                 │    │                 │
│    invoice      │    │                 │    │                 │
│    with details │    │                 │    │                 │
│                 │    │                 │    │                 │
│ 2. Invoice      │    │                 │    │                 │
│    saved        │    │                 │    │                 │
│    status: OPEN │    │                 │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 3. Visits       │    │                 │
│                 │    │    retailer     │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 4. Initiates    │    │                 │
│                 │    │    payment      │    │                 │
│                 │    │    collection  │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 5. System       │    │                 │
│                 │    │    generates    │    │                 │
│                 │    │    6-digit OTP  │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 6. OTP sent      │    │ 7. Receives     │
│                 │    │    via SMS/     │    │    OTP          │
│                 │    │    displayed    │    │                 │
│                 │    │                 │    │                 │
│                 │    │                 │    │ 8. Enters OTP   │
│                 │    │                 │    │    to verify    │
│                 │    │                 │    │                 │
│                 │    │ 9. System       │    │                 │
│                 │    │    verifies     │    │                 │
│                 │    │    OTP          │    │                 │
│                 │    │                 │    │                 │
│                 │    │ 10. Payment     │    │ 11. Payment     │
│                 │    │     recorded    │    │     confirmed   │
│                 │    │     status:     │    │     receipt     │
│                 │    │     COMPLETED   │    │     generated   │
│                 │    │                 │    │                 │
│                 │    │ 12. Invoice     │    │                 │
│                 │    │     status      │    │                 │
│                 │    │     updated    │    │                 │
│                 │    │     (PARTIAL/   │    │                 │
│                 │    │     PAID)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 3. Payment Verification Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT VERIFICATION FLOW                   │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ LINE WORKER │    │   SYSTEM    │    │   RETAILER  │        │
│  │             │    │             │    │             │        │
│  │ 1. Selects  │───►│ 2. Validates│    │             │        │
│  │    retailer │    │    retailer │    │             │        │
│  │             │    │    & amount │    │             │        │
│  │             │    │             │    │             │        │
│  │ 3. Enters   │───►│ 4. Generates│    │             │        │
│  │    amount   │    │    6-digit  │    │             │        │
│  │             │    │    OTP      │    │             │        │
│  │             │    │             │    │             │        │
│  │             │    │ 5. Stores    │    │             │        │
│  │             │    │    OTP in    │    │             │        │
│  │             │    │    database  │    │             │        │
│  │             │    │             │    │             │        │
│  │             │    │ 6. Sends OTP │───►│ 7. Receives │        │
│  │             │    │    to        │    │    OTP via  │        │
│  │             │    │    retailer  │    │    SMS/     │        │
│  │             │    │             │    │    display   │        │
│  │             │    │             │    │             │        │
│  │             │    │             │    │ 8. Enters   │───►│ 9. Validates│
│  │             │    │             │    │    OTP      │    │    OTP      │
│  │             │    │             │    │             │    │             │
│  │             │    │             │    │             │    │ 10. Updates  │
│  │             │    │             │    │             │    │    payment   │
│  │             │    │             │    │             │    │    status    │
│  │             │    │             │    │             │    │             │
│  │ 11. Shows   │◄───│ 12. Sends    │◄───│ 13. Shows   │    │             │
│  │    success  │    │    success  │    │    success  │    │             │
│  │    message  │    │    message  │    │    message  │    │             │
│  │             │    │             │    │             │    │             │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
│                                                                 │
│  Notes:                                                          │
│  • OTP expires after 10 minutes                                 │
│  • System maintains audit trail of all verification attempts    │
│  • Real-time notifications sent to all stakeholders            │
│  • Payment receipt generated and stored in system               │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Real-time Notification Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                   REAL-TIME NOTIFICATION FLOW                 │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   SYSTEM    │    │ SOCKET.IO   │    │   CLIENTS   │        │
│  │             │    │   SERVER    │    │             │        │
│  │             │    │             │    │             │        │
│  │ 1. Event    │───►│ 2. Receives │    │             │        │
│  │    occurs   │    │    event    │    │             │        │
│  │    (payment │    │             │    │             │        │
│  │    created, │    │             │    │             │        │
│  │    verified,│    │             │    │             │        │
│  │    etc.)    │    │             │    │             │        │
│  │             │    │             │    │             │        │
│  │             │    │ 3. Broadcasts│───►│ 4. Receives │        │
│  │             │    │    to        │    │    real-time│        │
│  │             │    │    relevant  │    │    update   │        │
│  │             │    │    clients  │    │             │        │
│  │             │    │             │    │             │        │
│  │             │    │             │    │ 5. Shows     │        │
│  │             │    │             │    │    popup/    │        │
│  │             │    │             │    │    updates   │        │
│  │             │    │             │    │    UI        │        │
│  │             │    │             │    │             │        │
│  │             │    │             │    │             │        │
│  │ 6. Stores   │    │             │    │             │        │
│  │    event in │    │             │    │             │        │
│  │    database │    │             │    │             │        │
│  │    for      │    │             │    │             │        │
│  │    audit    │    │             │    │             │        │
│  │             │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  Event Types:                                                    │
│  • PAYMENT_INITIATED - Line worker starts payment collection    │
│  • OTP_GENERATED - System generates OTP for verification        │
│  • OTP_VERIFIED - Retailer successfully verifies OTP           │
│  • PAYMENT_COMPLETED - Payment successfully processed           │
│  • INVOICE_CREATED - New invoice created by wholesaler         │
│  • USER_LOGIN - User successfully logs in                       │
│  • SYSTEM_ALERT - System-wide notifications                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Technical Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                      TECHNICAL ARCHITECTURE                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND LAYER                      │   │
│  │                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐              │   │
│  │  │   Next.js 15   │  │   TypeScript    │              │   │
│  │  │                 │  │                 │              │   │
│  │  │ • App Router    │  │ • Type Safety  │              │   │
│  │  │ • SSR/SSG       │  │ • Interfaces   │              │   │
│  │  │ • API Routes    │  │ • Enums        │              │   │
│  │  │ • Middleware    │  │ • Utilities    │              │   │
│  │  └─────────────────┘  └─────────────────┘              │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                  UI COMPONENTS                     │ │   │
│  │  │                                                     │ │   │
│  │  │ • shadcn/ui Components                             │ │   │
│  │  │ • Material-UI Components                           │ │   │
│  │  │ • Custom Business Components                       │ │   │
│  │  │ • Responsive Design                               │ │   │
│  │  │ • Dark/Light Mode Support                          │ │   │
│  │  │ • Mobile-First Approach                           │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                  STATE MANAGEMENT                  │ │   │
│  │  │                                                     │ │   │
│  │  │ • React Context (Auth, Theme)                      │ │   │
│  │  │ • Local Storage (Retailer Session)                 │ │   │
│  │  │ • Firebase Real-time Listeners                    │ │   │
│  │  │ • Component State (React Hooks)                    │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    BACKEND LAYER                       │   │
│  │                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐              │   │
│  │  │   Next.js API  │  │   Socket.IO     │              │   │
│  │  │                 │  │                 │              │   │
│  │  │ • API Routes    │  │ • Real-time     │              │   │
│  │  │ • Middleware    │  │   Events        │              │   │
│  │  │ • Serverless    │  │ • Broadcasting  │              │   │
│  │  │ • Authentication│  │ • Room-based    │              │   │
│  │  │ • Error Handling│  │   Messaging     │              │   │
│  │  └─────────────────┘  └─────────────────┘              │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                 BUSINESS LOGIC                     │ │   │
│  │  │                                                     │ │   │
│  │  │ • User Management Services                         │ │   │
│  │  │ • Payment Processing Services                      │ │   │
│  │  │ • OTP Generation & Verification                    │ │   │
│  │  │ • Invoice Management Services                      │ │   │
│  │  │ • Notification Services                           │ │   │
│  │  │ • Analytics & Reporting Services                   │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   DATABASE LAYER                       │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                FIREBASE FIRESTORE                   │ │   │
│  │  │                                                     │ │   │
│  │  │ • Users Collection                                 │ │   │
│  │  │ • Retailers Collection                              │ │   │
│  │  │ • Invoices Collection                               │ │   │
│  │  │ • Payments Collection                              │ │   │
│  │  │ • OTPs Collection                                  │ │   │
│  │  │ • Areas Collection                                 │ │   │
│  │  │ • Tenants Collection                               │ │   │
│  │  │ • Real-time Synchronization                       │ │   │
│  │  │ • Offline Support                                  │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                  PRISMA/SQLITE                     │ │   │
│  │  │                                                     │ │   │
│  │  │ • User Model                                       │ │   │
│  │  │ • Post Model (Example)                             │ │   │
│  │  │ • Type Safety                                      │ │   │
│  │  │ • Migrations                                       │ │   │
│  │  │ • Backup & Recovery                                │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                INTEGRATION LAYER                       │   │
│  │                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐              │   │
│  │  │   Firebase      │  │     Twilio      │              │   │
│  │  │                 │  │                 │              │   │
│  │  │ • Authentication│  │ • SMS Gateway   │              │   │
│  │  │ • Firestore     │  │ • OTP Delivery  │              │   │
│  │  │ • Storage       │  │ • Notifications │              │   │
│  │  │ • Real-time     │  │ • Voice Calls   │              │   │
│  │  └─────────────────┘  └─────────────────┘              │   │
│  │                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐              │   │
│  │  │   Socket.IO     │  │  External APIs  │              │   │
│  │  │                 │  │                 │              │   │
│  │  │ • WebSocket     │  │ • Payment       │              │   │
│  │  │ • Real-time     │  │   Gateways      │              │   │
│  │  │ • Events        │  │ • Analytics     │              │   │
│  │  │ • Broadcasting  │  │ • Reporting     │              │   │
│  │  └─────────────────┘  └─────────────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema (Firebase Firestore)
```
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE FIRESTORE SCHEMA                  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │     USERS      │  │    RETAILERS    │  │    INVOICES     │  │
│  │                 │  │                 │  │                 │  │
│  │ • id: string    │  │ • id: string    │  │ • id: string    │  │
│  │ • email: string │  │ • name: string  │  │ • retailerId:   │  │
│  │ • name: string  │  │ • phone: string │  │   string        │  │
│  │ • role: enum    │  │ • address: text │  │ • wholesalerId: │  │
│  │ • tenantId:     │  │ • areaId: string│  │   string        │  │
│  │   string        │  │ • tenantId:     │  │ • amount:       │  │
│  │ • createdAt:    │  │   string        │  │   number        │  │
│  │   timestamp     │  │ • createdAt:    │  │ • status: enum   │  │
│  │ • updatedAt:    │  │   timestamp     │  │ • dueDate:      │  │
│  │   timestamp     │  │ • updatedAt:    │  │   timestamp     │  │
│  │ • status: enum   │  │   timestamp     │  │ • createdAt:    │  │
│  │                 │  │ • outstanding:   │  │   timestamp     │  │
│  │                 │  │   number        │  │ • updatedAt:    │  │
│  │                 │  │ • lastPayment:   │  │   timestamp     │  │
│  │                 │  │   timestamp     │  │ • items: array   │  │
│  │                 │  │                 │  │ • notes: text    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    PAYMENTS     │  │      AREAS      │  │     TENANTS     │  │
│  │                 │  │                 │  │                 │  │
│  │ • id: string    │  │ • id: string    │  │ • id: string    │  │
│  │ • retailerId:   │  │ • name: string  │  │ • name: string  │  │
│  │   string        │  │ • description:  │  │ • email: string │  │
│  │ • invoiceId:    │  │   text          │  │ • phone: string │  │
│  │   string        │  │ • tenantId:     │  │ • address: text │  │
│  │ • amount:       │  │   string        │  │ • status: enum   │  │
│  │   number        │  │ • createdAt:    │  │ • createdAt:    │  │
│  │ • method: enum  │  │   timestamp     │  │   timestamp     │
│  │ • status: enum  │  │ • updatedAt:    │  │ • updatedAt:    │  │
│  │ • otp: string   │  │   timestamp     │  │   timestamp     │
│  │ • collectedBy: │  │ • coordinates:   │  │ • settings:     │
│  │   string        │  │   object        │  │   object        │
│  │ • createdAt:    │  │                 │  │                 │
│  │   timestamp     │  │                 │  │                 │
│  │ • updatedAt:    │  │                 │  │                 │
│  │   timestamp     │  │                 │  │                 │
│  │ • verifiedAt:   │  │                 │  │                 │
│  │   timestamp     │  │                 │  │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │      OTPS       │  │   NOTIFICATIONS │  │   AUDIT LOGS   │  │
│  │                 │  │                 │  │                 │  │
│  │ • id: string    │  │ • id: string    │  │ • id: string    │  │
│  │ • phone: string │  │ • userId: string│  │ • userId: string│  │
│  │ • code: string  │  │ • type: enum    │  │ • action: string│  │
│  │ • purpose: enum │  │ • title: string │  │ • details:      │  │
│  │ • expiresAt:    │  │ • message: text │  │   object        │
│  │   timestamp     │  │ • read: boolean │  │ • timestamp:    │  │
│  │ • createdAt:    │  │ • createdAt:    │  │   timestamp     │
│  │   timestamp     │  │   timestamp     │  │ • ipAddress:    │  │
│  │ • used: boolean │  │ • expiresAt:    │  │   string        │
│  │ • usedAt:       │  │   timestamp     │  │ • userAgent:    │  │
│  │   timestamp     │  │                 │  │   string        │
│  │                 │  │                 │  │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### API Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                      API ARCHITECTURE                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   AUTHENTICATION                         │   │
│  │                                                         │   │
│  │  POST /api/auth/login                                   │   │
│  │  POST /api/auth/logout                                  │   │
│  │  POST /api/auth/refresh                                 │   │
│  │  POST /api/auth/register                                 │   │
│  │  GET  /api/auth/me                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    USER MANAGEMENT                       │   │
│  │                                                         │   │
│  │  GET    /api/users                                      │   │
│  │  POST   /api/users                                      │   │
│  │  GET    /api/users/[id]                                 │   │
│  │  PUT    /api/users/[id]                                 │   │
│  │  DELETE /api/users/[id]                                 │   │
│  │  GET    /api/users/role/[role]                          │   │
│  │  GET    /api/users/tenant/[tenantId]                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   RETAILER MANAGEMENT                    │   │
│  │                                                         │   │
│  │  GET    /api/retailers                                   │   │
│  │  POST   /api/retailers                                   │   │
│  │  GET    /api/retailers/[id]                              │   │
│  │  PUT    /api/retailers/[id]                              │   │
│  │  DELETE /api/retailers/[id]                              │   │
│  │  GET    /api/retailers/area/[areaId]                    │   │
│  │  GET    /api/retailers/outstanding/[id]                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   INVOICE MANAGEMENT                      │   │
│  │                                                         │   │
│  │  GET    /api/invoices                                    │   │
│  │  POST   /api/invoices                                    │   │
│  │  GET    /api/invoices/[id]                               │   │
│  │  PUT    /api/invoices/[id]                               │   │
│  │  DELETE /api/invoices/[id]                               │   │
│  │  GET    /api/invoices/retailer/[retailerId]              │   │
│  │  GET    /api/invoices/wholesaler/[wholesalerId]          │   │
│  │  PUT    /api/invoices/[id]/status                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   PAYMENT MANAGEMENT                     │   │
│  │                                                         │   │
│  │  GET    /api/payments                                    │   │
│  │  POST   /api/payments                                    │   │
│  │  GET    /api/payments/[id]                               │   │
│  │  PUT    /api/payments/[id]                               │   │
│  │  DELETE /api/payments/[id]                               │   │
│  │  GET    /api/payments/retailer/[retailerId]              │   │
│  │  GET    /api/payments/wholesaler/[wholesalerId]          │   │
│  │  POST   /api/payments/verify-otp                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    OTP MANAGEMENT                        │   │
│  │                                                         │   │
│  │  POST   /api/otp/send                                    │   │
│  │  POST   /api/otp/verify                                  │   │
│  │  GET    /api/otp/validate/[code]                         │   │
│  │  DELETE /api/otp/expired                                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AREA MANAGEMENT                       │   │
│  │                                                         │   │
│  │  GET    /api/areas                                       │   │
│  │  POST   /api/areas                                       │   │
│  │  GET    /api/areas/[id]                                  │   │
│  │  PUT    /api/areas/[id]                                  │   │
│  │  DELETE /api/areas/[id]                                  │   │
│  │  GET    /api/areas/tenant/[tenantId]                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   ANALYTICS & REPORTING                  │   │
│  │                                                         │   │
│  │  GET    /api/analytics/overview                         │   │
│  │  GET    /api/analytics/payments                         │   │
│  │  GET    /api/analytics/invoices                          │   │
│  │  GET    /api/analytics/retailers                         │   │
│  │  GET    /api/analytics/line-workers                      │   │
│  │  GET    /api/analytics/wholesalers                       │   │
│  │  GET    /api/reports/daily                               │   │
│  │  GET    /api/reports/weekly                              │   │
│  │  GET    /api/reports/monthly                             │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   NOTIFICATIONS                          │   │
│  │                                                         │   │
│  │  GET    /api/notifications                               │   │
│  │  POST   /api/notifications                               │   │
│  │  PUT    /api/notifications/[id]/read                     │   │
│  │  DELETE /api/notifications/[id]                          │   │
│  │  GET    /api/notifications/unread                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SYSTEM & UTILITIES                     │   │
│  │                                                         │   │
│  │  GET    /api/health                                      │   │
│  │  GET    /api/system/status                               │   │
│  │  POST   /api/system/logs                                 │   │
│  │  GET    /api/system/config                               │   │
│  │  PUT    /api/system/config                               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Features

### 1. Payment Flow & OTP Verification

#### Feature Overview
The payment flow system is the core of pHLynk, providing secure, verifiable payment collection with real-time processing and comprehensive audit trails.

#### Key Components
```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT FLOW SYSTEM                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                PAYMENT INITIATION                       │   │
│  │                                                         │   │
│  │  • Line worker selects retailer                        │   │
│  │  • System validates retailer and outstanding amount    │   │
│  │  • Line worker enters payment amount                    │   │
│  │  • System validates amount against outstanding balance  │   │
│  │  • Payment record created with status: INITIATED       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  OTP GENERATION                         │   │
│  │                                                         │   │
│  │  • System generates 6-digit OTP                        │   │
│  │  • OTP stored in database with expiration (10 min)     │   │
│  │  • Payment status updated to: OTP_SENT                 │   │
│  │  • Real-time notification sent to retailer              │   │
│  │  • OTP sent via SMS (Twilio) or displayed in console   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  OTP VERIFICATION                       │   │
│  │                                                         │   │
│  │  • Retailer receives OTP via SMS/display               │   │
│  │  • Retailer enters OTP in verification interface        │   │
│  │  • System validates OTP against database               │   │
│  │  • Payment status updated to: OTP_VERIFIED             │   │
│  │  • Real-time notification sent to line worker          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 PAYMENT COMPLETION                     │   │
│  │                                                         │   │
│  │  • System processes payment completion                  │   │
│  │  • Payment status updated to: COMPLETED                │   │
│  │  • Invoice status updated (PARTIAL/PAID)               │   │
│  │  • Retailer outstanding amount recalculated            │   │
│  │  • Payment receipt generated and stored               │   │
│  │  • Real-time notifications sent to all stakeholders    │   │
│  │  • Audit trail updated with complete payment details   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Implementation
- **OTP Generation**: Cryptographically secure 6-digit codes using `Math.floor(100000 + Math.random() * 900000)`
- **OTP Storage**: Firebase Firestore with 10-minute expiration
- **OTP Delivery**: Twilio SMS integration with fallback console display
- **Verification**: Real-time validation with immediate status updates
- **Audit Trail**: Complete payment lifecycle tracking with timestamps
- **Receipt Generation**: Digital receipts with unique identifiers

#### Security Features
- **OTP Expiration**: Automatic expiration after 10 minutes
- **Rate Limiting**: Prevents brute force attacks
- **Audit Logging**: Complete transaction history
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Access Control**: Role-based payment initiation and verification

### 2. User Hierarchy & Permissions

#### Feature Overview
pHLynk implements a sophisticated multi-tenant user hierarchy with granular permissions and role-based access control.

#### Hierarchy Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                    USER HIERARCHY SYSTEM                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SUPER ADMIN                           │   │
│  │                                                         │   │
│  │  Permissions:                                           │   │
│  │  • System-wide access                                   │   │
│  │  • Create/Manage wholesalers                           │   │
│  │  • System configuration                                 │   │
│  │  • Monitor all tenants                                 │   │
│  │  • Access audit logs                                   │   │
│  │  • System analytics                                    │   │
│  │                                                         │   │
│  │  Responsibilities:                                      │   │
│  │  • Onboard new wholesalers                             │   │
│  │  • System health monitoring                            │   │
│  │  • Security management                                │   │
│  │  • Performance optimization                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 WHOLESALER ADMIN                        │   │
│  │                                                         │   │
│  │  Permissions:                                           │   │
│  │  • Tenant-level access                                  │   │
│  │  • Create/Manage retailers                             │   │
│  │  • Create/Manage line workers                          │   │
│  │  • Create/Manage areas                                 │   │
│  │  • Create/Manage invoices                              │   │
│  │  • Tenant analytics                                    │   │
│  │                                                         │   │
│  │  Responsibilities:                                      │   │
│  │  • Onboard retailers and line workers                  │   │
│  │  • Define geographic areas                             │   │
│  │  • Create and manage invoices                          │   │
│  │  • Monitor payment collection                          │   │
│  │  • Tenant performance analysis                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                /                            \                │
│               /                              \               │
│              ▼                                ▼              │
│  ┌─────────────────────┐        ┌─────────────────────┐    │
│  │    LINE WORKER      │        │      RETAILER       │    │
│  │                     │        │                     │    │
│  │  Permissions:       │        │  Permissions:       │    │
│  │  • Area-based       │        │  • Store-based      │    │
│  │    access           │        │    access           │    │
│  │  • Initiate         │        │  • View outstanding │    │
│  │    payments         │        │    amounts          │    │
│  │  • View assigned    │        │  • Verify OTP       │    │
│  │    retailers        │        │  • View payment     │    │
│  │  • Area analytics   │        │    history          │    │
│  │                     │        │  • Store profile     │    │
│  │  Responsibilities:  │        │    management       │    │
│  │  • Field visits     │        │                     │    │
│  │  • Payment          │        │  Responsibilities:  │    │
│  │    collection       │        │  • Make payments    │    │
│  │  • OTP verification │        │  • Verify payments  │    │
│  │  • Retailer         │        │  • Maintain store   │    │
│  │    relationships    │        │    information       │    │
│  │  • Area reporting   │        │  • Payment disputes  │    │
│  │                     │        │    resolution        │    │
│  └─────────────────────┘        └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Implementation
- **Role-Based Access Control (RBAC)**: Firebase Authentication with custom claims
- **Multi-Tenant Architecture**: Data isolation using tenant-specific collections
- **Permission System**: Granular permissions with inheritance
- **User Management**: Complete CRUD operations with validation
- **Audit Trail**: User activity logging with timestamps
- **Session Management**: Secure token-based authentication

#### Security Features
- **Data Isolation**: Strict tenant separation
- **Permission Validation**: Server-side permission checks
- **Session Security**: JWT tokens with expiration
- **Password Policies**: Strong password requirements
- **Account Lockout**: Protection against brute force attacks

### 3. Real-time Features & Notifications

#### Feature Overview
pHLynk provides comprehensive real-time features using Socket.IO for instant communication and updates across all user roles.

#### Real-time System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                 REAL-TIME SYSTEM ARCHITECTURE               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                SOCKET.IO SERVER                        │   │
│  │                                                         │   │
│  │  • WebSocket server running on port 3000              │   │
│  │  • Event-driven architecture                           │   │
│  │  • Room-based messaging                                │   │
│  │  • Broadcast and targeted messaging                    │   │
│  │  • Connection management                               │   │
│  │  • Error handling and reconnection                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 EVENT HANDLERS                          │   │
│  │                                                         │   │
│  │  Payment Events:                                       │   │
│  │  • payment_initiated                                   │   │
│  │  • otp_generated                                       │   │
│  │  • otp_verified                                        │   │
│  │  • payment_completed                                   │   │
│  │  • payment_failed                                      │   │
│  │                                                         │   │
│  │  User Events:                                          │   │
│  │  • user_login                                          │   │
│  │  • user_logout                                         │   │
│  │  • user_created                                        │   │
│  │  • user_updated                                        │   │
│  │                                                         │   │
│  │  System Events:                                        │   │
│  │  • system_alert                                        │   │
│  │  • maintenance_mode                                    │   │
│  │  • data_updated                                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                CLIENT CONNECTIONS                       │   │
│  │                                                         │   │
│  │  Super Admin Connections:                              │   │
│  │  • System-wide events                                  │   │
│  │  • Wholesaler management events                        │   │
│  │  • System alerts                                       │   │
│  │                                                         │   │
│  │  Wholesaler Admin Connections:                          │   │
│  │  • Tenant-specific events                              │   │
│  │  • Payment events in tenant                            │   │
│  │  • User management events                              │   │
│  │                                                         │   │
│  │  Line Worker Connections:                              │   │
│  │  • Area-specific events                                │   │
│  │  • Payment collection events                           │   │
│  │  • Assigned retailer events                            │   │
│  │                                                         │   │
│  │  Retailer Connections:                                 │   │
│  │  • Store-specific events                              │   │
│  │  • Payment verification events                        │   │
│  │  • Invoice events                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                UI UPDATES                               │   │
│  │                                                         │   │
│  │  • Real-time dashboard updates                         │   │
│  │  • Popup notifications                                 │   │
│  │  • Live data refresh                                   │   │
│  │  • Progress indicators                                 │   │
│  │  • Status changes                                     │   │
│  │  • Alert banners                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Implementation
- **Socket.IO Server**: Custom WebSocket server running alongside Next.js
- **Event System**: Comprehensive event handling for all business operations
- **Room Management**: Organized rooms for tenant, area, and user-specific events
- **Connection Management**: Automatic reconnection and error handling
- **Message Queue**: Event persistence for offline users
- **Performance Optimization**: Efficient event broadcasting and filtering

#### Key Real-time Features
- **Payment Status Updates**: Real-time payment collection status
- **OTP Notifications**: Instant OTP generation and verification alerts
- **Dashboard Updates**: Live data refresh without page reload
- **User Activity**: Real-time user login/logout notifications
- **System Alerts**: Immediate system-wide notifications
- **Data Synchronization**: Cross-client data consistency

### 4. Mobile Capabilities

#### Feature Overview
pHLynk is designed with a mobile-first approach, ensuring optimal performance and user experience across all devices, particularly for field workers using mobile devices.

#### Mobile Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE ARCHITECTURE                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                RESPONSIVE DESIGN                        │   │
│  │                                                         │   │
│  │  • Mobile-first CSS with Tailwind                       │   │
│  │  • Fluid grid layouts                                   │   │
│  │  • Flexible images and media                             │   │
│  │  • Touch-friendly interface elements                    │   │
│  │  • Adaptive typography                                  │   │
│  │  • Device-specific optimizations                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                PROGRESSIVE WEB APP (PWA)                │   │
│  │                                                         │   │
│  │  • Service Worker for offline support                   │   │
│  │  • Web App Manifest for app-like experience              │   │
│  │  • Offline data synchronization                         │   │
│  │  • Push notifications support                          │   │
│  │  • Home screen installation                             │   │
│  │  • Background sync capabilities                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                MOBILE-SPECIFIC FEATURES                 │   │
│  │                                                         │   │
│  │  Line Worker Features:                                  │   │
│  │  • GPS-based area assignment                           │   │
│  │  • Route optimization                                  │   │
│  │  • Offline payment collection                          │   │
│  │  • Camera integration for receipts                     │   │
│  │  • Contact integration for calls                        │   │
│  │                                                         │   │
│  │  Retailer Features:                                    │   │
│  │  • Quick OTP verification                              │   │
│  │  • Payment history access                              │   │
│  │  • Store management                                    │   │
│  │  • Invoice viewing                                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                PERFORMANCE OPTIMIZATION                │   │
│  │                                                         │   │
│  │  • Lazy loading of components                          │   │
│  │  • Image optimization and compression                   │   │
│  │  • Code splitting for faster loads                     │   │
│  │  • Caching strategies for offline use                  │   │
│  │  • Network-aware data fetching                         │   │
│  │  • Battery-efficient operations                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Implementation
- **Responsive Framework**: Tailwind CSS with mobile-first approach
- **PWA Features**: Service Worker, Web App Manifest, Push Notifications
- **Offline Support**: IndexedDB for local storage, background sync
- **Device Integration**: Camera, GPS, Contacts, Phone calls
- **Performance Optimization**: Lazy loading, code splitting, caching
- **Touch Interface**: Optimized for touch interactions and gestures

#### Mobile-Specific Features
- **Offline Payment Collection**: Sync when connectivity restored
- **GPS Integration**: Location-based area assignment and tracking
- **Camera Integration**: Receipt capture and document scanning
- **Push Notifications**: Real-time alerts on mobile devices
- **Contact Integration**: Direct calling from the app
- **Battery Optimization**: Efficient background operations

### 5. Security Features

#### Feature Overview
pHLynk implements comprehensive security measures to protect sensitive payment data, user information, and ensure system integrity.

#### Security Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                AUTHENTICATION                          │   │
│  │                                                         │   │
│  │  • Firebase Authentication with custom claims           │   │
│  │  • JWT tokens with expiration                          │   │
│  │  • Multi-factor authentication (OTP)                    │   │
│  │  • Session management with refresh tokens             │   │
│  │  • Role-based access control (RBAC)                    │   │
│  │  • Account lockout protection                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                AUTHORIZATION                           │   │
│  │                                                         │   │
│  │  • Granular permission system                          │   │
│  │  • Multi-tenant data isolation                         │   │
│  │  • Resource-based access control                       │   │
│  │  • API endpoint protection                             │   │
│  │  • File system access controls                          │   │
│  │  • Database access controls                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                DATA PROTECTION                        │   │
│  │                                                         │   │
│  │  • Encryption at rest (Firebase)                       │   │
│  │  • Encryption in transit (HTTPS/TLS)                   │   │
│  │  • Sensitive data masking                              │   │
│  │  • Secure password storage                             │   │
│  │  • Payment data tokenization                           │   │
│  │  • Backup encryption                                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                NETWORK SECURITY                        │   │
│  │                                                         │   │
│  │  • HTTPS/TLS encryption                                │   │
│  │  • CORS configuration                                  │   │
│  │  • API rate limiting                                   │   │
│  │  • DDoS protection                                     │   │
│  │  • Firewall rules                                      │   │
│  │  • Secure WebSocket connections                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                 │                              │
│                                 ▼                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                AUDIT & COMPLIANCE                       │   │
│  │                                                         │   │
│  │  • Comprehensive audit logging                         │   │
│  │  • User activity tracking                              │   │
│  │  • Payment transaction logging                        │   │
│  │  • System event logging                               │   │
│  │  • Compliance reporting                               │   │
│  │  • Data retention policies                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Implementation
- **Authentication**: Firebase Authentication with custom claims and JWT
- **Authorization**: Custom RBAC system with granular permissions
- **Data Encryption**: Firebase encryption, TLS, and custom encryption
- **Network Security**: HTTPS, CORS, rate limiting, firewall rules
- **Audit Logging**: Comprehensive logging with timestamps and user context
- **Compliance**: Data protection regulations compliance

#### Key Security Features
- **Multi-Factor Authentication**: OTP-based verification for critical operations
- **Data Isolation**: Strict tenant separation with access controls
- **Payment Security**: Tokenization and encryption of payment data
- **Audit Trail**: Complete transaction history with immutable logs
- **Session Security**: Secure token management and expiration
- **API Security**: Rate limiting, input validation, and output encoding

---

## 📚 User Manuals

### 1. Super Admin User Manual

#### Overview
The Super Admin has system-wide access and is responsible for managing wholesalers, monitoring system health, and ensuring overall system performance.

#### Getting Started
```
┌─────────────────────────────────────────────────────────────────┐
│                 SUPER ADMIN GETTING STARTED                   │
│                                                                 │
│  1. System Access:                                            │
│     • URL: https://phlynk.yourdomain.com                      │
│     • Credentials: Provided by system administrator           │
│     • First-time login: Change password immediately           │
│                                                                 │
│  2. Dashboard Overview:                                      │
│     • System Metrics: Total users, transactions, system health │
│     • Wholesaler Management: Create, view, manage wholesalers  │
│     • System Analytics: Performance metrics and usage stats    │
│     • Audit Logs: System-wide activity monitoring             │
│                                                                 │
│  3. Navigation:                                             │
│     • Main Dashboard: System overview and key metrics        │
│     • Wholesalers: Manage wholesaler accounts                 │
│     • Analytics: System performance and usage analytics      │
│     • Settings: System configuration and management          │
│     • Audit Logs: View system-wide activity                  │
│                                                                 │
│  4. Initial Setup:                                          │
│     • Configure system settings                              │
│     • Set up first wholesaler account                        │
│     • Configure notification settings                       │
│     • Set up backup and recovery procedures                  │
│                                                                 │
│  5. Best Practices:                                         │
│     • Regular system health checks                           │
│     • Monitor wholesaler activities                          │
│     • Keep audit logs for compliance                         │
│     • Regular security reviews                               │
│     • Performance optimization                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Operations

##### Creating Wholesaler Accounts
```
┌─────────────────────────────────────────────────────────────────┐
│               CREATING WHOLESALER ACCOUNTS                    │
│                                                                 │
│  1. Navigate to Wholesalers → Create New Wholesaler          │
│                                                                 │
│  2. Fill in Wholesaler Information:                           │
│     • Business Name: Legal business name                     │
│     • Contact Person: Primary contact details                 │
│     • Email Address: Official business email                 │
│     • Phone Number: Business contact number                  │
│     • Address: Business address                              │
│     • Business License: License number and expiry           │
│     • Tax ID: Business tax identification                    │
│                                                                 │
│  3. Configure Wholesaler Settings:                            │
│     • Account Status: Active/Suspended                       │
│     • Credit Limit: Maximum credit allowed                   │
│     • Payment Terms: Net payment terms                       │
│     • Area Coverage: Geographic service area                │
│     • Notification Preferences: Email/SMS settings          │
│                                                                 │
│  4. Set Up Admin Account:                                    │
│     • Admin Name: Primary administrator name                 │
│     • Admin Email: Administrator email address               │
│     • Admin Phone: Administrator phone number               │
│     • Temporary Password: Auto-generated                    │
│     • Role: WHOLESALER_ADMIN                                 │
│                                                                 │
│  5. Review and Create:                                       │
│     • Verify all information is correct                      │
│     • Click "Create Wholesaler"                              │
│     • System sends welcome email to admin                    │
│     • Account is ready for use                               │
│                                                                 │
│  6. Post-Creation Tasks:                                     │
│     • Send welcome package to wholesaler                     │
│     • Schedule onboarding training                           │
│     • Monitor initial account activity                       │
│     • Provide support contact information                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### System Monitoring
```
┌─────────────────────────────────────────────────────────────────┐
│                   SYSTEM MONITORING                           │
│                                                                 │
│  1. Dashboard Metrics:                                        │
│     • System Health: Overall system status                    │
│     • Active Users: Current user sessions                     │
│     • Transaction Volume: Real-time transaction count        │
│     • Error Rates: System error monitoring                   │
│     • Performance: Response times and load metrics            │
│                                                                 │
│  2. Wholesaler Activity:                                     │
│     • Active Wholesalers: Currently logged in                 │
│     • New Registrations: Recent wholesaler sign-ups          │
│     • Payment Volume: Transaction amounts by wholesaler      │
│     • User Growth: New users by wholesaler                    │
│                                                                 │
│  3. System Performance:                                      │
│     • Response Times: API and page load times               │
│     • Database Performance: Query optimization metrics       │
│     • Server Load: CPU, memory, and disk usage               │
│     • Network Traffic: Bandwidth and connection metrics      │
│                                                                 │
│  4. Error Monitoring:                                        │
│     • Error Logs: System and application errors             │
│     • Failed Transactions: Payment processing failures       │
│     • Authentication Failures: Login attempt monitoring      │
│     • API Errors: Integration and API call failures          │
│                                                                 │
│  5. Alert Management:                                        │
│     • System Alerts: Critical system notifications           │
│     • Performance Alerts: Threshold-based warnings          │
│     • Security Alerts: Suspicious activity notifications     │
│     • Maintenance Alerts: Scheduled maintenance notices      │
│                                                                 │
│  6. Reporting:                                              │
│     • Daily Reports: System performance summary              │
│     • Weekly Analytics: Trend analysis and insights         │
│     • Monthly Summaries: Comprehensive system overview      │
│     • Custom Reports: On-demand reporting capabilities      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Audit Log Management
```
┌─────────────────────────────────────────────────────────────────┐
│                  AUDIT LOG MANAGEMENT                         │
│                                                                 │
│  1. Accessing Audit Logs:                                     │
│     • Navigate to Settings → Audit Logs                      │
│     • Filter by date range, user, or action type              │
│     • Export logs for compliance reporting                    │
│     • Search for specific activities                           │
│                                                                 │
│  2. Log Categories:                                           │
│     • User Management: Account creation, updates, deletions   │
│     • Authentication: Login attempts, password changes       │
│     • Payment Processing: Transaction initiation, completion  │
│     • System Changes: Configuration updates, system events    │
│     • Data Access: Record viewing, modifications              │
│     • Security Events: Blocked attempts, suspicious activity │
│                                                                 │
│  3. Log Analysis:                                            │
│     • User Activity Patterns: Login times, usage frequency   │
│     • Security Incidents: Failed logins, access violations   │
│     • Compliance Tracking: Required activity documentation   │
│     • Performance Issues: System errors and response times    │
│                                                                 │
│  4. Retention Policies:                                      │
│     • Standard Logs: 90 days retention                       │
│     • Security Logs: 365 days retention                      │
│     • Compliance Logs: 7 years retention (as required)       │
│     • Archive Management: Log archival and storage           │
│                                                                 │
│  5. Compliance Reporting:                                    │
│     • Generate compliance reports                             │
│     • Export audit trails for regulators                      │
│     • Document security incidents                            │
│     • Maintain chain of custody                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Wholesaler Admin User Manual

#### Overview
The Wholesaler Admin manages tenant operations, including retailers, line workers, areas, invoices, and payment collection within their assigned wholesaler account.

#### Getting Started
```
┌─────────────────────────────────────────────────────────────────┐
│                WHOLESALER ADMIN GETTING STARTED                │
│                                                                 │
│  1. Account Access:                                           │
│     • URL: https://phlynk.yourdomain.com                      │
│     • Credentials: Provided by Super Admin                    │
│     • First-time login: Change password immediately           │
│     • Complete profile setup                                  │
│                                                                 │
│  2. Dashboard Overview:                                      │
│     • Tenant Metrics: Users, transactions, outstanding amounts │
│     • Quick Actions: Create users, invoices, view reports     │
│     • Recent Activity: Latest transactions and user actions  │
│     • Performance Indicators: Collection efficiency, metrics │
│                                                                 │
│  3. Navigation:                                             │
│     • Dashboard: Tenant overview and key metrics             │
│     • Retailers: Manage retailer accounts and relationships │
│     • Line Workers: Manage field staff and assignments       │
│     • Areas: Define geographic service areas                 │
│     • Invoices: Create and manage customer invoices         │
│     • Payments: View payment history and status             │
│     • Analytics: Tenant performance and reporting          │
│     • Settings: Tenant configuration and preferences        │
│                                                                 │
│  4. Initial Setup:                                          │
│     • Configure company profile and settings                │
│     • Set up geographic service areas                       │
│     • Create initial line worker accounts                   │
│     • Onboard first retailers                              │
│     • Configure notification preferences                    │
│                                                                 │
│  5. Best Practices:                                         │
│     • Regular retailer communication                        │
│     • Monitor line worker performance                       │
│     • Keep payment terms consistent                         │
│     • Maintain accurate retailer information               │
│     • Regular performance reviews                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Operations

##### Managing Retailers
```
┌─────────────────────────────────────────────────────────────────┐
│                   MANAGING RETAILERS                          │
│                                                                 │
│  1. Creating Retailer Accounts:                               │
│     • Navigate to Retailers → Create New Retailer            │
│     • Fill in Business Information:                            │
│       - Store Name: Business name of retailer                │
│       - Owner Name: Store owner/manager name                 │
│       - Phone Number: Contact phone number                   │
│       - Email Address: Business email (optional)             │
│       - Address: Complete store address                     │
│       - Area Assignment: Geographic service area            │
│       - Credit Limit: Maximum credit allowed                │
│       - Payment Terms: Net payment terms                    │
│                                                                 │
│  2. Retailer Configuration:                                  │
│     • Account Status: Active/Suspended                       │
│     • Notification Preferences: SMS/Email settings         │
│     • Payment Methods: Accepted payment types               │
│     • Delivery Schedule: Preferred delivery times          │
│     • Contact Persons: Additional contacts                 │
│                                                                 │
│  3. Area Assignment:                                        │
│     • Select geographic area from dropdown                   │
│     • Assign line workers for service                        │
│     • Set visit frequency and schedule                      │
│     • Configure special requirements                        │
│                                                                 │
│  4. Credit Management:                                       │
│     • Set initial credit limit                              │
│     • Configure payment terms (Net 15, Net 30, etc.)        │
│     • Set up automatic credit reviews                        │
│     • Configure overdue payment handling                    │
│                                                                 │
│  5. Bulk Operations:                                        │
│     • Import retailers from CSV/Excel                       │
│     • Bulk update retailer information                     │
│     • Mass assign areas or line workers                     │
│     • Export retailer data for reporting                    │
│                                                                 │
│  6. Retailer Communication:                                 │
│     • Send welcome messages                                  │
│     • Notify about payment terms changes                    │
│     • Share promotional information                         │
│     • Provide support contact information                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Managing Line Workers
```
┌─────────────────────────────────────────────────────────────────┐
│                  MANAGING LINE WORKERS                        │
│                                                                 │
│  1. Creating Line Worker Accounts:                            │
│     • Navigate to Line Workers → Create New Line Worker      │
│     • Fill in Personal Information:                           │
│       - Full Name: Legal name of line worker                 │
│       - Phone Number: Mobile contact number                  │
│       - Email Address: Personal email (optional)             │
│       - Address: Residential address                        │
│       - Emergency Contact: Emergency contact details        │
│       - Identification: ID number and type                   │
│                                                                 │
│  2. Line Worker Configuration:                                │
│     • Employee ID: Company identification number              │
│     • Department: Sales/Field Operations                     │
│     • Hire Date: Date of employment                          │
│     • Account Status: Active/Suspended/On Leave             │
│     • Work Schedule: Working days and hours                  │
│                                                                 │
│  3. Area Assignment:                                        │
│     • Assign geographic areas from service areas             │
│     • Set primary and secondary areas                       │
│     • Configure visit routes and schedules                  │
│     • Set retailer assignments within areas                  │
│                                                                 │
│  4. Performance Targets:                                    │
│     • Daily collection targets                              │
│     • Weekly collection goals                               │
│     • Monthly performance metrics                           │
│     • Commission structure and rates                        │
│                                                                 │
│  5. Training and Certification:                             │
│     • Training completion status                            │
│     • Certification details                                  │
│     • Skills assessment results                            │
│     • Performance review history                            │
│                                                                 │
│  6. Line Worker Management:                                 │
│     • Monitor daily activities and collections              │
│     • Track performance against targets                     │
│     • Handle time-off requests and scheduling               │
│     • Manage disciplinary actions                            │
│     • Coordinate team meetings and training               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Creating and Managing Invoices
```
┌─────────────────────────────────────────────────────────────────┐
│              CREATING AND MANAGING INVOICES                   │
│                                                                 │
│  1. Creating New Invoices:                                    │
│     • Navigate to Invoices → Create New Invoice               │
│     • Select Retailer: Choose from dropdown list             │
│     • Invoice Information:                                    │
│       - Invoice Number: Auto-generated or manual             │
│       - Invoice Date: Date of invoice creation               │
│       - Due Date: Payment due date                           │
│       - Payment Terms: Net payment period                   │
│                                                                 │
│  2. Adding Line Items:                                       │
│     • Product/Medicine Name: Item description                │
│     • Quantity: Number of units                              │
│     • Unit Price: Price per unit                            │
│     • Total Amount: Calculated automatically                │
│     • Batch Number: Medicine batch information               │
│     • Expiry Date: Medicine expiry date                     │
│                                                                 │
│  3. Invoice Configuration:                                  │
│     • Discount Information: Any applicable discounts         │
│     • Tax Information: Tax rates and amounts                 │
│     • Shipping Charges: Delivery costs                      │
│     • Other Charges: Additional fees                       │
│     • Notes: Special instructions or comments               │
│                                                                 │
│  4. Invoice Management:                                      │
│     • Status Management: OPEN, PARTIAL, PAID, CANCELLED    │
│     • Payment Tracking: Link payments to invoices          │
│     • Reminder System: Automated payment reminders         │
│     • Aging Reports: Track overdue invoices                │
│                                                                 │
│  5. Bulk Invoice Operations:                                │
│     • Create multiple invoices for retailers               │
│     • Import invoices from external systems                │
│     • Generate recurring invoices                          │
│     • Export invoice data for accounting                   │
│                                                                 │
│  6. Invoice Analytics:                                      │
│     • Aging Analysis: Overdue invoice reporting            │
│     • Payment Patterns: Customer payment behavior          │
│     • Revenue Recognition: Monthly revenue tracking        │
│     • Exception Reporting: Unusual invoice patterns        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Line Worker User Manual

#### Overview
Line Workers are field staff responsible for visiting retailers, collecting payments, and maintaining customer relationships within assigned geographic areas.

#### Getting Started
```
┌─────────────────────────────────────────────────────────────────┐
│                  LINE WORKER GETTING STARTED                  │
│                                                                 │
│  1. Mobile App Access:                                        │
│     • Download PWA from https://phlynk.yourdomain.com         │
│     • Install on home screen for easy access                  │
│     • Login with credentials provided by Wholesaler Admin     │
│     • Enable location services for area tracking             │
│                                                                 │
│  2. Dashboard Overview:                                      │
│     • Today's Schedule: Retailers to visit                   │
│     • Collection Targets: Daily/weekly goals                  │
│     • Outstanding Amounts: Total collectible in area         │
│     • Recent Payments: Latest collected payments             │
│     • Performance Metrics: Collection efficiency stats       │
│                                                                 │
│  3. Navigation:                                             │
│     • Dashboard: Daily overview and schedule                 │
│     • My Retailers: Assigned retailer list and details       │
│     • Payment Collection: Initiate and track payments       │
│     • Area Map: Geographic view of assigned area            │
│     • Performance: Personal metrics and achievements         │
│     • Messages: Communication with wholesalers              │
│     • Profile: Personal information and settings           │
│                                                                 │
│  4. Daily Operations:                                        │
│     • Check daily schedule and route                        │
│     • Plan retailer visits efficiently                       │
│     • Collect payments using OTP verification               │
│     • Update retailer information as needed                 │
│     • Report any issues or exceptions                       │
│                                                                 │
│  5. Best Practices:                                         │
│     • Maintain professional appearance and behavior         │
│     • Verify retailer identity before collecting payments   │
│     • Use OTP verification for all transactions             │
│     • Keep accurate records of all interactions             │
│     • Communicate regularly with wholesaler admin          │
│     • Report any suspicious activities immediately          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Operations

##### Payment Collection Process
```
┌─────────────────────────────────────────────────────────────────┐
│                  PAYMENT COLLECTION PROCESS                    │
│                                                                 │
│  1. Pre-Visit Preparation:                                    │
│     • Check retailer's outstanding balance                  │
│     • Review recent payment history                          │
│     • Verify retailer account status                         │
│     • Plan visit timing and route                            │
│     • Prepare necessary materials (receipts, forms)          │
│                                                                 │
│  2. Retailer Visit:                                          │
│     • Arrive at retailer location                            │
│     • Greet retailer professionally                          │
│     • Verify retailer identity                               │
│     • Discuss outstanding invoices and payments             │
│     • Address any questions or concerns                     │
│                                                                 │
│  3. Initiating Payment:                                     │
│     • Open pHLynk app on mobile device                      │
│     • Select retailer from assigned list                    │
│     • View outstanding amount and invoice details           │
│     • Enter payment amount (full or partial)                │
│     • Confirm payment details with retailer                 │
│     • Click "Initiate Payment"                               │
│                                                                 │
│  4. OTP Generation and Verification:                        │
│     • System generates 6-digit OTP                          │
│     • OTP sent to retailer via SMS                           │
│     • Retailer receives OTP on their phone                  │
│     • Retailer enters OTP in verification screen            │
│     • System validates OTP and confirms payment             │
│                                                                 │
│  5. Payment Completion:                                     │
     • System updates payment status to COMPLETED            │
     • Invoice status updated (PARTIAL/PAID)                 │
     • Digital receipt generated automatically               │
     • Both line worker and retailer receive confirmation    │
     • Real-time notification sent to wholesaler admin       │
                                                                 │
│  6. Post-Collection Tasks:                                  │
│     • Provide payment receipt to retailer                   │
│     • Update any retailer information changes              │
│     • Note any special circumstances or issues             │
│     • Schedule follow-up visits if needed                   │
│     • Proceed to next scheduled retailer                    │
│                                                                 │
│  7. Exception Handling:                                     │
│     • Retailer unavailable: Reschedule visit               │
│     • Payment disputes: Document and report to admin        │
│     • System issues: Use offline mode or contact support    │
│     • Network problems: Wait for connectivity or use offline│
│     • Retailer complaints: Listen and report appropriately  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Area Management and Route Planning
```
┌─────────────────────────────────────────────────────────────────┐
│               AREA MANAGEMENT AND ROUTE PLANNING              │
│                                                                 │
│  1. Understanding Assigned Areas:                             │
│     • View assigned geographic areas on map                   │
│     • Review area boundaries and retailer locations           │
│     • Understand area-specific collection targets              │
│     • Note any special area requirements                      │
│                                                                 │
│  2. Daily Route Planning:                                     │
│     • Check daily schedule of retailer visits                 │
│     • Optimize route for efficiency and time management       │
│     • Consider traffic patterns and retailer availability     │
│     • Plan for adequate time at each location                 │
│     • Set realistic collection targets for the day           │
│                                                                 │
│  3. Using Area Map Features:                                 │
│     • View all assigned retailers on interactive map         │
│     • Filter retailers by payment status or amount           │
│     • Get directions to retailer locations                    │
│     • Check-in at locations using GPS                         │
│     • Track visit progress throughout the day                 │
│                                                                 │
│  4. Retailer Prioritization:                                 │
│     • Prioritize high-value retailers                        │
│     • Focus on overdue payments                               │
│     • Consider retailer payment patterns                     │
│     • Balance workload across different areas                 │
│     • Adjust priorities based on wholesaler instructions     │
│                                                                 │
│  5. Performance Tracking:                                    │
│     • Monitor daily collection progress                       │
│     • Track performance against targets                       │
│     • Identify high-performing and underperforming areas     │
│     • Report area-specific challenges or opportunities       │
│     • Suggest area improvements to wholesaler admin          │
│                                                                 │
│  6. Area Expansion Management:                               │
│     • Handle new retailer assignments in area                │
│     • Report area capacity issues                            │
│     • Suggest area boundary adjustments                       │
│     • Coordinate with other line workers on area coverage    │
│     • Provide feedback on area assignment efficiency         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Offline Operations
```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE OPERATIONS                         │
│                                                                 │
│  1. Offline Mode Activation:                                  │
│     • System automatically detects poor connectivity          │
│     • Manual offline mode available in settings               │
│     • Data synchronization occurs when connection restored     │
│     • Limited functionality available offline                 │
│                                                                 │
│  2. Offline Payment Collection:                               │
│     • Download retailer data before going offline           │
│     • View outstanding amounts and invoice details            │
│     • Initiate payments with offline OTP generation          │
│     • Store payment data locally until sync                   │
│     • Generate offline receipts for retailers                 │
│                                                                 │
│  3. Data Synchronization:                                    │
│     • Automatic sync when internet connection restored       │
│     • Manual sync option available in settings               │
│     • Conflict resolution for duplicate entries              │
│     • Sync status indicators for all operations              │
│     • Detailed sync logs for troubleshooting                │
│                                                                 │
│  4. Offline Retailer Management:                             │
│     • View basic retailer information offline                │
│     • Update retailer contact information                    │
│     • Add notes about retailer visits                        │
│     • Flag issues for follow-up when online                  │
│     • Track visit history offline                            │
│                                                                 │
│  5. Offline Reporting and Analytics:                         │
│     • View basic performance metrics offline                 │
│     • Track daily collection progress                         │
│     • Generate simple reports for immediate use              │
│     • Store analytics data for later sync                    │
│     • Export basic data when needed                          │
│                                                                 │
│  6. Best Practices for Offline Operations:                    │
│     • Plan ahead for areas with poor connectivity             │
│     • Sync data before entering offline areas                 │
│     • Use offline receipts as backup                          │
│     • Document all activities thoroughly                     │
│     • Sync data as soon as connection is available           │
│     • Report any sync issues immediately                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Retailer User Manual

#### Overview
Retailers use pHLynk to view outstanding amounts, make payments, verify transactions via OTP, and manage their store information.

#### Getting Started
```
┌─────────────────────────────────────────────────────────────────┐
│                    RETAILER GETTING STARTED                     │
│                                                                 │
│  1. Account Access:                                           │
│     • URL: https://phlynk.yourdomain.com/retailer            │
│     • Login with phone number and OTP                         │
│     • First-time setup: Verify store information              │
│     • Complete profile configuration                          │
│                                                                 │
│  2. Dashboard Overview:                                      │
│     • Outstanding Balance: Total amount due                 │
│     • Recent Invoices: Latest invoice details                │
│     • Payment History: Past transaction records              │
│     • Quick Actions: Make payment, view details              │
│     • Notifications: Payment requests and confirmations      │
│                                                                 │
│  3. Navigation:                                             │
│     • Dashboard: Overview of account status                  │
│     • Invoices: View all invoices and details                │
│     • Payments: Make payments and view history               │
│     • Store Profile: Manage store information               │
│     • Notifications: View alerts and messages               │
│     • Support: Get help and contact information              │
│                                                                 │
│  4. Initial Setup:                                          │
│     • Verify store information is correct                    │
│     • Set up notification preferences                        │
│     • Add authorized contact persons                         │
│     • Configure payment methods                              │
│     • Review payment terms and conditions                   │
│                                                                 │
│  5. Best Practices:                                         │
│     • Keep contact information updated                       │
│     • Monitor outstanding balances regularly                │
│     • Respond promptly to payment requests                  │
│     • Verify all payment details before confirming          │
│     • Report any discrepancies immediately                   │
│     • Maintain good payment history                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Operations

##### Making Payments
```
┌─────────────────────────────────────────────────────────────────┐
│                      MAKING PAYMENTS                           │
│                                                                 │
│  1. Payment Initiation:                                       │
│     • Line worker visits store and initiates payment          │
│     • Retailer receives notification on phone/app           │
│     • System displays payment amount and details             │
│     • Retailer verifies payment information                  │
│     • System generates 6-digit OTP for verification         │
│                                                                 │
│  2. OTP Verification Process:                                │
│     • OTP sent via SMS to registered phone number           │
│     • Retailer receives OTP message                          │
│     • Enter OTP in verification screen                       │
│     • System validates OTP and confirms payment              │
│     • Payment processed and recorded in system              │
│                                                                 │
│  3. Payment Confirmation:                                    │
│     • System generates digital receipt                       │
│     • Receipt sent to retailer via SMS/email                │
│     • Real-time notification sent to line worker            │
│     • Wholesaler admin receives payment notification        │
│     • Outstanding balance updated immediately               │
│     • Invoice status updated (PARTIAL/PAID)                 │
│                                                                 │
│  4. Payment History:                                        │
│     • View all past payments in dashboard                   │
│     • Filter payments by date, amount, or status            │
│     • Download payment receipts and statements              │
│     • Track payment patterns and trends                     │
│     • Reconcile payments with invoices                     │
│                                                                 │
│  5. Partial Payments:                                       │
│     • System supports partial payments                      │
│     • Enter partial amount when requested                   │
│     • OTP verification required for all payments           │
│     • Remaining balance tracked automatically              │
│     • Updated outstanding balance shown immediately         │
│                                                                 │
│  6. Payment Disputes:                                       │
│     • Report payment discrepancies immediately              │
│     • Contact wholesaler admin for resolution               │
│     • Provide supporting documentation                      │
│     • Track dispute resolution status                       │
│     • Follow up until issue is resolved                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Managing Invoices
```
┌─────────────────────────────────────────────────────────────────┐
│                    MANAGING INVOICES                           │
│                                                                 │
│  1. Viewing Invoices:                                         │
│     • Navigate to Invoices section                            │
│     • View all invoices in list format                       │
│     • Filter invoices by status (OPEN, PARTIAL, PAID)        │
│     • Sort invoices by date, amount, or due date             │
│     • Search for specific invoices by number or date          │
│                                                                 │
│  2. Invoice Details:                                         │
│     • Click on invoice to view full details                  │
│     • Review invoice header information                       │
│     • Check line items and quantities                        │
│     • Verify amounts and calculations                        │
│     • View payment history for specific invoice              │
│     • Download invoice PDF for records                       │
│                                                                 │
│  3. Invoice Status Management:                                │
│     • OPEN: No payments made, full amount due                │
│     • PARTIAL: Some payments made, balance remaining         │
│     • PAID: Full amount paid, no balance due                 │
│     • CANCELLED: Invoice voided, no payment required         │
│     • Track status changes in real-time                      │
│                                                                 │
│  4. Aging Reports:                                           │
│     • View invoices by aging period (0-30, 31-60, 61-90 days)│
│     • Identify overdue invoices requiring attention        │
│     • Prioritize payments for oldest invoices               │
│     • Track payment timeliness and patterns                 │
│     • Plan cash flow based on upcoming due dates            │
│                                                                 │
│  5. Invoice Disputes:                                       │
│     • Report invoice discrepancies immediately              │
│     • Provide detailed information about the issue          │
│     • Attach supporting documentation                        │
│     • Track dispute resolution status                       │
│     • Communicate with wholesaler for resolution            │
│                                                                 │
│  6. Bulk Invoice Operations:                                │
│     • Download multiple invoices as PDF                      │
│     • Export invoice data to Excel/CSV                      │
│     • Print multiple invoices for records                   │
│     • Filter and view invoices by specific criteria         │
│     • Generate invoice summaries for accounting            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Store Profile Management
```
┌─────────────────────────────────────────────────────────────────┐
│                 STORE PROFILE MANAGEMENT                       │
│                                                                 │
│  1. Basic Information:                                         │
│     • Store Name: Official business name                      │
│     • Owner Name: Store owner/manager name                    │
│     • Phone Number: Primary contact number                  │
│     • Email Address: Business email address                  │
│     • Address: Complete store address                        │
│     • Business Hours: Operating hours                        │
│     • Business License: License number and expiry           │
│                                                                 │
│  2. Location Details:                                        │
│     • Geographic Coordinates: GPS location for mapping       │
│     • Area Assignment: Service area designation              │
│     • Landmark: Nearby landmarks for easy location           │
│     • Parking Information: Available parking facilities     │
│     • Accessibility: Store accessibility information         │
│     • Delivery Instructions: Special delivery directions   │
│                                                                 │
│  3. Contact Persons:                                         │
│     • Primary Contact: Main person for communications        │
│     • Secondary Contacts: Additional authorized persons     │
│     • Emergency Contacts: After-hours contact information    │
│     • Payment Authorizers: Persons authorized to make payments│
│     • Order Contacts: Persons placing orders                 │
│                                                                 │
│  4. Business Details:                                        │
│     • Business Type: Pharmacy, medical store, etc.          │
│     • Year Established: Business founding year               │
│     • Employee Count: Number of employees                    │
│     • Store Size: Square footage or size category           │
│     • Specializations: Areas of business specialization      │
│     • Certifications: Business certifications held           │
│                                                                 │
│  5. Financial Information:                                   │
│     • Credit Limit: Maximum credit allowed                   │
│     • Payment Terms: Net payment terms (Net 15, Net 30, etc.)│
│     • Payment Methods: Accepted payment types              │
│     • Bank Details: Account information for payments         │
│     • Tax Information: Business tax details                  │
│     • Financial References: Bank or trade references        │
│                                                                 │
│  6. Preferences and Settings:                                │
│     • Notification Preferences: SMS/Email settings          │
│     • Delivery Preferences: Preferred delivery times        │
│     • Order Preferences: Ordering preferences               │
│     • Communication Preferences: Contact method preferences │
│     • Privacy Settings: Data sharing preferences            │
│     • Marketing Preferences: Marketing communication settings│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 System Requirements

### Hardware Requirements
```
┌─────────────────────────────────────────────────────────────────┐
│                    HARDWARE REQUIREMENTS                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SERVER REQUIREMENTS                     │   │
│  │                                                         │   │
│  │  Minimum Requirements:                                  │   │
│  │  • CPU: 2 cores @ 2.0 GHz                              │   │
│  │  • RAM: 4 GB                                           │   │
│  │  • Storage: 50 GB SSD                                   │   │
│  │  • Network: 10 Mbps                                     │   │
│  │  • OS: Linux (Ubuntu 18.04+, CentOS 7+)                 │   │
│  │                                                         │   │
│  │  Recommended Requirements:                              │   │
│  │  • CPU: 4 cores @ 2.5 GHz                              │   │
│  │  • RAM: 8 GB                                           │   │
│  │  • Storage: 100 GB SSD                                  │   │
│  │  • Network: 100 Mbps                                    │   │
│  │  • OS: Linux (Ubuntu 20.04+, CentOS 8+)                 │   │
│  │                                                         │   │
│  │  High-Volume Requirements:                              │   │
│  │  • CPU: 8 cores @ 3.0 GHz                              │   │
│  │  • RAM: 16 GB                                          │   │
│  │  • Storage: 200 GB SSD                                  │   │
│  │  • Network: 1 Gbps                                      │   │
│  │  • OS: Linux (Ubuntu 22.04+, CentOS 9+)                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                CLIENT REQUIREMENTS                      │   │
│  │                                                         │   │
│  │  Desktop Requirements:                                   │   │
│  │  • CPU: 2 cores @ 1.5 GHz                              │   │
│  │  • RAM: 4 GB                                           │   │
│  │  • Storage: 1 GB available space                       │   │
│  │  • Network: 1 Mbps                                      │   │
│  │  • Browser: Chrome 90+, Firefox 88+, Safari 14+         │   │
│  │                                                         │   │
│  │  Mobile Requirements:                                    │   │
│  │  • CPU: 1.5 GHz dual-core                              │   │
│  │  • RAM: 2 GB                                           │   │
│  │  • Storage: 500 MB available space                     │   │
│  │  • Network: 512 Kbps                                    │   │
│  │  • OS: iOS 12+, Android 8+                             │   │
│  │  • Browser: Chrome 90+, Safari 14+                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Software Requirements
```
┌─────────────────────────────────────────────────────────────────┐
│                    SOFTWARE REQUIREMENTS                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SERVER SOFTWARE                          │   │
│  │                                                         │   │
│  │  Operating System:                                      │   │
│  │  • Linux: Ubuntu 18.04 LTS or later                    │   │
│  │  • Alternative: CentOS 7+, RHEL 7+                      │   │
│  │  • Container Support: Docker 20.10+                     │   │
│  │                                                         │   │
│  │  Runtime Environment:                                   │   │
│  │  • Node.js: 18.x LTS or later                           │   │
│  │  • npm: 8.x or later                                   │   │
│  │  • TypeScript: 5.x or later                             │   │
│  │                                                         │   │
│  │  Database:                                               │   │
│  │  • Firebase Firestore (Primary)                         │   │
│  │  • SQLite (Secondary, via Prisma)                        │   │
│  │  • Redis (Optional, for caching)                        │   │
│  │                                                         │   │
│  │  Web Server:                                            │   │
│  │  • Next.js 15 with custom server                        │   │
│  │  • Socket.IO 4.x for real-time features                 │   │
│  │  • Nginx (Optional, for reverse proxy)                   │   │
│  │                                                         │   │
│  │  Security:                                               │   │
│  │  • SSL/TLS Certificate (Let's Encrypt or commercial)    │   │
│  │  • Firewall: UFW or iptables                             │   │
│  │  • Fail2Ban (Optional, for intrusion prevention)        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 CLIENT SOFTWARE                          │   │
│  │                                                         │   │
│  │  Web Browsers:                                          │   │
│  │  • Google Chrome 90+ (Recommended)                      │   │
│  │  • Mozilla Firefox 88+                                  │   │
│  │  • Safari 14+                                           │   │
│  │  • Microsoft Edge 90+                                   │   │
│  │                                                         │   │
│  │  Mobile Browsers:                                       │   │
│  │  • Chrome Mobile 90+                                    │   │
│  │  • Safari Mobile 14+                                     │   │
│  │  • Firefox Mobile 88+                                    │   │
│  │                                                         │   │
│  │  Progressive Web App (PWA):                              │   │
│  │  • Service Worker Support                                │   │
│  │  • Web App Manifest                                     │   │
│  │  • Offline Capability                                   │   │
│  │  • Push Notification Support                            │   │
│  │                                                         │   │
│  │  Mobile Apps (Optional):                                │   │
│  │  • iOS: iOS 12+ with Safari                              │   │
│  │  • Android: Android 8+ with Chrome                       │   │
│  │  • PWA Installation on Home Screen                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Network Requirements
```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK REQUIREMENTS                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 BANDWIDTH REQUIREMENTS                  │   │
│  │                                                         │   │
│  │  Server-Side Requirements:                              │   │
│  │  • Minimum: 10 Mbps upload/download                    │   │
│  │  • Recommended: 100 Mbps upload/download                │   │
│  │  • High-Volume: 1 Gbps upload/download                 │   │
│  │                                                         │   │
│  │  Client-Side Requirements:                            │   │
│  │  • Desktop: 1 Mbps minimum, 10 Mbps recommended        │   │
│  │  • Mobile: 512 Kbps minimum, 5 Mbps recommended       │   │
│  │  • Offline Support: Available for poor connectivity    │   │
│  │                                                         │   │
│  │  Real-Time Features:                                   │   │
│  │  • WebSocket: Persistent connection required          │   │
│  │  • Latency: < 200ms for optimal experience             │   │
│  │  • Jitter: < 30ms for stable connections               │   │
│  │  • Packet Loss: < 1% for reliable communication        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 PORT REQUIREMENTS                       │   │
│  │                                                         │   │
│  │  Required Ports:                                        │   │
│  │  • Port 80: HTTP (redirects to HTTPS)                   │   │
│  │  • Port 443: HTTPS (primary application port)           │   │
│  │  • Port 3000: Development server (production optional)  │   │
│  │  • Port 22: SSH (server administration)                │   │
│  │                                                         │   │
│  │  Firebase Ports:                                        │   │
│  │  • Port 5228: Firebase connectivity                      │   │
│  │  • Port 5229: Firebase connectivity                      │   │
│  │  • Port 5230: Firebase connectivity                      │   │
│  │                                                         │   │
│  │  Optional Ports:                                        │   │
│  │  • Port 25: SMTP (email notifications)                  │   │
│  │  • Port 587: SMTP Submission                             │   │
│  │  • Port 465: SMTPS (Secure SMTP)                       │   │
│  │  • Port 3306: MySQL (if using alternative database)    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SECURITY REQUIREMENTS                  │   │
│  │                                                         │   │
│  │  Network Security:                                      │   │
│  │  • SSL/TLS Encryption: Required for all traffic        │   │
│  │  • Firewall: Configured to allow only necessary ports   │   │
│  │  • DDoS Protection: Recommended for production         │   │
│  │  • VPN Access: Recommended for server administration   │   │
│  │                                                         │   │
│  │  DNS Requirements:                                      │   │
│  │  • Domain Name: Required for SSL certificate           │   │
│  │  • DNS Records: A, AAAA, MX, TXT, SRV                  │   │
│  │  • DNSSEC: Recommended for additional security          │   │
│  │  • CDN: Optional for performance optimization           │   │
│  │                                                         │   │
│  │  API Security:                                          │   │
│  │  • Rate Limiting: Required to prevent abuse             │   │
│  │  • API Keys: Required for external integrations        │   │
│  │  • IP Whitelisting: Recommended for sensitive APIs     │   │
│  │  • Request Signing: Recommended for critical APIs     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Scalability Requirements
```
┌─────────────────────────────────────────────────────────────────┐
│                   SCALABILITY REQUIREMENTS                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 USER SCALABILITY                         │   │
│  │                                                         │   │
│  │  Current Scale Targets:                                  │   │
│  │  • Wholesalers: 50 tenants                              │   │
│  │  • Retailers: 1,000 stores (20 per wholesaler)          │   │
│  │  • Line Workers: 250 field staff (5 per wholesaler)     │   │
│  │  • Concurrent Users: 500 simultaneous users             │   │
│  │  • Daily Transactions: ~5,000 payment collections         │   │
│  │                                                         │   │
│  │  Medium Scale Targets:                                  │   │
│  │  • Wholesalers: 200 tenants                             │   │
│  │  • Retailers: 10,000 stores (50 per wholesaler)         │   │
│  │  • Line Workers: 2,000 field staff (10 per wholesaler)  │   │
│  │  • Concurrent Users: 2,000 simultaneous users            │   │
│  │  • Daily Transactions: ~50,000 payment collections       │   │
│  │                                                         │   │
│  │  Large Scale Targets:                                   │   │
│  │  • Wholesalers: 1,000 tenants                           │   │
│  │  • Retailers: 100,000 stores (100 per wholesaler)       │   │
│  │  • Line Workers: 20,000 field staff (20 per wholesaler) │   │
│  │  • Concurrent Users: 10,000 simultaneous users          │   │
│  │  • Daily Transactions: ~500,000 payment collections      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 DATA SCALABILITY                         │   │
│  │                                                         │   │
│  │  Database Requirements:                                  │   │
│  │  • Current: Firebase Firestore (10 GB free tier)       │   │
│  │  • Medium: Firestore Blaze/Pay-as-you-go plan           │   │
│  │  • Large: Firestore Enterprise plan                     │   │
│  │  • Backup: Automated daily backups with retention       │   │
│  │                                                         │   │
│  │  Storage Requirements:                                  │   │
│  │  • Current: 5 GB for documents and images              │   │
│  │  • Medium: 50 GB for expanded usage                    │   │
│  │  • Large: 500 GB for enterprise scale                   │   │
│  │  • CDN: Content delivery for static assets            │   │
│  │                                                         │   │
│  │  Performance Requirements:                               │   │
│  │  • Response Time: < 2 seconds for 95% of requests      │   │
│  │  • Uptime: 99.9% availability SLA                       │   │
│  │  • Concurrent Connections: 10,000 WebSocket connections  │   │
│  │  • Throughput: 1,000 requests per second               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 INFRASTRUCTURE SCALABILITY              │   │
│  │                                                         │   │
│  │  Horizontal Scaling:                                    │   │
│  │  • Load Balancing: Multiple application servers         │   │
│  │  • Database Sharding: Multi-region database setup       │   │
│  │  • Caching Layer: Redis cluster for performance         │   │
│  │  • CDN: Global content delivery network                │   │
│  │                                                         │   │
│  │  Vertical Scaling:                                      │   │
│  │  • Server Upgrades: CPU, RAM, Storage improvements      │   │
│  │  • Database Optimization: Query optimization, indexing   │   │
│  │  • Application Optimization: Code and algorithm improvements│   │
│  │  • Network Optimization: Bandwidth and latency reduction │   │
│  │                                                         │   │
│  │  Geographic Scaling:                                    │   │
│  │  • Multi-Region: Deploy across multiple geographic regions│   │
│  │  • Edge Computing: Process data closer to users         │   │
│  │  • Local Caching: Reduce latency for distant users      │   │
│  │  • Failover: Automatic region switching                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Documentation

### Authentication APIs
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION APIS                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 LOGIN API                              │   │
│  │                                                         │   │
│  │  POST /api/auth/login                                   │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "email": "user@example.com",                        │   │
│  │    "password": "userPassword",                          │   │
│  │    "role": "WHOLESALER_ADMIN"                           │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "user": {                                            │   │
│  │      "id": "user123",                                    │   │
│  │      "email": "user@example.com",                       │   │
│  │      "name": "John Doe",                                │   │
│  │      "role": "WHOLESALER_ADMIN",                        │   │
│  │      "tenantId": "tenant456"                            │   │
│  │    },                                                    │   │
│  │    "token": "eyJhbGciOiJIUzI1NiIs...",                  │   │
│  │    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",             │   │
│  │    "expiresIn": 3600                                     │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Error - 401):                                │   │
│  │  {                                                       │   │
│  │    "success": false,                                    │   │
│  │    "error": "Invalid credentials"                        │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 LOGOUT API                             │   │
│  │                                                         │   │
│  │  POST /api/auth/logout                                  │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "message": "Logged out successfully"                 │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 REFRESH TOKEN API                      │   │
│  │                                                         │   │
│  │  POST /api/auth/refresh                                 │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."             │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "token": "eyJhbGciOiJIUzI1NiIs...",                  │   │
│  │    "expiresIn": 3600                                     │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### User Management APIs
```
┌─────────────────────────────────────────────────────────────────┐
│                   USER MANAGEMENT APIS                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 GET USERS API                           │   │
│  │                                                         │   │
│  │  GET /api/users                                          │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Query Parameters:                                      │   │
│  │  • role: Filter by user role (SUPER_ADMIN,             │   │
│  │    WHOLESALER_ADMIN, LINE_WORKER)                       │   │
│  │  • tenantId: Filter by tenant ID                        │   │
│  │  • status: Filter by user status (ACTIVE, SUSPENDED)    │   │
│  │  • page: Page number for pagination                     │   │
│  │  • limit: Number of items per page                      │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "users": [                                           │   │
│  │      {                                                   │   │
│  │        "id": "user123",                                  │   │
│  │        "email": "user@example.com",                     │   │
│  │        "name": "John Doe",                              │   │
│  │        "role": "WHOLESALER_ADMIN",                      │   │
│  │        "tenantId": "tenant456",                        │   │
│  │        "status": "ACTIVE",                              │   │
│  │        "createdAt": "2023-01-01T00:00:00Z",             │   │
│  │        "updatedAt": "2023-01-01T00:00:00Z"              │   │
│  │      }                                                   │   │
│  │    ],                                                    │   │
│  │    "pagination": {                                      │   │
│  │      "page": 1,                                          │   │
│  │      "limit": 10,                                        │   │
│  │      "total": 25,                                        │   │
│  │      "totalPages": 3                                     │   │
│  │    }                                                     │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 CREATE USER API                        │   │
│  │                                                         │   │
│  │  POST /api/users                                         │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "email": "newuser@example.com",                     │   │
│  │    "name": "Jane Smith",                                │   │
│  │    "role": "LINE_WORKER",                              │   │
│  │    "tenantId": "tenant456",                            │   │
│  │    "phone": "+1234567890",                             │   │
│  │    "password": "temporaryPassword",                    │   │
│  │    "status": "ACTIVE"                                   │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 201):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "user": {                                            │   │
│  │      "id": "user789",                                    │   │
│  │      "email": "newuser@example.com",                   │   │
│  │      "name": "Jane Smith",                              │   │
│  │      "role": "LINE_WORKER",                            │   │
│  │      "tenantId": "tenant456",                          │   │
│  │      "status": "ACTIVE",                                │   │
│  │      "createdAt": "2023-01-01T00:00:00Z",               │   │
│  │      "updatedAt": "2023-01-01T00:00:00Z"                │   │
│  │    },                                                    │   │
│  │    "message": "User created successfully"               │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 UPDATE USER API                        │   │
│  │                                                         │   │
│  │  PUT /api/users/[id]                                    │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "name": "Jane Smith Updated",                        │   │
│  │    "phone": "+1234567890",                             │   │
│  │    "status": "ACTIVE"                                   │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "user": {                                            │   │
│  │      "id": "user789",                                    │   │
│  │      "email": "newuser@example.com",                   │   │
│  │      "name": "Jane Smith Updated",                      │   │
│  │      "role": "LINE_WORKER",                            │   │
│  │      "tenantId": "tenant456",                          │   │
│  │      "status": "ACTIVE",                                │   │
│  │      "updatedAt": "2023-01-01T00:00:00Z"                │   │
│  │    },                                                    │   │
│  │    "message": "User updated successfully"               │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Payment Management APIs
```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT MANAGEMENT APIS                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 INITIATE PAYMENT API                    │   │
│  │                                                         │   │
│  │  POST /api/payments                                      │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "retailerId": "retailer123",                         │   │
│  │    "invoiceId": "invoice456",                           │   │
│  │    "amount": 1500.00,                                   │   │
│  │    "method": "CASH",                                    │   │
│  │    "collectedBy": "worker789"                           │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 201):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "payment": {                                         │   │
│  │      "id": "payment789",                                │   │
│  │      "retailerId": "retailer123",                       │   │
│  │      "invoiceId": "invoice456",                         │   │
│  │      "amount": 1500.00,                                 │   │
│  │      "method": "CASH",                                  │   │
│  │      "status": "INITIATED",                             │   │
│  │      "collectedBy": "worker789",                        │   │
│  │      "otp": "123456",                                    │   │
│  │      "createdAt": "2023-01-01T00:00:00Z",               │   │
│  │      "updatedAt": "2023-01-01T00:00:00Z"                │   │
│  │    },                                                    │   │
│  │    "message": "Payment initiated successfully"         │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 VERIFY OTP API                          │   │
│  │                                                         │   │
│  │  POST /api/payments/verify-otp                          │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "paymentId": "payment789",                           │   │
│  │    "otp": "123456"                                      │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "payment": {                                         │   │
│  │      "id": "payment789",                                │   │
│  │      "status": "COMPLETED",                             │   │
│  │      "verifiedAt": "2023-01-01T00:00:00Z",               │   │
│  │      "updatedAt": "2023-01-01T00:00:00Z"                │   │
│  │    },                                                    │   │
│  │    "message": "OTP verified successfully"               │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 GET PAYMENTS API                        │   │
│  │                                                         │   │
│  │  GET /api/payments                                       │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Query Parameters:                                      │   │
│  │  • retailerId: Filter by retailer ID                    │   │
│  │  • invoiceId: Filter by invoice ID                      │   │
│  │  • status: Filter by payment status                    │   │
│  │  • startDate: Filter by start date                      │   │
│  │  • endDate: Filter by end date                          │   │
│  │  • page: Page number for pagination                     │   │
│  │  • limit: Number of items per page                      │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "payments": [                                        │   │
│  │      {                                                   │   │
│  │        "id": "payment789",                              │   │
│  │        "retailerId": "retailer123",                     │   │
│  │        "invoiceId": "invoice456",                       │   │
│  │        "amount": 1500.00,                               │   │
│  │        "method": "CASH",                                │   │
│  │        "status": "COMPLETED",                           │   │
│  │        "collectedBy": "worker789",                      │   │
│  │        "createdAt": "2023-01-01T00:00:00Z",             │   │
│  │        "verifiedAt": "2023-01-01T00:00:00Z"              │   │
│  │      }                                                   │   │
│  │    ],                                                    │   │
│  │    "pagination": {                                      │   │
│  │      "page": 1,                                          │   │
│  │      "limit": 10,                                        │   │
│  │      "total": 25,                                        │   │
│  │      "totalPages": 3                                     │   │
│  │    }                                                     │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### OTP Management APIs
```
┌─────────────────────────────────────────────────────────────────┐
│                    OTP MANAGEMENT APIS                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SEND OTP API                            │   │
│  │                                                         │   │
│  │  POST /api/otp/send                                      │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "phone": "+1234567890",                             │   │
│  │    "purpose": "PAYMENT_VERIFICATION"                   │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "otp": "123456",                                     │   │
│  │    "expiresAt": "2023-01-01T00:10:00Z",                 │   │
│  │    "message": "OTP sent successfully"                   │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 VERIFY OTP API                          │   │
│  │                                                         │   │
│  │  POST /api/otp/verify                                    │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Request Body:                                          │   │
│  │  {                                                       │   │
│  │    "phone": "+1234567890",                             │   │
│  │    "otp": "123456",                                     │   │
│  │    "purpose": "PAYMENT_VERIFICATION"                   │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "verified": true,                                    │   │
│  │    "message": "OTP verified successfully"               │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Analytics APIs
```
┌─────────────────────────────────────────────────────────────────┐
│                     ANALYTICS APIS                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 GET OVERVIEW API                        │   │
│  │                                                         │   │
│  │  GET /api/analytics/overview                             │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Query Parameters:                                      │   │
│  │  • tenantId: Filter by tenant ID (optional)             │   │
│  │  • startDate: Start date for analytics period          │   │
│  │  • endDate: End date for analytics period              │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "overview": {                                        │   │
│  │      "totalUsers": 150,                                 │   │
│  │      "activeUsers": 120,                                │   │
│  │      "totalPayments": 2500,                            │   │
│  │      "totalAmount": 3750000.00,                        │   │
│  │      "outstandingAmount": 1250000.00,                  │   │
│  │      "collectionRate": 85.5,                           │   │
│  │      "averagePaymentAmount": 1500.00,                  │   │
│  │      "topPerformers": [                                 │   │
│  │        {                                                 │   │
│  │          "id": "worker123",                             │   │
│  │          "name": "John Doe",                            │   │
│  │          "collections": 450,                            │   │
│  │          "amount": 675000.00                           │   │
│  │        }                                                 │   │
│  │      ],                                                  │   │
│  │      "recentActivity": [                                │   │
│  │        {                                                 │   │
│  │          "type": "PAYMENT_COMPLETED",                   │   │
│  │          "message": "Payment of $1500.00 completed",     │   │
│  │          "timestamp": "2023-01-01T00:00:00Z"            │   │
│  │        }                                                 │   │
│  │      ]                                                   │   │
│  │    }                                                     │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 GET PAYMENT ANALYTICS API              │   │
│  │                                                         │   │
│  │  GET /api/analytics/payments                            │   │
│  │                                                         │   │
│  │  Headers:                                               │   │
│  │  Authorization: Bearer <token>                           │   │
│  │                                                         │   │
│  │  Query Parameters:                                      │   │
│  │  • tenantId: Filter by tenant ID (optional)             │   │
│  │  • startDate: Start date for analytics period          │   │
│  │  • endDate: End date for analytics period              │   │
│  │  • groupBy: Grouping parameter (day, week, month)      │   │
│  │                                                         │   │
│  │  Response (Success - 200):                             │   │
│  │  {                                                       │   │
│  │    "success": true,                                     │   │
│  │    "payments": {                                        │   │
│  │      "totalPayments": 2500,                            │   │
│  │      "totalAmount": 3750000.00,                        │   │
│  │      "averagePaymentAmount": 1500.00,                  │   │
│  │      "collectionRate": 85.5,                           │   │
│  │      "paymentMethods": {                               │   │
│  │        "CASH": {                                       │   │
│  │          "count": 2000,                               │   │
│  │          "amount": 3000000.00                          │   │
│  │        },                                               │   │
│  │        "UPI": {                                        │   │
│  │          "count": 500,                                │   │
│  │          "amount": 750000.00                           │   │
│  │        }                                                │   │
│  │      },                                                  │   │
│  │      "timeSeries": [                                   │   │
│  │        {                                                 │   │
│  │          "date": "2023-01-01",                         │   │
│  │          "count": 100,                                 │   │
│  │          "amount": 150000.00                           │   │
│  │        }                                                 │   │
│  │      ],                                                  │   │
│  │      "topRetailers": [                                  │   │
│  │        {                                                 │   │
│  │          "id": "retailer123",                           │   │
│  │          "name": "ABC Pharmacy",                        │   │
│  │          "payments": 50,                               │   │
│  │          "amount": 75000.00                            │   │
│  │        }                                                 │   │
│  │      ]                                                   │   │
│  │    }                                                     │   │
│  │  }                                                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Documentation

### Authentication & Authorization
```
┌─────────────────────────────────────────────────────────────────┐
│               AUTHENTICATION & AUTHORIZATION                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 AUTHENTICATION METHODS                  │   │
│  │                                                         │   │
│  │  1. Firebase Authentication:                             │   │
│  │     • Email/Password authentication                     │   │
│  │     • Phone number authentication                        │   │
│  │     • Google OAuth integration                           │   │
│  │     • Custom token authentication                        │   │
│  │     • Multi-factor authentication support              │   │
│  │                                                         │   │
│  │  2. JWT Token Management:                               │   │
│  │     • Access tokens with 1-hour expiration              │   │
│  │     • Refresh tokens with 7-day expiration             │   │
│  │     • Secure token storage (HttpOnly cookies)          │   │
│  │     • Token revocation on logout                        │   │
│  │     • Automatic token refresh                           │   │
│  │                                                         │   │
│  │  3. Session Management:                                 │   │
│  │     • Secure session creation                           │   │
│  │     • Session timeout handling                          │   │
│  │     • Concurrent session control                        │   │
│  │     • Session invalidation on password change          │   │
│  │     • Session activity logging                         │   │
│  │                                                         │   │
│  │  4. Password Security:                                 │   │
│  │     • Minimum 8 characters length                      │   │
│  │     • Required uppercase, lowercase, numbers, symbols  │   │
│  │     • Password history tracking (last 5 passwords)     │   │
│  │     • Password expiration (90 days)                    │   │
│  │     • Account lockout after 5 failed attempts         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 AUTHORIZATION SYSTEM                    │   │
│  │                                                         │   │
│  │  1. Role-Based Access Control (RBAC):                   │   │
│  │     • SUPER_ADMIN: System-wide access                   │   │
│  │     • WHOLESALER_ADMIN: Tenant-level access            │   │
│  │     • LINE_WORKER: Area-based access                   │   │
│  │     • RETAILER: Store-based access                     │   │
│  │                                                         │   │
│  │  2. Permission Granularity:                             │   │
│  │     • Resource-level permissions                        │   │
│  │     • Action-level permissions                         │   │
│  │     • Attribute-based permissions                      │   │
│  │     • Context-aware permissions                        │   │
│  │                                                         │   │
│  │  3. Permission Enforcement:                             │   │
│  │     • Server-side permission checks                    │   │
│  │     • Client-side permission caching                   │   │
│  │     • Permission inheritance                            │   │
│  │     • Permission audit logging                         │   │
│  │                                                         │   │
│  │  4. Multi-Tenant Security:                             │   │
│  │     • Strict data isolation between tenants           │   │
│  │     • Tenant-specific permission sets                   │   │
│  │     • Cross-tenant access prevention                  │   │
│  │     • Tenant-level audit trails                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Protection
```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PROTECTION                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 DATA ENCRYPTION                          │   │
│  │                                                         │   │
│  │  1. Encryption at Rest:                                  │   │
│  │     • Firebase Firestore encryption                      │   │
│  │     • AES-256 encryption for sensitive data             │   │
│  │     • Database-level encryption                         │   │
│  │     • File storage encryption                           │   │
│  │     • Backup encryption                                 │   │
│  │                                                         │   │
│  │  2. Encryption in Transit:                              │   │
│  │     • TLS 1.3 for all communications                   │   │
│  │     • HTTPS-only connections                           │   │
│  │     • Certificate pinning                              │   │
│  │     • Secure WebSocket connections                      │   │
│  │     • API call encryption                               │   │
│  │                                                         │   │
│  │  3. Key Management:                                    │   │
│  │     • Secure key generation                            │   │
│  │     • Key rotation policies                             │   │
│  │     • Key storage in secure vaults                      │   │
│  │     • Key access logging                               │   │
│  │     • Key revocation procedures                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 DATA MASKING                             │   │
│  │                                                         │   │
│  │  1. Sensitive Data Identification:                       │   │
│  │     • Personal Identifiable Information (PII)          │   │
│  │     • Payment card information                          │   │
│  │     • Financial account numbers                        │   │
│  │     • Contact information                              │   │
│  │     • Identification numbers                           │   │
│  │                                                         │   │
│  │  2. Masking Techniques:                                 │   │
│  │     • Partial masking (e.g., ****-****-1234)            │   │
│  │     • Complete masking for sensitive fields             │   │
│  │     • Dynamic masking based on user roles               │   │
│  │     • Context-aware masking                           │   │
│  │     • Format-preserving masking                        │   │
│  │                                                         │   │
│  │  3. Data Access Control:                               │   │
│  │     • Role-based data visibility                       │   │
│  │     • Field-level encryption                            │   │
│  │     • Data access logging                              │   │
│  │     • Data anonymization for reporting                 │   │
│  │     • Data retention policies                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Network Security
```
┌─────────────────────────────────────────────────────────────────┐
│                     NETWORK SECURITY                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 NETWORK PROTECTION                       │   │
│  │                                                         │   │
│  │  1. Firewall Configuration:                             │   │
│  │     • Application-level firewall                        │   │
│  │     • Network-level firewall                            │   │
│  │     • Web Application Firewall (WAF)                   │   │
│  │     • Database firewall                                 │   │
│  │     • Intrusion Detection/Prevention Systems           │   │
│  │                                                         │   │
│  │  2. DDoS Protection:                                    │   │
│  │     • Rate limiting per IP address                     │   │
│  │     • Request throttling                               │   │
│  │     • Traffic pattern analysis                         │   │
│  │     • Automated attack mitigation                       │   │
│  │     • Content Delivery Network (CDN) protection        │   │
│  │                                                         │   │
│  │  3. Secure Communication:                              │   │
│  │     • TLS 1.3 encryption                               │   │
│  │     • Certificate management                           │   │
│  │     • Secure WebSocket connections                      │   │
│  │     • API gateway security                              │   │
│  │     • VPN for administrative access                    │   │
│  │                                                         │   │
│  │  4. Network Monitoring:                                │   │
│  │     • Real-time traffic monitoring                     │   │
│  │     • Anomaly detection                                │   │
│  │     • Security event logging                          │   │
│  │     • Network performance monitoring                   │   │
│  │     • Automated alerting                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 API SECURITY                             │   │
│  │                                                         │   │
│  │  1. Authentication & Authorization:                      │   │
│  │     • JWT token validation                             │   │
│  │     • API key management                              │   │
│  │     • OAuth 2.0 implementation                        │   │
│  │     • Role-based API access                           │   │
│  │     • Token expiration handling                        │   │
│  │                                                         │   │
│  │  2. Input Validation:                                  │   │
│  │     • Parameter validation                            │   │
│  │     • Data type validation                            │   │
│  │     • Length restrictions                              │   │
│  │     • Format validation                               │   │
│  │     • Sanitization of user inputs                     │   │
│  │                                                         │   │
│  │  3. Rate Limiting:                                    │   │
│  │     • Per-endpoint rate limits                        │   │
│  │     • Per-user rate limits                            │   │
│  │     • Per-IP rate limits                             │   │
│  │     • Burst protection                                │   │
│  │     • Dynamic rate adjustment                         │   │
│  │                                                         │   │
│  │  4. API Security Headers:                              │   │
│  │     • Content Security Policy (CSP)                    │   │
│  │     • X-Content-Type-Options                          │   │
│  │     • X-Frame-Options                                 │   │
│  │     • X-XSS-Protection                                │   │
│  │     • Strict-Transport-Security                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Audit & Compliance
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT & COMPLIANCE                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 AUDIT LOGGING                            │   │
│  │                                                         │   │
│  │  1. Comprehensive Logging:                              │   │
│  │     • User authentication events                       │   │
│  │     • Data access and modification events               │   │
│  │     • Payment processing events                         │   │
│  │     • System configuration changes                     │   │
│  │     • Security-related events                         │   │
│  │     • API call logging                                 │   │
│  │                                                         │   │
│  │  2. Log Data Structure:                                │   │
│  │     • Timestamp with timezone                          │   │
│  │     • User ID and role information                    │   │
│  │     • Action performed                                │   │
│  │     • Resource affected                               │   │
│  │     • Before and after values                         │   │
│  │     • IP address and user agent                       │   │
│  │     • Result status (success/failure)                 │   │
│  │                                                         │   │
│  │  3. Log Management:                                    │   │
│  │     • Centralized log collection                       │   │
│  │     • Log rotation and retention                       │   │
│  │     • Log backup and recovery                         │   │
│  │     • Log analysis and reporting                       │   │
│  │     • Real-time log monitoring                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 COMPLIANCE FRAMEWORK                     │   │
│  │                                                         │   │
│  │  1. Data Protection Compliance:                         │   │
│  │     • GDPR compliance for EU data                      │   │
│  │     • CCPA compliance for California residents        │   │
│  │     • HIPAA considerations for health data             │   │
│  │     • PCI DSS compliance for payment data             │   │
│  │     • Local data protection regulations              │   │
│  │                                                         │   │
│  │  2. Security Standards:                                │   │
│  │     • ISO 27001 compliance                             │   │
│  │     • SOC 2 Type II compliance                        │   │
│  │     • NIST Cybersecurity Framework                   │   │
│  │     • OWASP Top 10 mitigation                         │   │
│  │     • Industry-specific security standards           │   │
│  │                                                         │   │
│  │  3. Compliance Monitoring:                             │   │
│  │     • Regular security assessments                    │   │
│  │     • Vulnerability scanning and management          │   │
│  │     • Penetration testing                             │   │
│  │     • Compliance reporting                            │   │
│  │     • Regulatory change monitoring                    │   │
│  │                                                         │   │
│  │  4. Data Governance:                                  │   │
│  │     • Data classification policies                    │   │
│  │     • Data retention policies                         │   │
│  │     • Data disposal procedures                        │   │
│  │     • Data breach notification procedures             │   │
│  │     • Privacy impact assessments                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Procedures

### Unit Testing
```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIT TESTING                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 TESTING FRAMEWORK                       │   │
│  │                                                         │   │
│  │  1. Testing Tools:                                       │   │
│  │     • Jest: JavaScript testing framework               │   │
│  │     • React Testing Library: React component testing    │   │
│  │     • Cypress: End-to-end testing                       │   │
│  │     • Supertest: HTTP assertion library                │   │
│  │     • Mock Service Worker: API mocking                 │   │
│  │                                                         │   │
│  │  2. Test Structure:                                     │   │
│  │     • Unit tests for individual functions              │   │
│  │     • Integration tests for component interactions     │   │
│  │     • Component tests for UI components               │   │
│  │     • API tests for server endpoints                  │   │
│  │     • Utility tests for helper functions              │   │
│  │                                                         │   │
│  │  3. Test Coverage:                                      │   │
│  │     • Target: 80% code coverage minimum                │   │
│  │     • Critical paths: 95% coverage required            │   │
│  │     • Business logic: 90% coverage required            │   │
│  │     • API endpoints: 100% coverage required           │   │
│  │     • Security functions: 100% coverage required       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 TESTING STRATEGIES                       │   │
│  │                                                         │   │
│  │  1. Component Testing:                                  │   │
│  │     • Test component rendering                          │   │
│  │     • Test user interactions                           │   │
│  │     • Test state management                            │   │
│  │     • Test props and callbacks                         │   │
│  │     • Test error handling                              │   │
│  │                                                         │   │
│  │  2. API Testing:                                       │   │
│  │     • Test endpoint functionality                       │   │
│  │     • Test request validation                          │   │
│  │     • Test response formats                            │   │
│  │     • Test error handling                              │   │
│  │     • Test authentication and authorization           │   │
│  │                                                         │   │
│  │  3. Utility Testing:                                   │   │
│  │     • Test helper functions                           │   │
│  │     • Test validation functions                        │   │
│  │     • Test data transformation functions              │   │
│  │     • Test calculation functions                      │   │
│  │     • Test formatting functions                       │   │
│  │                                                         │   │
│  │  4. Hook Testing:                                      │   │
│  │     • Test custom hooks                                │   │
│  │     • Test state management hooks                     │   │
│  │     • Test API call hooks                             │   │
│  │     • Test side effect hooks                          │   │
│  │     • Test context hooks                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Testing
```
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION TESTING                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 TESTING SCENARIOS                       │   │
│  │                                                         │   │
│  │  1. User Authentication Flow:                           │   │
│  │     • Test user registration                           │   │
│  │     • Test email verification                          │   │
│  │     • Test login with valid credentials                │   │
│  │     • Test login with invalid credentials              │   │
│  │     • Test password reset flow                         │   │
│  │     • Test session management                         │   │
│  │                                                         │   │
│  │  2. Payment Processing Flow:                           │   │
│  │     • Test payment initiation                          │   │
│  │     • Test OTP generation and delivery                 │   │
│  │     • Test OTP verification                            │   │
│  │     • Test payment completion                          │   │
│  │     • Test payment failure scenarios                  │   │
│  │     • Test payment status updates                     │   │
│  │                                                         │   │
│  │  3. Invoice Management Flow:                          │   │
│  │     • Test invoice creation                            │   │
│  │     • Test invoice updates                             │   │
│  │     • Test invoice status changes                      │   │
│  │     • Test invoice payment application                 │   │
│  │     • Test invoice deletion                            │   │
│  │     • Test invoice reporting                           │   │
│  │                                                         │   │
│  │  4. User Management Flow:                              │   │
│  │     • Test user creation                               │   │
│  │     • Test user role assignment                       │   │
│  │     • Test user permission updates                    │   │
│  │     • Test user deactivation                           │   │
│  │     • Test user data updates                          │   │
│  │     • Test user deletion                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 REAL-TIME FEATURES TESTING             │   │
│  │                                                         │   │
│  │  1. Socket.IO Testing:                                  │   │
│  │     • Test WebSocket connection establishment          │   │
│  │     • Test real-time event broadcasting                │   │
│  │     • Test room-based messaging                       │   │
│  │     • Test connection reconnection                    │   │
│  │     • Test event ordering and delivery                 │   │
│  │     • Test connection error handling                   │   │
│  │                                                         │   │
│  │  2. Notification Testing:                               │   │
│  │     • Test payment notifications                       │   │
│  │     • Test user activity notifications                │   │
│  │     • Test system alert notifications                  │   │
│  │     • Test notification delivery reliability           │   │
│  │     • Test notification preferences                    │   │
│  │     • Test notification failure handling               │   │
│  │                                                         │   │
│  │  3. Data Synchronization Testing:                      │   │
│  │     • Test real-time data updates                     │   │
│  │     • Test cross-client data consistency              │   │
│  │     • Test offline data synchronization               │   │
│  │     • Test conflict resolution                         │   │
│  │     • Test data persistence                           │   │
│  │     • Test data recovery scenarios                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### End-to-End Testing
```
┌─────────────────────────────────────────────────────────────────┐
│                   END-TO-END TESTING                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 TESTING SCENARIOS                       │   │
│  │                                                         │   │
│  │  1. Complete User Journey:                              │   │
│  │     • Test user registration to dashboard access       │   │
│  │     • Test retailer onboarding process                │   │
│  │     • Test invoice creation to payment collection     │   │
│  │     • Test payment verification flow                   │   │
│  │     • Test reporting and analytics access              │   │
│  │     • Test user logout and session termination        │   │
│  │                                                         │   │
│  │  2. Role-Based Workflows:                              │   │
│  │     • Super Admin: System setup and wholesaler creation│   │
│  │     • Wholesaler Admin: Tenant management              │   │
│  │     • Line Worker: Field payment collection           │   │
│  │     • Retailer: Payment verification and history       │   │
│  │     • Cross-role interactions and permissions         │   │
│  │                                                         │   │
│  │  3. Business Process Testing:                          │   │
│  │     • Test complete payment lifecycle                  │   │
│  │     • Test invoice management workflow                │   │
│  │     • Test user management workflow                   │   │
│  │     • Test area assignment workflow                   │   │
│  │     • Test reporting and analytics workflow           │   │
│  │                                                         │   │
│  │  4. Error Scenario Testing:                           │   │
│  │     • Test network failure scenarios                  │   │
│  │     • Test database connection failures              │   │
│  │     • Test authentication failures                    │   │
│  │     • Test payment processing errors                  │   │
│  │     • Test concurrent user scenarios                   │   │
│  │     • Test data validation errors                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 PERFORMANCE TESTING                     │   │
│  │                                                         │   │
│  │  1. Load Testing:                                       │   │
│  │     • Test with 100 concurrent users                   │   │
│  │     • Test with 500 concurrent users                   │   │
│  │     • Test with 1000 concurrent users                  │   │
│  │     • Test payment processing under load               │   │
│  │     • Test real-time features under load              │   │
│  │     • Test database performance under load            │   │
│  │                                                         │   │
│  │  2. Stress Testing:                                    │   │
│  │     • Test beyond expected load limits                │   │
│  │     • Test system recovery after failure              │   │
│  │     • Test memory usage under stress                  │   │
│  │     • Test database connection limits                 │   │
│  │     • Test API rate limiting effectiveness            │   │
│  │                                                         │   │
│  │  3. Performance Metrics:                               │   │
│  │     • Response time: < 2 seconds for 95% of requests  │   │
│  │     • Throughput: 1000 requests per second            │   │
│  │     • Error rate: < 1% under normal load             │   │
│  │     • Memory usage: < 80% of available memory        │   │
│  │     • CPU usage: < 70% under normal load             │   │
│  │     • Database connections: < 80% of pool size      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Security Testing
```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY TESTING                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 VULNERABILITY ASSESSMENT                │   │
│  │                                                         │   │
│  │  1. OWASP Top 10 Testing:                              │   │
│  │     • A01: Broken Access Control                        │   │
│  │     • A02: Cryptographic Failures                       │   │
│  │     • A03: Injection                                   │   │
│  │     • A04: Insecure Design                             │   │
│  │     • A05: Security Misconfiguration                   │   │
│  │     • A06: Vulnerable and Outdated Components          │   │
│  │     • A07: Identification and Authentication Failures  │   │
│  │     • A08: Software and Data Integrity Failures        │   │
│  │     • A09: Security Logging and Monitoring Failures    │   │
│  │     • A10: Server-Side Request Forgery                │   │
│  │                                                         │   │
│  │  2. Authentication Testing:                            │   │
│  │     • Test session hijacking prevention               │   │
│  │     • Test brute force attack protection               │   │
│  │     • Test session timeout handling                    │   │
│  │     • Test concurrent session control                 │   │
│  │     • Test password strength requirements              │   │
│  │     • Test multi-factor authentication               │   │
│  │                                                         │   │
│  │  3. Authorization Testing:                            │   │
│  │     • Test privilege escalation prevention            │   │
│  │     • Test horizontal access control                  │   │
│  │     • Test vertical access control                    │   │
│  │     • Test role-based permissions                     │   │
│  │     • Test resource-based permissions                │   │
│  │     • Test API endpoint protection                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 PENETRATION TESTING                     │   │
│  │                                                         │   │
│  │  1. Network Security Testing:                          │   │
│  │     • Test firewall configuration                      │   │
│  │     • Test network segmentation                        │   │
│  │     • Test intrusion detection/prevention             │   │
│  │     • Test DDoS protection effectiveness               │   │
│  │     • Test network monitoring capabilities             │   │
│  │     • Test secure communication protocols              │   │
│  │                                                         │   │
│  │  2. Application Security Testing:                      │   │
│  │     • Test input validation bypasses                   │   │
│  │     • Test output encoding bypasses                    │   │
│  │     • Test session management vulnerabilities          │   │
│  │     • Test business logic flaws                       │   │
│  │     • Test API security vulnerabilities               │   │
│  │     • Test client-side security issues                │   │
│  │                                                         │   │
│  │  3. Data Security Testing:                            │   │
│  │     • Test data encryption effectiveness               │   │
│  │     • Test data access controls                        │   │
│  │     • Test data leakage prevention                    │   │
│  │     • Test data integrity validation                  │   │
│  │     • Test secure data disposal                       │   │
│  │     • Test backup security                            │   │
│  │                                                         │   │
│  │  4. Social Engineering Testing:                        │   │
│  │     • Test phishing resistance                         │   │
│  │     • Test social engineering awareness               │   │
│  │     • Test user education effectiveness               │   │
│  │     • Test security awareness training                │   │
│  │     • Test incident response procedures               │   │
│  │     • Test security policy compliance                │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Maintenance Guide

### System Monitoring
```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM MONITORING                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 MONITORING COMPONENTS                   │   │
│  │                                                         │   │
│  │  1. Application Monitoring:                             │   │
│  │     • Response time monitoring                          │   │
│  │     • Error rate tracking                              │   │
│  │     • User activity monitoring                         │   │
│  │     • Feature usage analytics                          │   │
│  │     • Performance metrics collection                   │   │
│  │     • Custom business metrics tracking               │   │
│  │                                                         │   │
│  │  2. Infrastructure Monitoring:                         │   │
│  │     • Server health monitoring                        │   │
│  │     • CPU and memory usage tracking                   │   │
│  │     • Disk space monitoring                           │   │
│  │     • Network traffic monitoring                      │   │
│  │     • Database performance monitoring                 │   │
│  │     • Service availability monitoring                  │   │
│  │                                                         │   │
│  │  3. Security Monitoring:                               │   │
│  │     • Authentication event monitoring                  │   │
│  │     • Authorization failure tracking                  │   │
│  │     • Suspicious activity detection                   │   │
│  │     • Security incident monitoring                    │   │
│  │     • Compliance violation tracking                  │   │
│  │     • Audit log monitoring                            │   │
│  │                                                         │   │
│  │  4. Business Monitoring:                               │   │
│  │     • Payment transaction monitoring                   │   │
│  │     • User engagement metrics                         │   │
│  │     • Revenue tracking                                │   │
│  │     • Customer satisfaction metrics                   │   │
│  │     • Business process monitoring                    │   │
│  │     • KPI tracking and reporting                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 ALERTING SYSTEM                         │   │
│  │                                                         │   │
│  │  1. Alert Types:                                        │   │
│  │     • Critical Alerts: System down, security breaches  │   │
│  │     • Warning Alerts: Performance degradation, high error rates│   │
│  │     • Informational Alerts: Scheduled maintenance, updates│   │
│  │     • Business Alerts: Unusual activity, threshold breaches│   │
│  │     • Compliance Alerts: Policy violations, audit findings│   │
│  │                                                         │   │
│  │  2. Alert Channels:                                    │   │
│  │     • Email notifications                              │   │
│  │     • SMS alerts for critical issues                   │   │
│  │     • Slack/Teams integration                         │   │
│  │     • PagerDuty integration for critical alerts        │   │
│  │     • Custom webhook integrations                     │   │
│  │     • In-app notifications                            │   │
│  │                                                         │   │
│  │  3. Alert Management:                                  │   │
│  │     • Alert escalation procedures                      │   │
│  │     • Alert suppression rules                         │   │
│  │     • Alert acknowledgment and resolution tracking     │   │
│  │     • Alert performance metrics                        │   │
│  │     • Alert tuning and optimization                   │   │
│  │     • Alert documentation and runbooks               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Backup & Recovery
```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP & RECOVERY                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 BACKUP STRATEGY                          │   │
│  │                                                         │   │
│  │  1. Data Backup:                                        │   │
│  │     • Firebase Firestore automated backups               │   │
│  │     • Database backups (SQLite)                         │   │
│  │     • File system backups                               │   │
│  │     • Configuration backups                            │   │
│  │     • Application code backups                         │   │
│  │     • Log file backups                                 │   │
│  │                                                         │   │
│  │  2. Backup Schedule:                                    │   │
│  │     • Daily incremental backups                         │   │
│  │     • Weekly full backups                               │   │
│  │     • Monthly archival backups                          │   │
│  │     • Real-time replication for critical data          │   │
│  │     • Pre-maintenance backups                          │   │
│  │     • On-demand backup capabilities                    │   │
│  │                                                         │   │
│  │  3. Backup Storage:                                     │   │
│  │     • Local storage for quick recovery                 │   │
│  │     • Cloud storage for disaster recovery             │   │
│  │     • Off-site storage for additional protection       │   │
│  │     • Encrypted storage for sensitive data             │   │
│  │     • Versioned backups for point-in-time recovery     │   │
│  │     • Compressed storage for space efficiency         │   │
│  │                                                         │   │
│  │  4. Backup Verification:                               │   │
│  │     • Automated backup integrity checks                │   │
│  │     • Regular backup restoration testing               │   │
│  │     • Backup success/failure monitoring               │   │
│  │     • Backup size and growth tracking                 │   │
│  │     • Backup performance monitoring                    │   │
│  │     • Backup compliance validation                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 RECOVERY PROCEDURES                     │   │
│  │                                                         │   │
│  │  1. Disaster Recovery:                                  │   │
│  │     • System failure recovery procedures               │   │
│  │     • Data corruption recovery procedures               │   │
│  │     • Security incident recovery procedures            │   │
│  │     • Natural disaster recovery procedures             │   │
│  │     • Human error recovery procedures                  │   │
│  │     • Ransomware attack recovery procedures           │   │
│  │                                                         │   │
│  │  2. Recovery Time Objectives (RTO):                    │   │
│  │     • Critical systems: 1 hour recovery time           │   │
│  │     • Important systems: 4 hours recovery time        │   │
│  │     • Non-critical systems: 24 hours recovery time     │   │
│  │     • Data recovery: 2 hours for critical data        │   │
│  │     • Full system recovery: 8 hours                    │   │
│  │     • Regional disaster: 24 hours                    │   │
│  │                                                         │   │
│  │  3. Recovery Point Objectives (RPO):                   │   │
│  │     • Critical data: 15 minutes data loss tolerance   │   │
│  │     • Important data: 1 hour data loss tolerance      │   │
│  │     • Non-critical data: 24 hours data loss tolerance  │   │
│  │     • Configuration data: 1 hour tolerance           │   │
│  │     • User data: 4 hours tolerance                    │   │
│  │     • System logs: 24 hours tolerance                 │   │
│  │                                                         │   │
│  │  4. Recovery Testing:                                  │   │
│  │     • Quarterly disaster recovery testing            │   │
│  │     • Annual full-scale recovery testing              │   │
│  │     • Regular backup restoration testing              │   │
│  │     • Failover testing for high availability          │   │
│  │     • Recovery procedure validation                   │   │
│  │     • Recovery team training and drills               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Optimization
```
┌─────────────────────────────────────────────────────────────────┐
│                 PERFORMANCE OPTIMIZATION                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 APPLICATION OPTIMIZATION                │   │
│  │                                                         │   │
│  │  1. Frontend Optimization:                              │   │
│  │     • Code splitting and lazy loading                  │   │
│  │     • Image optimization and compression                │   │
│  │     • CSS and JavaScript minification                 │   │
│  │     • Browser caching strategies                      │   │
│  │     • CDN implementation for static assets            │   │
│  │     • Progressive Web App (PWA) optimization          │   │
│  │                                                         │   │
│  │  2. Backend Optimization:                              │   │
│  │     • API response optimization                       │   │
│  │     • Database query optimization                    │   │
│  │     • Caching strategies implementation                │   │
│  │     • Server-side rendering optimization             │   │
│  │     • Memory usage optimization                      │   │
│  │     • CPU usage optimization                         │   │
│  │                                                         │   │
│  │  3. Database Optimization:                            │   │
│  │     • Query optimization and indexing                  │   │
│  │     • Database connection pooling                    │   │
│  │     • Data archiving and purging                     │   │
│  │     • Database partitioning strategies               │   │
│  │     • Read/write separation                          │   │
│  │     • Database performance monitoring                 │   │
│  │                                                         │   │
│  │  4. Network Optimization:                             │   │
│  │     • Bandwidth optimization                          │   │
│  │     • Latency reduction strategies                    │   │
│  │     • Network protocol optimization                  │   │
│  │     • Load balancing implementation                   │   │
│  │     • Content delivery optimization                  │   │
│  │     • WebSocket optimization                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SCALING STRATEGIES                      │   │
│  │                                                         │   │
│  │  1. Horizontal Scaling:                                 │   │
│  │     • Load balancer configuration                     │   │
│  │     • Application server clustering                   │   │
│  │     • Database replication and sharding               │   │
│  │     • Caching layer scaling                           │   │
│  │     • File system scaling strategies                  │   │
│  │     • Microservices architecture preparation          │   │
│  │                                                         │   │
│  │  2. Vertical Scaling:                                  │   │
│  │     • Server hardware upgrades                        │   │
│  │     • Memory allocation optimization                 │   │
│  │     • CPU performance optimization                    │   │
│  │     • Storage performance optimization               │   │
│  │     • Network interface optimization                 │   │
│  │     • Virtual machine configuration optimization      │   │
│  │                                                         │   │
│  │  3. Auto-scaling:                                     │   │
│  │     • CPU-based auto-scaling                         │   │
│  │     • Memory-based auto-scaling                       │   │
│  │     • Request-based auto-scaling                     │   │
│  │     • Scheduled scaling for predictable loads        │   │
│  │     • Cost optimization strategies                    │   │
│  │     • Scaling policy configuration                   │   │
│  │                                                         │   │
│  │  4. Geographic Scaling:                                │   │
│  │     • Multi-region deployment                        │   │
│  │     • Global load balancing                          │   │
│  │     • Data localization strategies                    │   │
│  │     • Regional failover strategies                   │   │
│  │     • Content delivery network optimization          │   │
│  │     • Cross-region data synchronization              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Updates & Patching
```
┌─────────────────────────────────────────────────────────────────┐
│                    UPDATES & PATCHING                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 UPDATE MANAGEMENT                       │   │
│  │                                                         │   │
│  │  1. Software Inventory:                                │   │
│  │     • Application components tracking                 │   │
│  │     • Third-party library inventory                   │   │
│  │     • Operating system components                     │   │
│  │     • Database software versions                      │   │
│  │     • Security tools and utilities                    │   │
│  │     • Firmware and driver versions                   │   │
│  │                                                         │   │
│  │  2. Vulnerability Monitoring:                          │   │
│  │     • Security bulletin subscriptions                 │   │
│  │     • CVE monitoring services                         │   │
│  │     • Vendor security advisories                      │   │
│  │     • Security feed aggregation                      │   │
│  │     • Automated vulnerability scanning               │   │
│  │     • Risk assessment and prioritization              │   │
│  │                                                         │   │
│  │  3. Update Classification:                             │   │
│  │     • Critical Security Updates: Immediate deployment │   │
│  │     • Important Security Updates: 7-day deployment    │   │
│  │     • Routine Security Updates: 30-day deployment    │   │
│  │     • Bug Fixes: 14-day deployment                    │   │
│  │     • Feature Updates: 30-day deployment              │   │
│  │     • Performance Updates: 14-day deployment          │   │
│  │                                                         │   │
│  │  4. Update Testing:                                    │   │
│  │     • Development environment testing                │   │
│  │     • Staging environment testing                     │   │
│  │     • User Acceptance Testing (UAT)                  │   │
│  │     • Performance impact testing                     │   │
│  │     • Security impact testing                        │   │
│  │     • Compatibility testing                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 DEPLOYMENT PROCEDURES                  │   │
│  │                                                         │   │
│  │  1. Deployment Planning:                               │   │
│  │     • Maintenance window scheduling                   │   │
│  │     • Stakeholder notification                       │   │
│  │     • Rollback planning and preparation               │   │
│  │     • Deployment checklist creation                  │   │
│  │     • Resource allocation and coordination            │   │
│  │     • Risk assessment and mitigation                  │   │
│  │                                                         │   │
│  │  2. Deployment Execution:                             │   │
│  │     • Pre-deployment backups                         │   │
│  │     • System health verification                     │   │
│  │     • Update deployment in controlled manner          │   │
│  │     • Real-time monitoring during deployment         │   │
│  │     • Post-deployment verification                   │   │
│  │     • Performance validation                         │   │
│  │                                                         │   │
│  │  3. Rollback Procedures:                               │   │
│  │     • Rollback triggers and criteria                 │   │
│  │     • Automated rollback capabilities                │   │
│  │     • Manual rollback procedures                     │   │
│  │     • Data consistency verification                  │   │
│  │     • System state restoration                       │   │
│  │     • Post-rollback testing and validation           │   │
│  │                                                         │   │
│  │  4. Post-Deployment Activities:                        │   │
│  │     • System monitoring intensification              │   │
│  │     • User communication and feedback collection     │   │
│  │     • Performance metrics analysis                   │   │
│  │     • Incident response readiness                    │   │
│  │     • Documentation updates                         │   │
│  │     • Lessons learned and improvement               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend Technologies
```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND TECHNOLOGIES                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 CORE FRAMEWORK                          │   │
│  │                                                         │   │
│  │  Next.js 15:                                             │   │
│  │  • React framework with server-side rendering           │   │
│  │  • App Router for modern routing                       │   │
│  │  • Static Site Generation (SSG) support                │   │
│  │  • API Routes for serverless functions                │   │
│  │  • Middleware for request processing                  │   │
│  │  • Image optimization built-in                         │   │
│  │  • TypeScript support out of the box                  │   │
│  │                                                         │   │
│  │  TypeScript 5:                                          │   │
│  │  • Static type checking                               │   │
│  │  • Enhanced developer experience                     │   │
│  │  • Better code maintainability                        │   │
│  │  • Improved error handling                           │   │
│  │  • Modern JavaScript features                        │   │
│  │  • Interface and type definitions                    │   │
│  │                                                         │   │
│  │  React 19:                                              │   │
│  │  • Component-based architecture                       │   │
│  │  • Virtual DOM for performance                       │   │
│  │  • Hooks for state and lifecycle management           │   │
│  │  • Concurrent features for better UX                 │   │
│  │  • Suspense for data fetching                        │   │
│  │  • Strict mode for development                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 STYLING & UI                           │   │
│  │                                                         │   │
│  │  Tailwind CSS 4:                                         │   │
│  │  • Utility-first CSS framework                        │   │
│  │  • Rapid UI development                              │   │
│  │  • Responsive design out of the box                   │   │
│  │  • Custom design system support                      │   │
│  │  • Optimized for production                          │   │
│  │  • Dark mode support                                 │   │
│  │                                                         │   │
│  │  shadcn/ui:                                             │   │
│  │  • High-quality accessible components                │   │
│  │  • Built on Radix UI primitives                     │   │
│  │  • Customizable design tokens                        │   │
│  │  • Consistent design system                          │   │
│  │  • TypeScript support                                │   │
│  │  • Modern component library                         │   │
│  │                                                         │   │
│  │  Material-UI (MUI):                                    │   │
│  │  • Comprehensive component library                   │   │
│  │  • Material Design implementation                    │   │
│  │  • Advanced components (Date Pickers, etc.)          │   │
│  │  • Theme system support                             │   │
│  │  • Accessibility features                           │   │
│  │  • Customization capabilities                        │   │
│  │                                                         │   │
│  │  Framer Motion:                                         │   │
│  │  • Production-ready motion library                   │   │
│  │  • Smooth animations and transitions                 │   │
│  │  • Gesture support for mobile                        │   │
│  │  • Layout animations                                │   │
│  │  • Scroll animations                                │   │
│  │  • Spring physics for natural movement             │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 STATE MANAGEMENT                       │   │
│  │                                                         │   │
│  │  React Context:                                         │   │
│  │  • Built-in state management                         │   │
│  │  • Provider pattern implementation                   │   │
│  │  • Authentication context                            │   │
│  │  • Theme context                                    │   │
│  │  • Global state sharing                              │   │
│  │  • Avoids prop drilling                             │   │
│  │                                                         │   │
│  │  Local Storage:                                        │   │
│  │  • Client-side data persistence                      │   │
│  │  • Retailer session management                       │   │
│  │  • User preference storage                          │   │
│  │  • Offline data caching                             │   │
│  │  • Performance optimization                          │   │
│  │  • Cross-session data retention                      │   │
│  │                                                         │   │
│  │  Firebase Real-time Listeners:                        │   │
│  │  • Real-time data synchronization                    │   │
│  │  • Automatic UI updates                             │   │
│  │  • Offline support                                  │   │
│  │  • Event-driven architecture                         │   │
│  │  • Data consistency across clients                   │   │
│  │  • Efficient data fetching                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Technologies
```
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND TECHNOLOGIES                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SERVER FRAMEWORK                        │   │
│  │                                                         │   │
│  │  Next.js API Routes:                                     │   │
│  │  • Serverless function deployment                      │   │
│  │  • Automatic API route generation                     │   │
│  │  • Built-in middleware support                        │   │
│  │  • TypeScript integration                            │   │
│  │  • Edge function support                             │   │
│  │  • Static and dynamic route handling                  │   │
│  │                                                         │   │
│  │  Custom Server:                                        │   │
│  │  • Node.js HTTP server                                │   │
│  │  • Socket.IO integration                             │   │
│  │  • Custom middleware implementation                  │   │
│  │  • Request/response handling                          │   │
│  │  • Error handling and logging                        │   │
│  │  • Security middleware                              │   │
│  │                                                         │   │
│  │  TypeScript:                                          │   │
│  │  • Type-safe API development                        │   │
│  │  • Interface definitions                            │   │
│  │  • Request/response validation                       │   │
│  │  • Better error handling                           │   │
│  │  • Code maintainability                            │   │
│  │  • Developer tooling                               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 DATABASE LAYER                         │   │
│  │                                                         │   │
│  │  Firebase Firestore:                                    │   │
│  │  • NoSQL document database                          │   │
│  │  • Real-time data synchronization                    │   │
│  │  • Offline support                                  │   │
│  │  • Automatic scaling                                │   │
│  │  • Built-in security rules                          │   │
│  │  • Multi-region support                             │   │
│  │                                                         │   │
│  │  Prisma ORM:                                           │   │
│  │  • Modern database toolkit                          │   │
│  │  • Type-safe database access                        │   │
│  │  • Auto-generated query builder                     │   │
│  │  • Database migrations                              │   │
│  │  • Multiple database support                        │   │
│  │  • Data modeling and validation                     │   │
│  │                                                         │   │
│  │  SQLite:                                               │   │
│  │  • Lightweight relational database                    │   │
│  │  • Serverless deployment                            │   │
│  │  • Zero-configuration setup                         │   │
│  │  • ACID compliance                                  │   │
│  │  • Portable database files                          │   │
│  │  • Full-text search support                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 REAL-TIME FEATURES                     │   │
│  │                                                         │   │
│  │  Socket.IO:                                            │   │
│  │  • WebSocket library for real-time apps               │   │
│  │  • Event-driven architecture                         │   │
│  │  • Room-based messaging                             │   │
│  │  • Automatic reconnection                           │   │
│  │  • Cross-browser compatibility                       │   │
│  │  • Scalable real-time communication                 │   │
│  │                                                         │   │
│  │  Firebase Real-time Database:                          │   │
│  │  • Real-time data synchronization                    │   │
│  │  • Offline data persistence                         │   │
│  │  • Event listeners                                 │   │
│  │  • Data consistency across clients                   │   │
│  │  • Automatic conflict resolution                     │   │
│  │  • Efficient data synchronization                   │   │
│  │                                                         │   │
│  │  WebSockets:                                          │   │
│  │  • Full-duplex communication                        │   │
│  │  • Low latency real-time updates                    │   │
│  │  • Bidirectional data flow                          │   │
│  │  • Connection management                            │   │
│  │  • Message broadcasting                             │   │
│  │  • Scalable architecture                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Integration & Services
```
┌─────────────────────────────────────────────────────────────────┐
│                 INTEGRATION & SERVICES                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 AUTHENTICATION                         │   │
│  │                                                         │   │
│  │  Firebase Authentication:                                │   │
│  │  • Complete authentication solution                    │   │
│  │  • Email/password authentication                      │   │
│  │  • Phone number authentication                        │   │
│  │  • Social authentication (Google, Facebook)            │   │
│  │  • Multi-factor authentication                       │   │
│  │  • Custom authentication flows                       │   │
│  │  • User management and security                      │   │
│  │                                                         │   │
│  │  JWT (JSON Web Tokens):                                │   │
│  │  • Secure token-based authentication                 │   │
│  │  • Stateless authentication                          │   │
│  │  • Cross-platform compatibility                       │   │
│  │  • Token expiration and refresh                       │   │
│  │  • Custom claims and roles                           │   │
│  │  • Secure token storage                              │   │
│  │                                                         │   │
│  │  NextAuth.js:                                          │   │
│  │  • Complete authentication library                    │   │
│  │  • Session management                                │   │
│  │  • OAuth integration                                 │   │
│  │  • Database adapters                                │   │
│  │  • Type-safe implementation                          │   │
│  │  • Custom authentication providers                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 COMMUNICATION SERVICES                 │   │
│  │                                                         │   │
│  │  Twilio:                                               │   │
│  │  • SMS gateway for OTP delivery                      │   │
│  │  • Voice call capabilities                           │   │
│  │  • WhatsApp integration                              │   │
│  │  • Global SMS coverage                               │   │
│  │  • Message delivery tracking                         │   │
│  │  • Two-factor authentication                        │   │
│  │                                                         │   │
│  │  Email Services:                                       │   │
│  │  • Transactional email delivery                      │   │
│  │  • Notification emails                              │   │
│  │  • Email templates and customization               │   │
│  │  • Delivery tracking and analytics                  │   │
│  │  • SMTP integration                                 │   │
│  │  • Email automation                                 │   │
│  │                                                         │   │
│  │  Push Notifications:                                  │   │
│  │  • Web push notifications                           │   │
│  │  • Mobile push notifications                        │   │
│  │  • Real-time alerts                                 │   │
│  │  • User segmentation                               │   │
│  │  • Notification scheduling                          │   │
│  │  • Delivery analytics                               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 DEVELOPMENT TOOLS                      │   │
│  │                                                         │   │
│  │  ESLint:                                               │   │
│  │  • JavaScript/TypeScript linting                     │   │
│  │  • Code quality and consistency                     │   │
│  │  • Error detection and prevention                    │   │
│  │  • Custom rule configuration                        │   │
│  │  • Integration with IDEs                            │   │
│  │  • Automated code fixes                             │   │
│  │                                                         │   │
│  │  Prettier:                                             │   │
│  │  • Code formatting and styling                       │   │
│  │  • Consistent code style                            │   │
│  │  • Multi-language support                          │   │
│  │  • Editor integration                               │   │
│  │  • Automatic formatting on save                     │   │
│  │  • Custom configuration options                     │   │
│  │                                                         │   │
│  │  Git:                                                  │   │
│  │  • Version control system                           │   │
│  │  • Branch management                               │   │
│  │  • Collaboration features                           │   │
│  │  • Code review workflows                            │   │
│  │  • Continuous integration                            │   │
│  │  • Deployment automation                            │   │
│  │                                                         │   │
│  │  Docker:                                               │   │
│  │  • Containerization platform                        │   │
│  │  • Environment consistency                          │   │
│  │  • Deployment automation                            │   │
│  │  • Microservices architecture                       │   │
│  │  • Resource isolation                               │   │
│  │  • Scalable deployment                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Development Setup

### Prerequisites
```
┌─────────────────────────────────────────────────────────────────┐
│                    PREREQUISITES                            │
│                                                                 │
│  System Requirements:                                        │
│  • Operating System: Windows 10+, macOS 10.14+, Linux        │
│  • Node.js: 18.x LTS or later                            │
│  • npm: 8.x or later                                     │
│  • Git: Latest version                                    │
│  • Code Editor: VS Code (recommended)                     │
│  • Web Browser: Chrome 90+ or Firefox 88+                 │
│  • Terminal: Modern terminal with SSH support            │
│                                                                 │
│  Accounts Required:                                        │
│  • Firebase Account: For database and authentication     │
│  • Twilio Account: For SMS services (optional)          │
│  • GitHub Account: For code repository (optional)        │
│  • Vercel Account: For deployment (optional)             │
│                                                                 │
│  Knowledge Required:                                      │
│  • JavaScript/TypeScript: Intermediate level            │
│  • React: Intermediate level                            │
│  • Next.js: Basic understanding                         │
│  • Git: Basic commands and workflows                    │
│  • Command Line: Basic terminal usage                  │
│  • REST APIs: Understanding of API concepts             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Installation Steps
```
┌─────────────────────────────────────────────────────────────────┐
│                    INSTALLATION STEPS                       │
│                                                                 │
│  1. Clone the Repository:                                   │
│     git clone https://github.com/Sivazam/pHLynk.git         │
│     cd pHLynk                                              │
│                                                                 │
│  2. Install Dependencies:                                   │
│     npm install                                            │
│                                                                 │
│  3. Set Up Environment Variables:                           │
│     cp .env.example .env.local                            │
│                                                                 │
│     Edit .env.local with your configuration:               │
│     # Firebase Configuration                               │
│     FIREBASE_API_KEY=your_firebase_api_key                 │
│     FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com      │
│     FIREBASE_PROJECT_ID=your_project_id                   │
│     FIREBASE_STORAGE_BUCKET=your_project.appspot.com      │
│     FIREBASE_MESSAGING_SENDER_ID=your_sender_id          │
│     FIREBASE_APP_ID=your_app_id                          │
│                                                                 │
│     # Twilio Configuration (Optional)                     │
│     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    │
│     TWILIO_AUTH_TOKEN=your_auth_token_here                │
│     TWILIO_PHONE_NUMBER=+1234567890                      │
│                                                                 │
│     # Database Configuration                              │
│     DATABASE_URL="file:./dev.db"                          │
│                                                                 │
│  4. Set Up Firebase:                                      │
│     a. Create Firebase Project:                          │
│        - Go to https://console.firebase.google.com       │
│        - Create new project                              │
│        - Enable Authentication and Firestore              │
│        - Download service account key                     │
│                                                                 │
│     b. Configure Firebase Rules:                         │
│        - Set up security rules for Firestore             │
│        - Configure authentication methods                 │
│        - Set up user roles and permissions              │
│                                                                 │
│     c. Update Firebase Configuration:                    │
│        - Replace Firebase config in src/lib/firebase.ts  │
│        - Update collection names and security rules     │
│                                                                 │
│  5. Set Up Database:                                     │
│     npm run db:push                                      │
│     npm run db:generate                                   │
│                                                                 │
│  6. Run Development Server:                               │
│     npm run dev                                            │
│                                                                 │
│  7. Access Application:                                   │
│     Open http://localhost:3000 in your browser           │
│                                                                 │
│  8. Verify Setup:                                       │
│     - Check if all pages load correctly                  │
│     - Test authentication flow                           │
│     - Verify database connections                       │
│     - Test real-time features                            │
│     - Check console for errors                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Development Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT WORKFLOW                     │
│                                                                 │
│  1. Code Organization:                                     │
│     • Follow the established folder structure              │   │
│     • Use TypeScript for all new code                     │   │
│     • Implement proper error handling                    │   │
│     • Write meaningful comments and documentation        │   │
│     • Follow naming conventions                          │   │
│     • Keep components small and focused                  │   │
│                                                                 │
│  2. Git Workflow:                                        │
│     • Create feature branch from main                     │   │
│     • Make small, frequent commits                       │   │
│     • Write clear commit messages                        │   │
│     • Pull requests for code review                      │   │
│     • Resolve conflicts before merging                   │   │
│     • Keep main branch stable                            │   │
│                                                                 │
│  3. Testing Strategy:                                    │
│     • Write unit tests for new features                 │   │
│     • Test components in isolation                       │   │
│     • Implement integration tests                        │   │
│     • Test API endpoints                                │   │
│     • Run tests before committing                        │   │
│     • Maintain test coverage requirements                │   │
│                                                                 │
│  4. Code Quality:                                         │
│     • Run ESLint before committing                       │   │
│     • Use Prettier for code formatting                   │   │
│     • Follow TypeScript best practices                  │   │
│     • Implement proper error boundaries                 │   │
│     • Use TypeScript interfaces consistently            │   │
│     • Optimize component performance                     │   │
│                                                                 │
│  5. Development Process:                                 │   │
│     a. Planning:                                         │   │
│        - Define feature requirements                    │   │
│        - Create technical specifications                │   │
│        - Estimate development time                       │   │
│        - Identify dependencies and risks                 │   │
│                                                                 │
│     b. Development:                                     │   │
│        - Set up development environment                 │   │
│        - Implement features incrementally               │   │
│        - Test functionality as you build                │   │
│        - Refactor and optimize code                    │   │
│        • Document changes and decisions                 │   │
│                                                                 │
│     c. Testing:                                         │   │
│        - Write comprehensive tests                      │   │
│        • Test edge cases and error scenarios            │   │
│        • Perform integration testing                    │   │
│        • Test with different browsers and devices      │   │
│        • Conduct performance testing                    │   │
│                                                                 │
│     d. Review:                                          │   │
│        • Self-review code for quality                    │   │
│        • Get peer review through pull requests         │   │
│        • Address feedback and suggestions              │   │
│        • Ensure documentation is updated               │   │
│        • Verify all tests pass                          │   │
│                                                                 │
│     e. Deployment:                                      │   │
│        • Merge to main branch after approval            │   │
│        • Deploy to staging environment                 │   │
│        • Conduct user acceptance testing               │   │
│        • Deploy to production environment              │   │
│        • Monitor deployment and system health           │   │
│                                                                 │
│  6. Debugging:                                          │   │
│     • Use browser developer tools                       │   │
│     • Check console logs for errors                     │   │
│     • Use React DevTools for component debugging       │   │
│     • Test API endpoints with Postman                   │   │
│     • Use debugging breakpoints in code                │   │
│     • Log important events and errors                  │   │
│                                                                 │
│  7. Documentation:                                      │   │
│     • Update README with new features                   │   │
│     • Document API endpoints                           │   │
│     • Create user guides for new functionality         │   │
│     • Update technical documentation                   │   │
│     • Document code changes and decisions              │   │
│     • Keep changelog updated                           │   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Common Development Commands
```
┌─────────────────────────────────────────────────────────────────┐
│                 COMMON DEVELOPMENT COMMANDS                  │
│                                                                 │
│  Development:                                               │
│  npm run dev          # Start development server              │
│  npm run build        # Build for production                │
│  npm run start        # Start production server              │
│  npm run lint         # Run ESLint                         │
│                                                                 │
│  Database:                                                  │
│  npm run db:push      # Push schema to database            │
│  npm run db:generate  # Generate Prisma client            │
│  npm run db:migrate   # Run database migrations           │
│  npm run db:reset     # Reset database                   │
│                                                                 │
│  Testing:                                                   │
│  npm test             # Run all tests                      │
│  npm run test:watch   # Run tests in watch mode           │
│  npm run test:coverage # Run tests with coverage          │
│  npm run test:e2e      # Run end-to-end tests             │
│                                                                 │
│  Code Quality:                                             │
│  npm run lint         # Check code style                  │
│  npm run lint:fix     # Fix linting issues               │
│  npm run format       # Format code with Prettier        │
│  npm run type-check   # Check TypeScript types           │
│                                                                 │
│  Deployment:                                               │
│  npm run deploy       # Deploy to production             │
│  npm run deploy:staging # Deploy to staging             │
│  npm run build:analyze # Analyze build size              │
│                                                                 │
│  Utilities:                                                │
│  npm run clean        # Clean build artifacts             │
│  npm run seed         # Seed database with test data     │
│  npm run docs          # Generate documentation           │
│  npm run storybook     # Start Storybook                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Conclusion

pHLynk (PharmaLync) represents a comprehensive solution for pharmaceutical supply chain payment collection, addressing critical business needs through modern technology and thoughtful design. This system successfully bridges the gap between wholesalers, retailers, and field workers, providing a secure, efficient, and user-friendly platform for managing payment collections.

### Key Achievements

✅ **Complete Business Solution**: Addresses all aspects of pharmaceutical payment collection from invoice creation to payment verification

✅ **Modern Technology Stack**: Built with cutting-edge technologies including Next.js 15, TypeScript, Firebase, and real-time communication

✅ **Comprehensive Security**: Multi-layered security approach with authentication, authorization, data protection, and audit trails

✅ **Scalable Architecture**: Designed to grow from small-scale operations to enterprise-level deployment

✅ **User-Centric Design**: Intuitive interfaces for all user roles with mobile-first approach

✅ **Real-time Capabilities**: Instant updates and notifications across all user interactions

✅ **Robust Testing**: Comprehensive testing strategy ensuring reliability and performance

✅ **Complete Documentation**: Detailed documentation for development, deployment, and maintenance

### Future Enhancements

The foundation laid by pHLynk provides a solid platform for future enhancements including:

- **Advanced Analytics**: Machine learning for payment prediction and business intelligence
- **Mobile Applications**: Native mobile apps for enhanced field operations
- **Integration Capabilities**: API integrations with accounting and ERP systems
- **Expanded Payment Methods**: Additional payment options and digital wallet integration
- **International Expansion**: Multi-currency and multi-language support

### Community and Support

pHLynk is designed to be a community-driven project with:

- **Active Development**: Continuous improvement and feature enhancement
- **Community Support**: Forums and documentation for user assistance
- **Professional Services**: Enterprise support and customization options
- **Training Resources**: Comprehensive training materials and workshops

### Final Thoughts

pHLynk demonstrates how modern web technologies can solve complex business problems in the pharmaceutical supply chain. By focusing on user needs, security, and scalability, the system provides a robust foundation for digital transformation in payment collection processes.

The combination of intuitive user interfaces, powerful backend capabilities, and comprehensive documentation makes pHLynk an exemplary solution for organizations looking to modernize their payment collection systems.

---

**Built with ❤️ for the pharmaceutical supply chain industry**

**Supercharged by modern web technologies and best practices**