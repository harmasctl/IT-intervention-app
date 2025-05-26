import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import QRCodeGenerator from './QRCodeGenerator';
import { supabase } from '../lib/supabase';

interface DeviceQRCodeProps {
  /**
   * Either the device ID or the full QR code data string
   */
  data: string;
  size?: number;
  showDetails?: boolean;
  showLogo?: boolean;
  /**
   * Whether to show action buttons (download, share, print)
   */
  showActions?: boolean;
  /**
   * Optional file name for downloaded QR code
   */
  fileName?: string;
}

/**
 * Component to display a QR code for a device
 * It will either use the provided data directly (if it's a JSON string)
 * or look up the device data from the database if only an ID is provided
 */
const DeviceQRCode: React.FC<DeviceQRCodeProps> = ({
  data,
  size = 200,
  showDetails = false,
  showLogo = true,
  showActions = false,
  fileName = 'device-qr'
}) => {
  const [qrData, setQrData] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ id: string; name: string; serial: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if data is already JSON
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        setQrData(data);
        setDeviceInfo({
          id: parsed.id || '',
          name: parsed.name || '',
          serial: parsed.serial || ''
        });
        return;
      }
    } catch (e) {
      // Not JSON, might be just a device ID
    }

    // If not JSON, assume it's a device ID and fetch data
    const fetchDeviceData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data: deviceData, error } = await supabase
          .from('devices')
          .select('id, name, serial_number, qr_code')
          .eq('id', data)
          .single();

        if (error) {
          throw error;
        }

        if (deviceData) {
          // If device has stored QR code data, use that
          if (deviceData.qr_code) {
            setQrData(deviceData.qr_code);
            try {
              const parsed = JSON.parse(deviceData.qr_code);
              setDeviceInfo({
                id: parsed.id || deviceData.id,
                name: parsed.name || deviceData.name,
                serial: parsed.serial || deviceData.serial_number
              });
            } catch (e) {
              // Use device data directly if qr_code isn't valid JSON
              setDeviceInfo({
                id: deviceData.id,
                name: deviceData.name,
                serial: deviceData.serial_number
              });
            }
          } else {
            // Create QR data from device info
            const newQrData = JSON.stringify({
              id: deviceData.id,
              serial: deviceData.serial_number,
              name: deviceData.name,
              type: 'device'
            });
            setQrData(newQrData);
            setDeviceInfo({
              id: deviceData.id,
              name: deviceData.name,
              serial: deviceData.serial_number
            });
            
            // Optionally save this QR code data back to the device
            try {
              await supabase
                .from('devices')
                .update({ qr_code: newQrData })
                .eq('id', deviceData.id);
            } catch (saveError) {
              console.error('Error saving QR code to device:', saveError);
              // Continue anyway, as we already have the QR code data locally
            }
          }
        }
      } catch (e) {
        console.error('Error fetching device data:', e);
        setError('Failed to load device data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceData();
  }, [data]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading device QR code...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!qrData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No QR data available</Text>
      </View>
    );
  }

  // Use app logo or nothing
  const logo = showLogo ? { uri: 'https://yourapp.com/logo.png' } : undefined;
  
  // Create a custom file name based on device info if available
  const customFileName = deviceInfo 
    ? `device-${deviceInfo.id}-${deviceInfo.serial.replace(/[^a-zA-Z0-9]/g, '')}`
    : fileName;

  return (
    <View style={styles.container}>
      <QRCodeGenerator 
        value={qrData} 
        size={size} 
        logo={logo} 
        formatJSON={true} 
        showActions={showActions}
        fileName={customFileName}
        shareTitle={deviceInfo?.name ? `QR Code for ${deviceInfo.name}` : 'Device QR Code'}
      />
      
      {showDetails && deviceInfo && (
        <View style={styles.details}>
          <Text style={styles.name}>{deviceInfo.name}</Text>
          <Text style={styles.serial}>S/N: {deviceInfo.serial}</Text>
          <Text style={styles.id}>ID: {deviceInfo.id}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 10,
  },
  details: {
    marginTop: 16,
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  serial: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  id: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default DeviceQRCode; 