import * as ImagePicker from 'expo-image-picker';

/**
 * Выбор фото из галереи и возврат data-URI (base64), который принимает бэкенд
 * (поле photo в PlayerProfileSerializer). Ограничение — 5 МБ, как в веб-версии.
 */
export async function pickImageDataUri(): Promise<{ dataUri?: string; error?: string }> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { error: 'Нет доступа к галерее' };

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (res.canceled || !res.assets?.length) return {};

    const asset = res.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      return { error: 'Неверный формат. Допустимы jpg, png, webp' };
    }
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      return { error: 'Файл слишком большой (макс. 5 МБ)' };
    }
    if (!asset.base64) return { error: 'Не удалось прочитать файл' };

    return { dataUri: `data:${mime};base64,${asset.base64}` };
  } catch {
    return { error: 'Не удалось выбрать фото' };
  }
}
