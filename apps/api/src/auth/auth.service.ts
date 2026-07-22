import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";
import { createSmsProvider, type SmsProvider } from "../integrations/providers";
import type { AuthSession, AuthUser } from "./auth.types";

const OTP_TTL_MINUTES = 5;
const SESSION_TTL_DAYS = 30;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly sms: SmsProvider = createSmsProvider();

  constructor(private readonly db: DatabaseService) {}

  async requestOtp(input: { mobile?: string }) {
    const mobile = normalizeMobile(input.mobile);
    const tenantId = await this.tenantId();
    const code = process.env.NODE_ENV === "test" ? "123456" : String(randomInt(100000, 1000000));
    const codeHash = this.hash(code);
    await this.db.query(
      `insert into auth_otp_challenges (tenant_id, mobile, code_hash, expires_at)
       values ($1, $2, $3, now() + ($4 * interval '1 minute'))`,
      [tenantId, mobile, codeHash, OTP_TTL_MINUTES],
    );
    await this.sms.send({ recipient: mobile, body: `کد ورود زبانکده: ${code}` });
    return { expiresInSeconds: OTP_TTL_MINUTES * 60, ...(process.env.NODE_ENV !== "production" && { developmentCode: code }) };
  }

  async verifyOtp(input: { mobile?: string; code?: string }): Promise<AuthSession> {
    const mobile = normalizeMobile(input.mobile);
    if (!/^\d{6}$/.test(input.code ?? "")) throw new BadRequestException("OTP code must be six digits");
    const tenantId = await this.tenantId();
    return this.db.transaction(async (client) => {
      const challengeResult = await client.query<{ id: string; code_hash: string }>(
        `select id, code_hash from auth_otp_challenges
         where tenant_id = $1 and mobile = $2 and consumed_at is null and expires_at > now() and attempts < $3
         order by created_at desc limit 1 for update`, [tenantId, mobile, MAX_OTP_ATTEMPTS]);
      const challenge = challengeResult.rows[0];
      if (!challenge) throw new UnauthorizedException("OTP is invalid or expired");
      await client.query("update auth_otp_challenges set attempts = attempts + 1 where id = $1", [challenge.id]);
      if (!this.safeEqual(challenge.code_hash, this.hash(input.code as string))) throw new UnauthorizedException("OTP is invalid or expired");
      await client.query("update auth_otp_challenges set consumed_at = now() where id = $1", [challenge.id]);
      const userResult = await client.query<{ id: string; display_name: string }>(
        `insert into users (tenant_id, mobile, display_name) values ($1, $2, $2)
         on conflict (tenant_id, mobile) do update set status = 'active'
         returning id, display_name`, [tenantId, mobile]);
      if (process.env.NODE_ENV !== "production" && mobile === normalizeConfiguredMobile(process.env.AUTH_BOOTSTRAP_MOBILE)) {
        await client.query(
          `insert into user_roles (tenant_id, user_id, role, branch_id)
           values ($1, $2, 'owner', (select id from branches where tenant_id = $1 order by id limit 1))
           on conflict (user_id, role, branch_id) do nothing`,
          [tenantId, userResult.rows[0].id],
        );
      }
      await client.query(
        `insert into user_roles (tenant_id, user_id, role, branch_id)
         select $1, $2, 'instructor', (select id from branches where tenant_id = $1 order by id limit 1)
         from instructors i join people p on p.id = i.person_id and p.tenant_id = i.tenant_id
         where i.tenant_id = $1 and p.mobile = $3 and i.status = 'active'
         on conflict (user_id, role, branch_id) do nothing`, [tenantId, userResult.rows[0].id, mobile],
      );
      const user = await this.loadUser(client, tenantId, userResult.rows[0].id);
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400000);
      await client.query(
        "insert into auth_sessions (tenant_id, user_id, token_hash, expires_at) values ($1, $2, $3, $4)",
        [tenantId, user.id, this.hash(token), expiresAt],
      );
      return { token, expiresAt: expiresAt.toISOString(), user };
    });
  }

  async authenticate(token?: string): Promise<AuthUser> {
    if (!token) throw new UnauthorizedException("Authentication required");
    const result = await this.db.query<{ tenant_id: string; user_id: string }>(
      `select tenant_id, user_id from auth_sessions
       where token_hash = $1 and revoked_at is null and expires_at > now()`, [this.hash(token)]);
    const session = result.rows[0];
    if (!session) throw new UnauthorizedException("Session is invalid or expired");
    await this.db.query("update auth_sessions set last_seen_at = now() where token_hash = $1", [this.hash(token)]);
    return this.loadUser(this.db, session.tenant_id, session.user_id);
  }

  async revoke(token?: string) {
    if (token) await this.db.query("update auth_sessions set revoked_at = now() where token_hash = $1", [this.hash(token)]);
  }

  private async loadUser(client: Pick<DatabaseService, "query"> | { query: DatabaseService["query"] }, tenantId: string, userId: string): Promise<AuthUser> {
    const result = await client.query<{ id: string; mobile: string; display_name: string; role: UserRole; branch_id: string | null }>(
      `select u.id, u.mobile, u.display_name, ur.role, ur.branch_id
       from users u left join user_roles ur on ur.user_id = u.id and ur.tenant_id = u.tenant_id
       where u.id = $1 and u.tenant_id = $2 and u.status = 'active'`, [userId, tenantId]);
    const row = result.rows[0];
    if (!row) throw new UnauthorizedException("User is inactive");
    return { id: row.id, tenantId, mobile: row.mobile, displayName: row.display_name, roles: result.rows.filter((item) => item.role).map((item) => ({ role: item.role, branchId: item.branch_id ?? undefined })) };
  }

  private async tenantId() {
    const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]);
    if (!result.rows[0]) throw new ConflictException("Institute is not configured");
    return result.rows[0].id;
  }

  private hash(value: string) { return createHmac("sha256", process.env.AUTH_SECRET ?? "development-auth-secret").update(value).digest("hex"); }
  private safeEqual(left: string, right: string) { return timingSafeEqual(Buffer.from(left), Buffer.from(right)); }
}

function normalizeMobile(value?: string) {
  const mobile = (value ?? "").replace(/[\s-]/g, "").replace(/^\+98/, "0").replace(/^0098/, "0");
  if (!/^09\d{9}$/.test(mobile)) throw new BadRequestException("A valid Iranian mobile number is required");
  return mobile;
}

function normalizeConfiguredMobile(value?: string) {
  if (!value) return "";
  return value.replace(/[\s-]/g, "").replace(/^\+98/, "0").replace(/^0098/, "0");
}
