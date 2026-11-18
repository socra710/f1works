DECLARE @table_id int = OBJECT_ID(N'dbo.WORKS_IFORM_TEMPLATES', N'U');

IF @table_id IS NULL
BEGIN
    THROW 50000, 'dbo.WORKS_IFORM_TEMPLATES was not found.', 1;
END;

DECLARE @column_type sysname;
DECLARE @max_length smallint;
DECLARE @is_nullable bit;

SELECT
    @column_type = type_name,
    @max_length = max_length,
    @is_nullable = is_nullable
FROM (
    SELECT
        TYPE_NAME(c.user_type_id) AS type_name,
        c.max_length,
        c.is_nullable
    FROM sys.columns c
    WHERE c.object_id = @table_id
      AND c.name = N'TEMPLATE_JSON'
) AS template_json_column;

IF @column_type IS NULL
BEGIN
    THROW 50001, 'TEMPLATE_JSON column was not found.', 1;
END;

IF @column_type <> N'nvarchar' OR @max_length <> -1
BEGIN
    DECLARE @nullability nvarchar(10) =
        CASE WHEN @is_nullable = 1 THEN N' NULL' ELSE N' NOT NULL' END;
    DECLARE @alter_sql nvarchar(max) =
        N'ALTER TABLE dbo.WORKS_IFORM_TEMPLATES ALTER COLUMN TEMPLATE_JSON NVARCHAR(MAX)'
        + @nullability
        + N';';

    EXEC sys.sp_executesql @alter_sql;
END;
