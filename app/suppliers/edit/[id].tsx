import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Save,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

export default function EditSupplierScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    if (id) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || '',
          contact_person: data.contact_person || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
        });
      }
    } catch (error) {
      console.error('Error fetching supplier:', error);
      Alert.alert('Error', 'Failed to load supplier details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter supplier name');
      return;
    }

    try {
      setSaving(true);

      const supplierData = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
      };

      const { error } = await supabase
        .from('suppliers')
        .update(supplierData)
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Supplier updated successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating supplier:', error);
      Alert.alert('Error', 'Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading supplier details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Edit Supplier</Text>
              <Text className="text-blue-100 text-sm">Update supplier information</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
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
            <Text className="text-gray-700 font-medium mb-2">Website</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Globe size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter website URL"
                value={formData.website}
                onChangeText={(text) => updateFormData('website', text)}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Address */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Address</Text>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Full Address</Text>
            <View className="flex-row items-start border border-gray-200 rounded-lg px-3 py-3">
              <MapPin size={20} color="#6B7280" className="mt-1" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter full address"
                value={formData.address}
                onChangeText={(text) => updateFormData('address', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Additional Notes</Text>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Notes</Text>
            <View className="flex-row items-start border border-gray-200 rounded-lg px-3 py-3">
              <FileText size={20} color="#6B7280" className="mt-1" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter any additional notes"
                value={formData.notes}
                onChangeText={(text) => updateFormData('notes', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`bg-blue-600 rounded-xl p-4 flex-row items-center justify-center mb-6 ${
            saving ? 'opacity-50' : ''
          }`}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Update Supplier</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
