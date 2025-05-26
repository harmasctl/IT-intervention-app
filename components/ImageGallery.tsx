import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ImageGalleryProps {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const ImageGallery = ({
  images,
  visible,
  initialIndex = 0,
  onClose,
}: ImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = React.useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <X size={24} color="#ffffff" />
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </View>
          )}
          keyExtractor={(_, index) => `image-${index}`}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {images.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft
                size={28}
                color={currentIndex === 0 ? '#ffffff80' : '#ffffff'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
              disabled={currentIndex === images.length - 1}
            >
              <ChevronRight
                size={28}
                color={
                  currentIndex === images.length - 1 ? '#ffffff80' : '#ffffff'
                }
              />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.pagination}>
          <Text style={styles.paginationText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width - 40,
    height: height - 100,
    borderRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  navButton: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 8,
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
  pagination: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  paginationText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default ImageGallery; 