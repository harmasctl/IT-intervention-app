import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, X, Upload } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { decode } from "base64-arraybuffer";

type ImageUploaderProps = {
  onImageUploaded: (urls: string[]) => void;
  existingImages?: string[];
  multiple?: boolean;
  folder?: string;
};

export default function ImageUploader({
  onImageUploaded,
  existingImages = [],
  multiple = false,
  folder = "devices",
}: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Camera permission is required to take photos",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          await uploadImage(asset.base64);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Media library permission is required to select images",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        allowsEditing: !multiple,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          if (asset.base64) {
            await uploadImage(asset.base64);
          }
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      setUploading(true);

      // Generate a unique filename
      const fileExt = "jpg";
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload the image to Supabase Storage
      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, decode(base64Image), {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      if (data) {
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        const imageUrl = publicUrlData.publicUrl;

        // Update state with the new image URL
        const updatedImages = multiple ? [...images, imageUrl] : [imageUrl];
        setImages(updatedImages);
        onImageUploaded(updatedImages);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    onImageUploaded(updatedImages);
  };

  return (
    <View>
      <Text className="text-gray-700 mb-2 font-medium">Images</Text>

      {/* Image preview area */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {images.map((imageUrl, index) => (
            <View key={index} className="relative mr-3">
              <Image
                source={{ uri: imageUrl }}
                className="w-24 h-24 rounded-lg"
              />
              <TouchableOpacity
                className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                onPress={() => removeImage(index)}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Upload buttons */}
      <View className="flex-row">
        <TouchableOpacity
          className="flex-1 bg-blue-600 py-2 rounded-lg items-center mr-2 flex-row justify-center"
          onPress={takePhoto}
          disabled={uploading}
        >
          <Camera size={20} color="white" className="mr-2" />
          <Text className="text-white font-medium">Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-blue-600 py-2 rounded-lg items-center ml-2 flex-row justify-center"
          onPress={pickImage}
          disabled={uploading}
        >
          <ImageIcon size={20} color="white" className="mr-2" />
          <Text className="text-white font-medium">Select Image</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View className="mt-4 items-center">
          <ActivityIndicator size="small" color="#1e40af" />
          <Text className="text-gray-500 mt-1">Uploading image...</Text>
        </View>
      )}
    </View>
  );
}
