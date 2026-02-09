import {jwtDecode} from "jwt-decode";

export function getUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function isAdmin() {
  const user = getUser();
  return user?.role === "ADMIN";
}
