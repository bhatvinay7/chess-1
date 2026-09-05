import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const credential = formData.get("credential");
    
    if (!credential) {
      return NextResponse.redirect(new URL("/auth/login?error=GoogleAuthFailed", req.url));
    }
    
    // We pass the token to the client via sessionStorage so it doesn't appear in the URL history
    // and then redirect to a processing page that completes the login flow.
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
        </head>
        <body style="background: #121212; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
          <div>Completing Google Sign-In...</div>
          <script>
            sessionStorage.setItem("google_id_token", "${credential}");
            window.location.href = "/auth/google/process";
          </script>
        </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    return NextResponse.redirect(new URL("/auth/login?error=GoogleAuthFailed", req.url));
  }
}
