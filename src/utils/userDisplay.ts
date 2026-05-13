type UserLike = {
  displayName?: string | null;
  email?: string | null;
};

export const getUserDisplayName = (
  user?: UserLike | null,
  fallback = 'Unknown User',
) => {
  const displayName = user?.displayName?.trim();
  if (displayName) return displayName;

  const email = user?.email?.trim();
  if (email) return email;

  return fallback;
};

export const normalizeSearchValue = (value?: string | null) =>
  value?.trim().toLowerCase() ?? '';
