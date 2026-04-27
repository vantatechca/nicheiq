import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    // Run on every request except auth, static assets, public files.
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
