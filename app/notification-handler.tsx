import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

/**
 * NotificationHandler Component
 * 
 * This component handles deep links from notifications.
 * When a user taps on a notification, they'll be redirected here
 * and then routed to the appropriate screen.
 */
export default function NotificationHandler() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  useEffect(() => {
    // Extract notification parameters
    const { deviceId, type } = params;
    
    // Handle different notification types
    if (deviceId) {
      if (type === 'maintenance') {
        // For maintenance notifications, navigate to the device maintenance screen
        router.replace({
          pathname: '/devices/maintenance',
          params: { deviceId }
        });
      } else {
        // Default to device details page
        router.replace({
          pathname: '/devices/[id]',
          params: { id: deviceId }
        });
      }
    } else {
      // If no specific params, go to maintenance schedule
      router.replace('/schedule/maintenance');
    }
  }, [params, router]);
  
  // This screen doesn't render anything - it's just a router
  return null;
} 