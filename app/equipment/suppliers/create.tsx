import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Save,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

export default function CreateSupplierScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter supplier name');
      return false;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const supplierData = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
      };

      const { error } = await supabase
        .from('suppliers')
        .insert([supplierData]);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'A supplier with this name already exists');
          return;
        }
        throw error;
      }

      Alert.alert(
        'Success',
        'Supplier created successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating supplier:', error);
      Alert.alert('Error', 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Add Supplier</Text>
              <Text className="text-blue-100 text-sm">Create new supplier</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size={24} color="#ffffff" />
            ) : (
              <Save size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Basic Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Basic Information</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Supplier Name *</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Building2 size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter supplier name"
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                autoFocus
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Contact Person</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <User size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter contact person name"
                value={formData.contact_person}
                onChangeText={(text) => updateFormData('contact_person', text)}
              />
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Contact Information</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Phone Number</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Phone size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter phone number"
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Email Address</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Mail size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter email address"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Address</Text>
            <View className="flex-row items-start border border-gray-200 rounded-lg px-3 py-3">
              <MapPin size={20} color="#6B7280" className="mt-1" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter address"
                value={formData.address}
                onChangeText={(text) => updateFormData('address', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`bg-blue-600 rounded-xl p-4 flex-row items-center justify-center mb-6 ${
            loading ? 'opacity-50' : ''
          }`}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Create Supplier</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
