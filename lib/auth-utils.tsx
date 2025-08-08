import { cookies } from "next/headers";
import { lucia } from "./lucia";
import { redirect } from "next/navigation";
import type { User, Session } from "lucia";

export async function validateRequest(): Promise<
  { user: User; session: Session } | { user: null; session: null }
> {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  
  if (!sessionId) {
    return { user: null, session: null };
  }

  const result = await lucia.validateSession(sessionId);
  
  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }
  } catch {
    // Next.js throws when you attempt to set a cookie when rendering page
  }
  
  return result;
}

export async function requireAuth() {
  const { user, session } = await validateRequest();
  if (!user) {
    redirect('/auth/signin');
  }
  return { user, session };
}

export async function requireAdmin() {
  const { user, session } = await requireAuth();
  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }
  return { user, session };
}