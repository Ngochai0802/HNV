USE [MedicalDiagnosisDB];
GO

SET NOCOUNT ON;
GO

SELECT TOP (25)
    AvgDurationMs = CONVERT(decimal(18, 2), rs.avg_duration / 1000.0),
    MaxDurationMs = CONVERT(decimal(18, 2), rs.max_duration / 1000.0),
    Executions = rs.count_executions,
    LastExecutionTime = rs.last_execution_time,
    QueryText = LEFT(qt.query_sql_text, 4000)
FROM sys.query_store_runtime_stats AS rs
JOIN sys.query_store_plan AS p
    ON rs.plan_id = p.plan_id
JOIN sys.query_store_query AS q
    ON p.query_id = q.query_id
JOIN sys.query_store_query_text AS qt
    ON q.query_text_id = qt.query_text_id
ORDER BY rs.avg_duration DESC;
GO

SELECT TOP (25)
    WaitCategory = wait_category_desc,
    TotalWaitMs = CONVERT(decimal(18, 2), SUM(total_query_wait_time_ms)),
    AvgWaitMs = CONVERT(decimal(18, 2), SUM(total_query_wait_time_ms) / NULLIF(SUM(waiting_tasks_count), 0)),
    WaitingTasks = SUM(waiting_tasks_count)
FROM sys.query_store_wait_stats
GROUP BY wait_category_desc
ORDER BY TotalWaitMs DESC;
GO
