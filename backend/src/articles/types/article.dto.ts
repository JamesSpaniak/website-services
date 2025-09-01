import { IsNotEmpty, IsString } from 'class-validator';


class ArticleDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    sub_heading: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    hidden: boolean;
};

class ArticleDtoResponseOnly {
    id?: number;

    submitted_at?: Date;

    updated_at?: Date;
};

type ArticleFull = ArticleDto & ArticleDtoResponseOnly;

type ArticleSlim = Omit<ArticleDto, 'body'>;


export {
    ArticleDto,
    ArticleFull,
    ArticleSlim,
}