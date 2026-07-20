import { Controller, Get, NotFoundException } from "@nestjs/common";
import type { InstituteBrand } from "@zabankadeh/contracts";
import { DatabaseService } from "./database.service";

type TenantRow = {
  slug: string;
  name_fa: string;
  name_en: string;
  settings: {
    tagline?: { fa?: string; en?: string };
    primaryColor?: string;
    phone?: string;
    address?: { fa?: string; en?: string };
  };
};

@Controller("public")
export class PublicController {
  constructor(private readonly db: DatabaseService) {}

  @Get("institute")
  async institute(): Promise<InstituteBrand> {
    const slug = process.env.TENANT_SLUG ?? "demo";
    const result = await this.db.query<TenantRow>(
      "select slug, name_fa, name_en, settings from tenants where slug = $1 and status = 'active'",
      [slug],
    );
    const tenant = result.rows[0];
    if (!tenant) throw new NotFoundException("Institute is not configured");
    return {
      slug: tenant.slug,
      name: { fa: tenant.name_fa, en: tenant.name_en },
      tagline: {
        fa: tenant.settings.tagline?.fa ?? "مسیر یادگیری شما از اینجا آغاز می‌شود",
        en: tenant.settings.tagline?.en ?? "Your learning journey starts here",
      },
      primaryColor: tenant.settings.primaryColor ?? "#12372a",
      phone: tenant.settings.phone ?? "021-00000000",
      address: {
        fa: tenant.settings.address?.fa ?? "تهران",
        en: tenant.settings.address?.en ?? "Tehran",
      },
    };
  }
}
