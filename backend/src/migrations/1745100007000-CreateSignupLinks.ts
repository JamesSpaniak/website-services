import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1. signup_links — admin-generated signup/promo links. `kind`, `max_uses`,
 *    `discount_percent`, `price_override` support future multi-use campaign
 *    links (social media promos with discounted checkout); only one_time
 *    links are implemented initially.
 * 2. user_courses_purchased gains access-provenance columns: `source`
 *    ('purchase' | 'admin_grant' | 'signup_link'), `granted_by_user_id`,
 *    `signup_link_id`, `granted_at`. Existing rows and the untouched Stripe
 *    write path fall back to the 'purchase' default.
 */
export class CreateSignupLinks1745100007000 implements MigrationInterface {
  name = 'CreateSignupLinks1745100007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── signup_links ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "signup_links" (
        "id"                  SERIAL         NOT NULL,
        "code"                varchar(24)    NOT NULL,
        "kind"                varchar(16)    NOT NULL DEFAULT 'one_time',
        "email"               varchar,
        "course_ids"          integer[]      NOT NULL DEFAULT '{}',
        "note"                varchar,
        "max_uses"            integer,
        "use_count"           integer        NOT NULL DEFAULT 0,
        "discount_percent"    integer,
        "price_override"      numeric(10,2),
        "created_by_user_id"  integer,
        "used_by_user_id"     integer,
        "used_at"             TIMESTAMPTZ,
        "expires_at"          TIMESTAMPTZ    NOT NULL,
        "created_at"          TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signup_links" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_signup_links_code" ON "signup_links" ("code")`,
    );
    await queryRunner.query(`
      ALTER TABLE "signup_links"
        ADD CONSTRAINT "FK_signup_links_created_by" FOREIGN KEY ("created_by_user_id")
        REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "signup_links"
        ADD CONSTRAINT "FK_signup_links_used_by" FOREIGN KEY ("used_by_user_id")
        REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // ── user_courses_purchased provenance ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "user_courses_purchased"
        ADD COLUMN "source" varchar(16) NOT NULL DEFAULT 'purchase',
        ADD COLUMN "granted_by_user_id" integer,
        ADD COLUMN "signup_link_id" integer,
        ADD COLUMN "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "user_courses_purchased"
        ADD CONSTRAINT "FK_ucp_granted_by" FOREIGN KEY ("granted_by_user_id")
        REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user_courses_purchased"
        ADD CONSTRAINT "FK_ucp_signup_link" FOREIGN KEY ("signup_link_id")
        REFERENCES "signup_links"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_courses_purchased"
        DROP CONSTRAINT "FK_ucp_signup_link",
        DROP CONSTRAINT "FK_ucp_granted_by",
        DROP COLUMN "granted_at",
        DROP COLUMN "signup_link_id",
        DROP COLUMN "granted_by_user_id",
        DROP COLUMN "source"
    `);
    await queryRunner.query(`DROP TABLE "signup_links"`);
  }
}
