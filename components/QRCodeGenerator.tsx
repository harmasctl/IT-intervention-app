import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Download, Share2, Printer } from 'lucide-react-native';

// Define a type for QRCode ref with toDataURL method
interface QRCodeRef {
  toDataURL: (callback: (base64Data: string) => void) => void;
}

interface QRCodeGeneratorProps {
  /**
   * The value to encode in the QR code.
   * Can be a simple string, URL, or a JSON string.
   */
  value: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
  /**
   * Optional logo to display in the center of the QR code
   */
  logo?: {
    uri: string;
  };
  /**
   * Whether to auto-format JSON strings
   * If true, will try to parse JSON strings and re-stringify them
   */
  formatJSON?: boolean;
  /**
   * Optional file name for downloaded QR code
   */
  fileName?: string;
  /**
   * Optional title for the share dialog
   */
  shareTitle?: string;
  /**
   * Whether to show action buttons (download, share, print)
   */
  showActions?: boolean;
}

/**
 * A cross-platform QR code generator component
 * 
 * Requires: npm install react-native-qrcode-svg
 * For Expo: npx expo install react-native-svg expo-file-system expo-sharing expo-print
 */
const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 200,
  backgroundColor = '#FFFFFF',
  color = '#000000',
  logo,
  formatJSON = false,
  fileName = 'qrcode',
  shareTitle = 'Share QR Code',
  showActions = true
}) => {
  // QR code ref to access the base64 data
  const qrCodeRef = useRef<QRCodeRef | null>(null);

  // Process the value if it's a JSON string and formatJSON is true
  const processedValue = React.useMemo(() => {
    if (!formatJSON) return value;

    try {
      // Check if the value is a JSON string
      const parsedValue = JSON.parse(value);
      // Return a nicely formatted JSON string
      return JSON.stringify(parsedValue);
    } catch (e) {
      // If it's not a valid JSON string, return the original value
      return value;
    }
  }, [value, formatJSON]);

  // Function to download the QR code
  const downloadQRCode = async () => {
    try {
      if (!qrCodeRef.current) {
        Alert.alert('Error', 'QR Code reference not available');
        return;
      }
      
      // Get base64 data from QR code
      qrCodeRef.current.toDataURL(async (base64Data: string) => {
        if (!base64Data) {
          Alert.alert('Error', 'Failed to generate QR code image');
          return;
        }
        
        try {
          // Handle download based on platform
          if (Platform.OS === 'web') {
            // For web, create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = `data:image/png;base64,${base64Data}`;
            downloadLink.download = `${fileName}.png`;
            downloadLink.click();
          } else {
            // For native platforms, save to file system
            const fileUri = `${FileSystem.documentDirectory}${fileName}.png`;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Open share dialog if available
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
            } else {
              Alert.alert('Success', `QR Code saved to ${fileUri}`);
            }
          }
        } catch (error) {
          console.error('Error saving QR code:', error);
          Alert.alert('Error', 'Failed to save QR code');
        }
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      Alert.alert('Error', 'Failed to download QR code');
    }
  };

  // Function to share the QR code
  const shareQRCode = async () => {
    try {
      if (!qrCodeRef.current) {
        Alert.alert('Error', 'QR Code reference not available');
        return;
      }
      
      qrCodeRef.current.toDataURL(async (base64Data: string) => {
        if (!base64Data) {
          Alert.alert('Error', 'Failed to generate QR code image');
          return;
        }
        
        try {
          if (Platform.OS === 'web') {
            if (navigator.share) {
              // Use Web Share API if available
              const blob = await (await fetch(`data:image/png;base64,${base64Data}`)).blob();
              const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
              
              await navigator.share({
                title: shareTitle,
                files: [file]
              });
            } else {
              // Fall back to downloading on web
              downloadQRCode();
            }
          } else {
            // Native sharing
            const fileUri = `${FileSystem.cacheDirectory}${fileName}.png`;
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            await Share.share({
              title: shareTitle,
              url: fileUri,
            });
          }
        } catch (error) {
          console.error('Error sharing QR code:', error);
          Alert.alert('Error', 'Failed to share QR code');
        }
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  // Function to print the QR code
  const printQRCode = async () => {
    try {
      if (!qrCodeRef.current) {
        Alert.alert('Error', 'QR Code reference not available');
        return;
      }
      
      qrCodeRef.current.toDataURL(async (base64Data: string) => {
        if (!base64Data) {
          Alert.alert('Error', 'Failed to generate QR code image');
          return;
        }
        
        try {
          // Create HTML content for printing
          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                  }
                  .qr-container {
                    padding: 20px;
                    border: 1px solid #ccc;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background-color: white;
                  }
                  .qr-value {
                    margin-top: 15px;
                    font-size: 12px;
                    word-break: break-all;
                    max-width: 300px;
                    text-align: center;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                  }
                </style>
              </head>
              <body>
                <div class="qr-container">
                  <img src="data:image/png;base64,${base64Data}" width="${size}" height="${size}" />
                  <div class="qr-value">${processedValue}</div>
                </div>
              </body>
            </html>
          `;
          
          // Print the HTML content
          await Print.printAsync({
            html: htmlContent,
          });
        } catch (error) {
          console.error('Error printing QR code:', error);
          Alert.alert('Error', 'Failed to print QR code');
        }
      });
    } catch (error) {
      console.error('Error printing QR code:', error);
      Alert.alert('Error', 'Failed to print QR code');
    }
  };

  return (
    <View style={styles.container}>
      <QRCode
        value={processedValue}
        size={size}
        backgroundColor={backgroundColor}
        color={color}
        logo={logo}
        logoBackgroundColor={backgroundColor}
        enableLinearGradient={false}
        logoBorderRadius={5}
        logoSize={size * 0.2}
        getRef={(ref) => (qrCodeRef.current = ref as QRCodeRef)}
      />
      
      {showActions && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={downloadQRCode}
            accessibilityLabel="Download QR code"
          >
            <Download size={18} color="#0F172A" />
            <Text style={styles.actionText}>Download</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={shareQRCode}
            accessibilityLabel="Share QR code"
          >
            <Share2 size={18} color="#0F172A" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={printQRCode}
            accessibilityLabel="Print QR code"
          >
            <Printer size={18} color="#0F172A" />
            <Text style={styles.actionText}>Print</Text>
          </TouchableOpacity>
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  actionText: {
    fontSize: 12,
    marginTop: 4,
    color: '#0F172A',
  },
});

export default QRCodeGenerator; 