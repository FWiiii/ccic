export const extractBearerToken = (authorizationHeader?: string): string => {
  const auth = String(authorizationHeader ?? "");
  if (!auth.startsWith("Bearer ")) {
    return "";
  }

  return auth.slice(7).trim();
};
