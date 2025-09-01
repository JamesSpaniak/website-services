DO $$
    BEGIN
        CREATE USER postgres WITH LOGIN PASSWORD 'postgres';
        EXCEPTION WHEN duplicate_object THEN RAISE NOTICE '%, skipping', SQLERRM USING ERRCODE = SQLSTATE;
    END
$$;

CREATE EXTENSION IF NOT EXISTS dblink;

DO $$
    BEGIN
        IF EXISTS (SELECT FROM pg_database WHERE datname = 'blog') THEN
            RAISE NOTICE 'Database already exists';  -- optional
        ELSE
            PERFORM dblink_exec('dbname=' || current_database()  -- current db
                                , 'CREATE DATABASE blog');
        END IF;
    END
$$;

GRANT ALL PRIVILEGES ON DATABASE blog TO postgres;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";