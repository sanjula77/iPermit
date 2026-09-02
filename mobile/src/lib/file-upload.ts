import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  /** Web only — a real File object, present when running in a browser. */
  file?: File;
}

/**
 * Appends a picked file to FormData in whichever shape the platform needs.
 * Web requires a real Blob/File; native (iOS/Android) uses React Native's
 * special-cased `{ uri, name, type }` object, which its networking bridge
 * turns into a multipart file part — a plain object would not work on web.
 */
export function appendFilePart(formData: FormData, fieldName: string, picked: PickedFile): void {
  if (picked.file) {
    formData.append(fieldName, picked.file, picked.name);
    return;
  }
  formData.append(
    fieldName,
    { uri: picked.uri, name: picked.name, type: picked.mimeType } as unknown as Blob,
  );
}

function fromImagePickerAsset(
  asset: ImagePicker.ImagePickerAsset,
  fallbackName: string,
): PickedFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? fallbackName,
    mimeType: asset.mimeType ?? 'image/jpeg',
    file: asset.file,
  };
}

export async function pickImageFromLibrary(fallbackName: string): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return fromImagePickerAsset(result.assets[0], fallbackName);
}

export async function takePhoto(fallbackName: string): Promise<PickedFile | null> {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return fromImagePickerAsset(result.assets[0], fallbackName);
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'application/pdf'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    file: asset.file,
  };
}
