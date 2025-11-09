import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface FileUploadProps {
  onUploadComplete: (files: any[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

export function FileUpload({
  onUploadComplete,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>(
    {}
  );
  const { theme } = useTheme();

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        handleUpload(result.assets);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error picking image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled) {
        handleUpload(result.assets);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Error picking document');
    }
  };

  const handleUpload = async (assets: any[]) => {
    if (assets.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const uploadedFiles = [];

    for (const asset of assets) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        
        if (fileInfo.size > maxSize) {
          alert(`File ${asset.name} is too large`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.name || 'file',
          type: asset.mimeType || 'application/octet-stream',
        } as any);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        uploadedFiles.push(data.file);
        
        setUploadProgress(prev => ({
          ...prev,
          [asset.name]: 100,
        }));
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Error uploading ${asset.name}`);
      }
    }

    if (uploadedFiles.length > 0) {
      onUploadComplete(uploadedFiles);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={pickImage}
      >
        <MaterialIcons name="photo" size={24} color="white" />
        <Text style={styles.buttonText}>Pick Images/Videos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={pickDocument}
      >
        <MaterialIcons name="attach-file" size={24} color="white" />
        <Text style={styles.buttonText}>Pick Documents</Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        Up to {maxFiles} files, max {Math.round(maxSize / (1024 * 1024))}MB each
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
  info: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
