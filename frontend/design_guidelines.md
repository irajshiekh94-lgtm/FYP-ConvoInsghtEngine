# WhatsApp Chat Analyzer - Design Guidelines

## Authentication & User Management

**Authentication Required**: Yes
- The app syncs analyzed chat data across devices and stores AI processing results
- **Implementation**:
  - Use SSO (Apple Sign-In for iOS, Google Sign-In for Android)
  - Mock auth flow in prototype with local state
  - Include login/signup screens with privacy policy and terms of service links
  - Account screen with logout (confirmation alert) and delete account (nested under Settings > Account > Delete with double confirmation)

**Profile/Settings Screen**:
- User avatar (generate 1 WhatsApp-style circular avatar preset)
- Display name field
- App preferences: theme toggle (light/dark), notification settings, data retention period

---

## Navigation Architecture

**Root Navigation**: Tab Navigation (4 tabs)
- **Tab 1 - Home**: Dashboard with categorized chats overview
- **Tab 2 - Chats**: List of all imported/analyzed chats
- **Tab 3 - Action Items**: Pending tasks, reminders, urgent matters
- **Tab 4 - Profile**: User settings and app preferences

**Floating Action Button**: Import new chat (positioned bottom-right, above tab bar)

---

## Screen Specifications

### 1. Home (Dashboard) Screen
**Purpose**: Overview of important insights, recent analysis, and quick stats

**Layout**:
- **Header**: Default navigation header with "Dashboard" title, transparent background
  - Right button: Filter icon to toggle category filters
- **Content**: Scrollable view with cards
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Summary cards (3 horizontal cards): Total Chats, Pending Actions, Urgent Items
  - "Recent Analysis" section with chat preview cards (showing chat name, category badge, timestamp)
  - "Upcoming Reminders" section with time-sensitive items
  - Empty state: "No chats analyzed yet. Tap + to import a WhatsApp chat"

### 2. Chats Screen
**Purpose**: Browse all imported chats with filtering and search

**Layout**:
- **Header**: Custom transparent header
  - Title: "Chats"
  - Right button: Search icon (opens search overlay)
  - Search bar appears below header when search is active
- **Content**: FlatList/ScrollView
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Filter chips (horizontal scrollable): All, Important, Actionable, General, Business
  - Chat list items with:
    - Chat name (contact/group name)
    - Category badge (color-coded)
    - Last analyzed timestamp
    - Action count indicator (if >0)
    - Swipe actions: Delete, Re-analyze
  - Empty state: "No chats imported yet"

### 3. Individual Chat Analysis Screen (Modal/Stack)
**Purpose**: Detailed view of analyzed chat with extracted insights

**Layout**:
- **Header**: Non-transparent header with back button
  - Title: Chat name
  - Right button: Share icon (export analysis)
- **Content**: Scrollable view
  - Safe area insets: top = Spacing.xl, bottom = insets.bottom + Spacing.xl
- **Components**:
  - Summary card (collapsible): AI-generated summary of entire conversation
  - Sections with headers:
    - "Action Items" (tasks, deadlines, assignments)
    - "Business Orders" (product, quantity, price, delivery)
    - "Meetings & Events" (date, time, location)
    - "Important Messages" (highlighted excerpts from chat)
  - Each item should have: content text, timestamp, urgency indicator, "Set Reminder" button
  - Voice note transcriptions displayed inline with playback icon

### 4. Action Items Screen
**Purpose**: Centralized view of all pending tasks and urgent matters

**Layout**:
- **Header**: Default transparent header
  - Title: "Action Items"
  - Right button: Sort icon (by date, urgency, category)
- **Content**: Segmented control at top, then list
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Segmented control: Pending, Completed, Overdue
  - Grouped list by category (Business Orders, Meetings, Assignments, Tasks)
  - Action item cards with:
    - Content/description
    - Source chat name
    - Due date/time (if applicable)
    - Urgency badge (High, Medium, Low)
    - Checkbox to mark complete
    - "Remind me" button
  - Swipe to dismiss or snooze

### 5. Profile/Settings Screen
**Purpose**: User account management and app configuration

**Layout**:
- **Header**: Default transparent header with "Profile" title
- **Content**: Scrollable form/list
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - User avatar (tappable to change) with display name
  - Settings sections:
    - **Notifications**: Toggle for reminders, urgent alerts, daily summary
    - **Data & Privacy**: Data retention period, clear cache, export data
    - **Appearance**: Theme toggle (light/dark)
    - **Account**: Logout, Delete Account

### 6. Import Chat Screen (Modal)
**Purpose**: Guide user through importing WhatsApp chat export

**Layout**:
- **Header**: Modal header with "Import Chat" title
  - Left button: Cancel
  - Right button: None (submit is in content area)
- **Content**: Scrollable form
  - Safe area insets: top = Spacing.xl, bottom = insets.bottom + Spacing.xl
- **Components**:
  - Instructions card: "How to export WhatsApp chat"
  - File picker button: "Select Chat File (.txt)"
  - Optional: "Add Voice Notes" button (multi-select)
  - Selected files list
  - "Analyze Chat" button (primary, disabled until file selected)

---

## Design System

### Color Palette (WhatsApp-Inspired)
**Light Mode**:
- Primary: #25D366 (WhatsApp green)
- Primary Variant: #128C7E (darker green)
- Background: #FFFFFF
- Surface: #F0F0F0
- Chat Bubble (Sent): #DCF8C6 (light green)
- Chat Bubble (Received): #FFFFFF
- Text Primary: #000000
- Text Secondary: #667781
- Error: #E53935
- Warning: #FFA726
- Success: #25D366

**Dark Mode**:
- Primary: #25D366
- Background: #0B141A
- Surface: #1F2C34
- Chat Bubble (Sent): #005C4B
- Chat Bubble (Received): #1F2C34
- Text Primary: #E9EDEF
- Text Secondary: #8696A0

### Category Colors
- Important: #E53935 (Red)
- Actionable: #FFA726 (Orange)
- General: #667781 (Gray)
- Business: #25D366 (Green)
- Urgent: #D32F2F (Dark Red)

### Typography
- **Headers**: SF Pro Display (iOS) / Roboto (Android), Bold, 28pt
- **Subheaders**: SF Pro Text / Roboto, Semibold, 20pt
- **Body**: SF Pro Text / Roboto, Regular, 16pt
- **Caption**: SF Pro Text / Roboto, Regular, 14pt, secondary color
- **Chat Text**: SF Pro Text / Roboto, Regular, 15pt

### Component Specifications

**Floating Import Button**:
- Position: bottom-right, 16px from edges
- Size: 56x56pt circular
- Background: Primary color (#25D366)
- Icon: Plus (white, 24pt)
- Drop shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- Safe area: bottom = tabBarHeight + 16px

**Category Badges**:
- Pill-shaped, 8px padding horizontal, 4px vertical
- Font: 12pt, medium weight
- Background color matches category
- White text

**Chat List Item**:
- Height: 72pt
- Padding: 12pt vertical, 16pt horizontal
- Background: Surface color
- Border bottom: 1px, Surface color (darker)
- Touchable feedback: subtle background color change

**Action Item Card**:
- Border radius: 12px
- Padding: 16pt
- Background: Surface color
- Border left: 4px solid urgency color
- Touchable feedback: scale down to 0.98

**Summary Cards (Dashboard)**:
- Border radius: 16px
- Padding: 20pt
- Background: Surface with subtle gradient
- Icon: 32pt, category color
- Number: 32pt, bold, primary text
- Label: 14pt, secondary text

### Interaction Design
- All buttons and touchable elements provide visual feedback (scale or opacity change)
- Swipe gestures on list items reveal contextual actions
- Pull-to-refresh on lists
- Haptic feedback on important actions (iOS)
- Loading states use WhatsApp-style animated dots
- Smooth transitions between screens (300ms)

### Accessibility
- Minimum touch target: 44x44pt
- Color contrast ratio ≥ 4.5:1 for text
- Support Dynamic Type / Font Scaling
- VoiceOver / TalkBack labels for all interactive elements
- Status indicators use both color AND icons/text

### Required Assets
**Generate 1 preset avatar**: Circular, minimalist illustration with WhatsApp green accent (e.g., abstract chat bubble with sparkles representing AI analysis)

**Use System Icons (Feather)** for:
- Navigation: home, message-circle, check-square, user
- Actions: plus, search, filter, share-2, trash-2, refresh-cw
- Status: alert-circle, clock, check-circle
- Categories: briefcase, book, users, calendar

---

## Platform Considerations
- iOS: Use Apple Sign-In, SF Pro font, default navigation transitions
- Android: Use Google Sign-In, Roboto font, Material ripple effects