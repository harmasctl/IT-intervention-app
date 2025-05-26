# IT Intervention App - Device Management System

A comprehensive mobile application built with React Native and Expo for managing restaurant equipment and devices. The app provides functionalities for tracking equipment, managing maintenance schedules, and generating QR codes for quick device identification.

## Features

### Device Management

- **Device Inventory**: Track all equipment with detailed information including name, serial number, type, model, and custom fields.
- **Categories**: Organize devices by categories with customizable maintenance intervals.
- **Custom Fields**: Support for various field types (text, number, boolean, date, selection) to track device-specific details.
- **Device Images**: Upload and store images for visual identification of equipment.
- **QR Code Generation**: Generate and manage QR codes for quick device identification and access.
- **Bulk Import**: Import multiple devices at once using CSV files.

### Maintenance Tracking

- **Maintenance Scheduling**: Automatically calculate next maintenance dates based on category intervals.
- **Maintenance History**: Record and track all maintenance activities performed on devices.
- **Overdue Alerts**: Visual indicators and notifications for overdue maintenance.
- **Warranty Tracking**: Monitor warranty status and expiration dates.

### Notification System

- **Push Notifications**: Receive alerts for upcoming and overdue maintenance.
- **Maintenance Reminders**: Automated notifications 7 days before maintenance is due.
- **Overdue Alerts**: Notifications when maintenance is past due.
- **Dashboard Alerts**: Visual display of maintenance needs on the dashboard.
- **Background Checks**: System automatically checks maintenance status when app is opened.

### Restaurant Management

- **Multi-Restaurant Support**: Manage devices across multiple restaurant locations.
- **Location Tracking**: Easily identify where each device is located.

## Key Screens

1. **Device Listing**: View, search, and filter devices with status indicators.
2. **Device Details**: Comprehensive view of device information, maintenance history, and actions.
3. **Maintenance Recording**: Log maintenance activities with descriptions and resolution status.
4. **Maintenance Schedule**: View upcoming and overdue maintenance across all devices.
5. **Categories Management**: Create and manage device categories with maintenance intervals.
6. **QR Code Management**: Generate, view, share, and download QR codes for devices.
7. **Bulk Import**: Import multiple devices using CSV templates.

## Technical Details

### Database Structure

- **Devices Table**: Stores core device information with references to categories and restaurants.
- **Device Categories**: Defines types of equipment with maintenance intervals.
- **Maintenance Records**: Tracks all maintenance activities performed on devices.
- **Storage**: Secure storage for device images with proper access controls.

### Key Technologies

- **Frontend**: React Native, Expo, TypeScript, NativeWind (Tailwind CSS)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Data Visualization**: Custom components for status indicators and maintenance schedules
- **Notifications**: Expo Notifications for maintenance reminders
- **QR Integration**: Expo Barcode Scanner for scanning device QR codes

## Maintenance Scheduling System

The maintenance scheduling system automatically calculates when devices are due for maintenance based on:

1. **Category-defined intervals**: Each device category has a default maintenance interval (in days).
2. **Last maintenance date**: The system uses the last recorded maintenance to calculate the next due date.
3. **Status tracking**: Devices are flagged as "upcoming" or "overdue" based on their maintenance status.

The system provides three key ways to track maintenance:

1. **Dashboard alerts**: Shows upcoming and overdue maintenance directly on the dashboard.
2. **Maintenance schedule screen**: Provides a comprehensive view of all maintenance needs.
3. **Push notifications**: Automatically sends reminders for maintenance tasks.

### Maintenance Notification Workflow

1. **Upcoming Maintenance**: 
   - System sends a notification 7 days before maintenance is due
   - The notification appears on the device and in the app dashboard
   
2. **Overdue Maintenance**:
   - When a device's maintenance becomes overdue, the system sends an alert
   - Overdue alerts are repeated every 3 days until maintenance is completed
   
3. **Notification Actions**:
   - Tapping on a notification takes the user directly to the device details
   - Users can record maintenance directly from the notification or dashboard alert
   
4. **Background Checking**:
   - The system automatically checks for maintenance statuses when:
     - The app is first opened
     - The app comes to the foreground after being in the background
     - Manual refresh of the maintenance schedule screen

## Installation and Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Supabase:
   - Create a Supabase project
   - Run the migration scripts in `migrations/` folder
   - Update the Supabase URL and anon key in `lib/supabase.js`
4. Start the app: `npm start`

## Future Enhancements

- **Maintenance Assignment**: Assign maintenance tasks to specific technicians.
- **Parts Inventory**: Track replacement parts for maintenance activities.
- **Advanced Analytics**: Statistical analysis of device reliability and maintenance patterns.
- **Work Orders**: Generate and track formal work orders for maintenance activities.
- **Offline Support**: Enhanced offline capabilities for field technicians.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Recent Updates

### Fixed Device Creation Issues

We've addressed several issues with the device creation process:

1. **Fixed Image Picker API**
   - Updated deprecated `MediaTypeOptions` to use compatible methods for both web and native platforms
   - Added proper error handling for image selection and capture

2. **Fixed File System Errors on Web**
   - Added platform-specific code to handle file system operations differently on web vs. native
   - Implemented a blob-to-base64 conversion process for web platforms
   - Added robust error handling to prevent crashes

3. **Fixed QR Code Generation**
   - Replaced Google Charts API (which had CORS issues) with a local solution
   - Added QR code data storage in the database
   - Created a custom QR code generator component using react-native-qrcode-svg

4. **Fixed Type/Category Confusion**
   - Renamed "type" field to "category" for consistency
   - Ensured UI labels match backend database field names

5. **Added Model Management**
   - Added support for device models in the database
   - Implemented proper model selection in the device creation form

These changes improve cross-platform compatibility and make the app more reliable when creating and managing devices.

### Fixed Storage Bucket Permission Issues

We've addressed critical storage bucket permission issues:

1. **Fixed Storage Permissions**
   - Added proper RLS policies for ticket-photos bucket
   - Added policies for device-images bucket
   - Created a new device-data bucket for QR code information
   - Set appropriate public access controls for shared resources
   - Configured authentication requirements for modifying data

2. **Improved QR Code System**
   - Replaced Google Charts API with a cross-platform local QR code generation system
   - Created a reusable DeviceQRCode component that works consistently across web and native platforms
   - Added auto-generation capabilities for device QR codes
   - Implemented a capture system to share and download QR codes
   - Stored QR code data in the database for consistency and offline access

3. **Enhanced Database Schema**
   - Added QR code data JSON storage in the database
   - Created database triggers for automatic QR code generation
   - Updated bucket security policies for proper access control
   - Added ability to manage device models in categories

These changes greatly improve storage reliability, fix CORS issues with QR codes, and ensure consistent user experience across all platforms.

### Fixed Device Creation Form

We've addressed several issues with the device creation process:

1. **Clarified Type vs. Category Fields**
   - Replaced the confusing "category" text field with a proper "type" field that aligns with the database schema
   - Renamed the category dropdown to "Device Category" for clarity
   - Fixed field mapping in the save function to properly save both type and category_id

2. **Added Barcode Scanning**
   - Implemented a barcode scanner for serial numbers
   - Added a scanner button next to the serial number field
   - Integrated proper permissions handling for camera access

3. **Improved Database Schema**
   - Added proper indexes for performance optimization
   - Added clear comments on field purposes
   - Ensured consistent NOT NULL constraints
   - Updated QR code generation to include proper device type

4. **Fixed Dependencies**
   - Added missing html2canvas dependency for QR code sharing on web
   - Added expo-barcode-scanner for scanning functionality

These updates resolve issues with device creation, streamline the data entry process, and ensure proper data consistency between the form and the database schema.

### Fixed Storage Permission and Date Picker Issues

We've resolved several critical issues:

1. **Storage Bucket Permission Fixes**
   - Fixed "new row violates row-level security policy" errors
   - Properly configured RLS policies for storage buckets
   - Added a storage initialization system that runs on app startup
   - Created clear SQL scripts for bucket management
   - Fixed proper authentication checking before uploads

2. **Image Upload Improvements**
   - Fixed base64 encoding issues that caused upload failures
   - Added proper blob handling for both web and native platforms
   - Improved error handling for upload failures
   - Added proper MIME type configuration

3. **Date Picker Fixes**
   - Fixed purchase date and warranty date pickers
   - Added platform-specific display configurations
   - Improved date state management
   - Fixed iOS-specific picker behavior

4. **Authentication Validation**
   - Added explicit authentication checks before storage operations
   - Improved error messaging for unauthenticated users
   - Added graceful fallbacks when storage operations fail

These fixes ensure reliable image uploads, proper QR code generation, and functional date selection across all platforms.

### Added Restaurant Device Map

We've added a comprehensive restaurant device map feature:

1. **Restaurant Device Mapping**
   - Created a visual map of restaurants and their devices
   - Added filtering by device type and search functionality
   - Implemented a split-view interface for easy navigation
   - Added device status indicators with color coding

2. **Database Optimizations**
   - Added indexes for faster device and restaurant queries
   - Created a view for quick restaurant device counts
   - Added a function to get devices with category information
   - Ensured proper location data structure for restaurants

3. **Navigation Improvements**
   - Added a map button to the restaurants screen
   - Integrated with the existing navigation system
   - Ensured proper routing between related screens

4. **Performance Enhancements**
   - Implemented lazy loading of device data
   - Added caching for previously loaded restaurants
   - Optimized queries for faster data retrieval
   - Added proper loading indicators

This new feature provides a visual way to manage and monitor devices across all restaurant locations, making it easier to track equipment status and maintenance needs.
