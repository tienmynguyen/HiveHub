export const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

export function getAvatarUri(userLike) {
  if (!userLike) return DEFAULT_AVATAR;
  const uri =
    userLike.imagePath ||
    userLike.avatar ||
    userLike.photoUrl ||
    userLike.profileImage ||
    null;
  if (!uri || typeof uri !== 'string' || !uri.trim()) return DEFAULT_AVATAR;
  return uri.trim();
}

export function getAvatarSource(userLike) {
  return { uri: getAvatarUri(userLike) };
}
