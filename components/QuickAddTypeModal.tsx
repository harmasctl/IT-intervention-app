import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Save, Tag } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type QuickAddTypeModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (typeName: string) => void;
};

export default function QuickAddTypeModal({
  visible,
  onClose,
  onSuccess,
}: QuickAddTypeModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter type name');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('equipment_types')
        .insert([{
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor,
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Equipment type created successfully');
      onSuccess(name.trim());
      handleClose();
    } catch (error) {
      console.error('Error creating equipment type:', error);
      Alert.alert('Error', 'Failed to create equipment type');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedColor('#3B82F6');
    onClose();
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
          <Text className="text-xl font-bold text-gray-800">Add Equipment Type</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size={24} color="#3B82F6" />
            ) : (
              <Save size={24} color="#3B82F6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-6">
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">Type Name *</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Tag size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter type name"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">Description (Optional)</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-800"
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-3">Color</Text>
            <View className="flex-row flex-wrap">
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  className={`w-12 h-12 rounded-full mr-3 mb-3 ${
                    selectedColor === color ? 'border-4 border-gray-400' : 'border-2 border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            className={`bg-blue-600 rounded-lg p-4 flex-row items-center justify-center ${
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
                <Text className="text-white font-bold text-lg ml-2">Create Type</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
