import { getServerSession } from "next-auth";
import { authOptions } from "./options";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getSession();
  if (!session?.user) return null;
  return session;
}
