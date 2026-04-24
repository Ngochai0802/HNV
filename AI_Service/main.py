from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import asyncio
import os
import pyodbc
import base64
from datetime import datetime
from xray_model import XRayDiagnosisEngine

app = FastAPI()

# --- CẤU HÌNH ĐƯỜNG DẪN ---
WWWROOT_PATH = r"C:\Users\Administrator\Documents\TTCS\project\HNV\MedicalDiagnosis.API\wwwroot" 

# 1. Cấu hình Kết nối DB
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=WINDOWS-11;" 
    "DATABASE=MedicalDiagnosisDB;"
    "Trusted_Connection=yes;"
)

def get_severity_level(label, confidence):
    if label == "Bình thường":
        return "An toàn"
    if label == "Viêm phổi":
        if confidence >= 85.0:
            return "Nguy hiểm"
        else:
            return "Cần khám ngay"
    return "Theo dõi thêm"

def get_conn():
    return pyodbc.connect(CONNECTION_STRING)

# 2. Khởi tạo AI Engine
try:
    engine = XRayDiagnosisEngine(model_path="weights/model_xray_final.h5")
    # Thêm vào sau dòng khởi tạo engine
    if engine.model:
        print("--- DANH SÁCH LAYERS:")
        for layer in engine.model.layers:
            print(f"  {layer.name} - {type(layer).__name__}")
        print(f"--- Last conv layer tìm được: {engine.last_conv_layer_name}")
except Exception as e:
    print(f"Cảnh báo: Không thể load model thật, lỗi: {e}")
    engine = XRayDiagnosisEngine(model_path=None)

class AnalyzeRequest(BaseModel):
    imageId: int
    inferenceId: int

@app.get("/")
def health():
    return {"status": "AI Service is running", "mode": "Real AI (TensorFlow)"}

@app.post("/ai/analyze")
async def analyze(req: AnalyzeRequest):
    start_time = datetime.now()
    conn = None
    
    try:
        conn = get_conn()
        cursor = conn.cursor()

        # --- BƯỚC 1: Lấy đường dẫn ảnh ---
        cursor.execute("SELECT image_url FROM Medical_Images WHERE id = ?", req.imageId)
        row = cursor.fetchone()
        
        if not row:
            raise Exception(f"Không tìm thấy ảnh với ID {req.imageId}")

        relative_path = row[0]
        clean_path = relative_path.lstrip('/').replace('/', os.sep)
        full_image_path = os.path.join(WWWROOT_PATH, clean_path)

        if not os.path.exists(full_image_path):
            raise Exception(f"File ảnh không tồn tại tại: {full_image_path}")

        # --- BƯỚC 2: AI dự đoán ---
        with open(full_image_path, "rb") as f:
            image_bytes = f.read()
        
        ai_output = engine.predict(image_bytes) 
        print(f"Dữ liệu gốc từ AI: {ai_output}") 

        # Trích xuất dữ liệu
        prediction_data = ai_output.get("prediction", {})
        label = prediction_data.get("label_vi", "Bình thường")
        confidence = prediction_data.get("confidence", 0.0)
        severity = get_severity_level(label, confidence)
        heatmap_base64 = ai_output.get("heatmap_base64", "")
        bounding_boxes = ai_output.get("bounding_boxes", [])  # ✅ Lấy bounding boxes
        
        inference_time = (datetime.now() - start_time).total_seconds()

        # --- BƯỚC 3: Xử lý lưu File Heatmap (Nếu có) ---
        heatmap_url = None
        if heatmap_base64:
            try:
                heatmap_filename = f"heatmap_{req.imageId}.jpg"
                heatmap_save_path = os.path.join(WWWROOT_PATH, "uploads", heatmap_filename)
                
                if "," in heatmap_base64:
                    heatmap_base64 = heatmap_base64.split(",")[1]
                
                img_data = base64.b64decode(heatmap_base64)
                with open(heatmap_save_path, "wb") as f:
                    f.write(img_data)
                
                heatmap_url = f"/uploads/{heatmap_filename}"
            except Exception as e_heatmap:
                print(f"Lỗi khi lưu file heatmap: {e_heatmap}")

        # --- BƯỚC 4: Cập nhật Database ---
        
        # 1. Cập nhật AI_Inferences
        cursor.execute("""
            UPDATE AI_Inferences 
            SET status = 'success', inference_time = ? 
            WHERE id = ?
        """, inference_time, req.inferenceId)

        # 2. Insert AI_Results — lấy lại ID vừa insert
        cursor.execute("""
            INSERT INTO AI_Results (inference_id, prediction_label, confidence_score, severity_level, heatmap_base64)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?)
        """, req.inferenceId, label, confidence, severity, heatmap_base64)
        
        result_row = cursor.fetchone()
        result_id = result_row[0] if result_row else None
        print(f"--- Đã insert AI_Results với ID: {result_id}")

        # ✅ 3. Insert Bounding Boxes (nếu có)
        if result_id and bounding_boxes:
            for box in bounding_boxes:
                cursor.execute("""
                    INSERT INTO AI_Bounding_Boxes (result_id, x, y, width, height)
                    VALUES (?, ?, ?, ?, ?)
                """, result_id, box["x"], box["y"], box["width"], box["height"])
            print(f"--- Đã insert {len(bounding_boxes)} bounding boxes")

        # 4. Cập nhật bảng Diagnoses
        cursor.execute("""
            UPDATE Diagnoses 
            SET result = ?, 
                severity_level = ?, 
                confidence_score = ?,
                heatmap_path = ?
            WHERE image_id = ?
        """, label, severity, confidence, heatmap_url, req.imageId)

        # 5. Cập nhật Medical_Images
        cursor.execute("UPDATE Medical_Images SET status = 'processed' WHERE id = ?", req.imageId)

        conn.commit()
        return {
            "status": "success", 
            "label": label, 
            "confidence": confidence, 
            "severity": severity,
            "heatmap_url": heatmap_url,
            "bounding_boxes_count": len(bounding_boxes)  # ✅ Log thêm để debug
        }

    except Exception as e:
        print(f"Error during AI analysis: {e}")
        if conn: conn.rollback()
        return {"status": "failed", "error": str(e)}
    finally:
        if conn: conn.close()