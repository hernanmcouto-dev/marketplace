import { cookies } from "next/headers";

export interface AuthUser {
  userType: "cliente" | "admin";
  loginTime: number;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth");

    if (!authCookie) {
      return null;
    }

    const auth = JSON.parse(authCookie.value) as AuthUser;
    return auth;
  } catch (err) {
    return null;
  }
}

export async function requireAuth(userType?: "cliente" | "admin") {
  const auth = await getAuthUser();

  if (!auth) {
    return { authenticated: false, user: null };
  }

  if (userType && auth.userType !== userType) {
    return { authenticated: false, user: null };
  }

  return { authenticated: true, user: auth };
}
