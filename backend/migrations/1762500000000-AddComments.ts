import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComments1762500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "comments" (
                "id" SERIAL NOT NULL,
                "article_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "parent_id" integer,
                "body" text NOT NULL,
                "upvote_count" integer NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
                CONSTRAINT "FK_comments_article" FOREIGN KEY ("article_id")
                    REFERENCES "articles"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_comments_user" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_comments_parent" FOREIGN KEY ("parent_id")
                    REFERENCES "comments"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`CREATE INDEX "IDX_comments_article_id" ON "comments" ("article_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_comments_parent_id" ON "comments" ("parent_id")`);

        await queryRunner.query(`
            CREATE TABLE "comment_votes" (
                "id" SERIAL NOT NULL,
                "comment_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_comment_votes" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_comment_votes_user_comment" UNIQUE ("comment_id", "user_id"),
                CONSTRAINT "FK_comment_votes_comment" FOREIGN KEY ("comment_id")
                    REFERENCES "comments"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_comment_votes_user" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`CREATE INDEX "IDX_comment_votes_comment_id" ON "comment_votes" ("comment_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "comment_votes"`);
        await queryRunner.query(`DROP TABLE "comments"`);
    }
}
