USE [MedicalDiagnosisDB];
GO

SET NOCOUNT ON;
GO

SELECT
    r.session_id,
    r.blocking_session_id,
    r.status,
    r.command,
    WaitType = r.wait_type,
    WaitTimeMs = r.wait_time,
    r.cpu_time,
    r.total_elapsed_time,
    DatabaseName = DB_NAME(r.database_id),
    HostName = s.host_name,
    ProgramName = s.program_name,
    LoginName = s.login_name,
    RunningSql = SUBSTRING(
        t.text,
        (r.statement_start_offset / 2) + 1,
        CASE r.statement_end_offset
            WHEN -1 THEN LEN(CONVERT(nvarchar(max), t.text))
            ELSE (r.statement_end_offset - r.statement_start_offset) / 2 + 1
        END)
FROM sys.dm_exec_requests AS r
JOIN sys.dm_exec_sessions AS s
    ON r.session_id = s.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.database_id = DB_ID()
ORDER BY
    CASE WHEN r.blocking_session_id <> 0 THEN 0 ELSE 1 END,
    r.total_elapsed_time DESC;
GO

SELECT
    tl.request_session_id,
    tl.resource_type,
    tl.request_mode,
    tl.request_status,
    ObjectName = OBJECT_NAME(p.object_id),
    tl.resource_description
FROM sys.dm_tran_locks AS tl
LEFT JOIN sys.partitions AS p
    ON tl.resource_associated_entity_id = p.hobt_id
WHERE tl.resource_database_id = DB_ID()
ORDER BY tl.request_session_id, tl.resource_type;
GO
