import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";

type HttpRequest = { headers: { authorization?: string; cookie?: string } };
type HttpResponse = { setHeader(name: string, value: string): void };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request") request(@Body() body: { mobile?: string }) { return this.auth.requestOtp(body); }

  @Post("otp/verify")
  async verify(@Body() body: { mobile?: string; code?: string }, @Res({ passthrough: true }) response: HttpResponse) {
    const session = await this.auth.verifyOtp(body);
    response.setHeader("Set-Cookie", `zabankadeh_session=${session.token}; HttpOnly; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return { expiresAt: session.expiresAt, user: session.user };
  }

  @Post("logout")
  async logout(@Req() request: HttpRequest, @Res({ passthrough: true }) response: HttpResponse) {
    await this.auth.revoke(readToken(request));
    response.setHeader("Set-Cookie", "zabankadeh_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    return { ok: true };
  }

  @Post("session")
  async session(@Req() request: HttpRequest) {
    return { user: await this.auth.authenticate(readToken(request)) };
  }
}

export function readToken(request: HttpRequest) {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  const cookie = request.headers.cookie?.split(";").map((part: string) => part.trim()).find((part: string) => part.startsWith("zabankadeh_session="));
  return cookie?.slice("zabankadeh_session=".length);
}
