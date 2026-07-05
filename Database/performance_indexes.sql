USE [MedicalDiagnosisDB];
GO

SET NOCOUNT ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_Users_Username_Deleted' AND object_id = OBJECT_ID('dbo.Users'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_Users_Username_Deleted]
    ON [dbo].[Users] ([username], [is_deleted])
    INCLUDE ([id], [password_hash], [email], [full_name], [role_id], [is_active], [failed_attempts], [last_login], [updated_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_Users_Email_Deleted' AND object_id = OBJECT_ID('dbo.Users'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_Users_Email_Deleted]
    ON [dbo].[Users] ([email], [is_deleted])
    INCLUDE ([id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_MedImg_Patient_Deleted_UploadDate' AND object_id = OBJECT_ID('dbo.Medical_Images'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_MedImg_Patient_Deleted_UploadDate]
    ON [dbo].[Medical_Images] ([patient_id], [is_deleted], [upload_date] DESC)
    INCLUDE ([file_name], [image_url], [status]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_MedImg_Status_Deleted_UploadDate' AND object_id = OBJECT_ID('dbo.Medical_Images'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_MedImg_Status_Deleted_UploadDate]
    ON [dbo].[Medical_Images] ([status], [is_deleted], [upload_date] DESC)
    INCLUDE ([patient_id], [file_name], [image_url]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_AIInfer_Image_CreatedAt' AND object_id = OBJECT_ID('dbo.AI_Inferences'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_AIInfer_Image_CreatedAt]
    ON [dbo].[AI_Inferences] ([image_id], [created_at] DESC)
    INCLUDE ([status], [model_id], [inference_time]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_ImgAssign_Doctor_Status_AssignedAt' AND object_id = OBJECT_ID('dbo.Image_Assignments'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_ImgAssign_Doctor_Status_AssignedAt]
    ON [dbo].[Image_Assignments] ([doctor_id], [status], [assigned_at] DESC)
    INCLUDE ([image_id], [assigned_by]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_ImgAssign_Image_AssignedAt' AND object_id = OBJECT_ID('dbo.Image_Assignments'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_ImgAssign_Image_AssignedAt]
    ON [dbo].[Image_Assignments] ([image_id], [assigned_at] DESC)
    INCLUDE ([doctor_id], [status]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_Appt_Patient_Time' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_Appt_Patient_Time]
    ON [dbo].[Appointments] ([patient_id], [appointment_time] DESC)
    INCLUDE ([doctor_id], [status], [created_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_Appt_Doctor_Time' AND object_id = OBJECT_ID('dbo.Appointments'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_Appt_Doctor_Time]
    ON [dbo].[Appointments] ([doctor_id], [appointment_time] DESC)
    INCLUDE ([patient_id], [status], [created_at]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_Notif_User_Read_CreatedAt' AND object_id = OBJECT_ID('dbo.Notifications'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_Notif_User_Read_CreatedAt]
    ON [dbo].[Notifications] ([user_id], [is_read], [created_at] DESC)
    INCLUDE ([title], [content]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Perf_Messages_Conv_Read_Sender' AND object_id = OBJECT_ID('dbo.Messages'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Perf_Messages_Conv_Read_Sender]
    ON [dbo].[Messages] ([conversation_id], [is_read], [sender_id])
    INCLUDE ([created_at]);
END
GO
