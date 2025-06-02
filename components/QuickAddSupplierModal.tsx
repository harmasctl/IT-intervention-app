import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, Save, Building2, User, Phone, Mail, MapPin } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type QuickAddSupplierModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (supplierName: string) => void;
};

export default function QuickAddSupplierModal({
  visible,
  onClose,
  onSuccess,
}: QuickAddSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter supplier name');
      return;
    }

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

      if (error) throw error;

      Alert.alert('Success', 'Supplier created successfully');
      onSuccess(formData.name.trim());
      handleClose();
    } catch (error) {
      console.error('Error creating supplier:', error);
      Alert.alert('Error', 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
    });
    onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200">
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Add Supplier</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size={24} color="#3B82F6" />
            ) : (
              <Save size={24} color="#3B82F6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-6 py-6">
          <View className="mb-6">
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

          <View className="mb-6">
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

          <View className="mb-6">
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

          <View className="mb-6">
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

          <View className="mb-6">
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

          <TouchableOpacity
            className={`bg-blue-600 rounded-lg p-4 flex-row items-center justify-center mb-6 ${
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
      </View>
    </Modal>
  );
}
