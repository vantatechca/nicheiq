import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // Run on every request EXCEPT:
  //   - /login
  //   - /api/* (API routes manage their own auth → 401 instead of 307)
  //   - Next.js static + image assets
  //   - favicon and any file with an extension
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
