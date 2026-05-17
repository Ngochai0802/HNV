from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import asyncio
import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import pyodbc
import base64
from datetime import datetime
from xray_model import XRayDiagnosisEngine

app = FastAPI()

# --- CẤU HÌNH ĐƯỜNG DẪN ---
WWWROOT_PATH = r"C:\Users\Hai Nguyen\MedicalDiagnosis\MedicalDiagnosis.API\wwwroot"

# 1. Cấu hình Kết nối DB
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=MSI;" 
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
    
    # --- BƯỚC 1: Lấy đường dẫn ảnh (Mở và đóng conn nhanh) ---
    full_image_path = None
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT image_url FROM Medical_Images WHERE id = ?", req.imageId)
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise Exception(f"Không tìm thấy ảnh với ID {req.imageId}")

        relative_path = row[0]
        clean_path = relative_path.lstrip('/').replace('/', os.sep)
        full_image_path = os.path.join(WWWROOT_PATH, clean_path)

        if not os.path.exists(full_image_path):
            raise Exception(f"File ảnh không tồn tại tại: {full_image_path}")
    except Exception as e_prep:
        print(f"Lỗi chuẩn bị: {e_prep}")
        return {"status": "failed", "error": str(e_prep)}

    # --- BƯỚC 2: AI dự đoán (KHÔNG giữ connection DB) ---
    try:
        with open(full_image_path, "rb") as f:
            image_bytes = f.read()
        
        ai_output = engine.predict(image_bytes) 
        print(f"AI hoàn tất dự đoán cho Image {req.imageId}") 

        # Trích xuất dữ liệu
        prediction_data = ai_output.get("prediction", {})
        label = prediction_data.get("label_vi", "Bình thường")
        confidence = prediction_data.get("confidence", 0.0)
        severity = get_severity_level(label, confidence)
        heatmap_base64 = ai_output.get("heatmap_base64", "")
        bounding_boxes = ai_output.get("bounding_boxes", [])
        
        inference_time = (datetime.now() - start_time).total_seconds()

        # --- BƯỚC 3: Xử lý lưu File Heatmap ---
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
                print(f"Lỗi heatmap: {e_heatmap}")

        # --- BƯỚC 4: Cập nhật Database (Mở conn mới để lưu) ---
        print(f"--- BẮT ĐẦU LƯU DB CHO INFERENCE {req.inferenceId} ---")
        conn = get_conn()
        cursor = conn.cursor()
        
        try:
            # 1. Cập nhật AI_Inferences
            cursor.execute("UPDATE AI_Inferences SET status = 'success', inference_time = ? WHERE id = ?", 
                           inference_time, req.inferenceId)
            print(f"1. Đã cập nhật AI_Inferences status = 'success'")

            # 2. Lưu kết quả vào DB
            cursor.execute("""
                INSERT INTO AI_Results (inference_id, prediction_label, confidence_score, processed_image_url, severity_level, heatmap_base64)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?)
            """, req.inferenceId, label, confidence / 100.0, heatmap_url, severity, heatmap_base64)
            
            result_id = cursor.fetchone()[0]
            print(f"2. Đã lưu AI_Results, ID: {result_id}")

            # 3. Insert Bounding Boxes
            if bounding_boxes:
                for box in bounding_boxes:
                    cursor.execute("INSERT INTO AI_Bounding_Boxes (result_id, x, y, width, height) VALUES (?, ?, ?, ?, ?)",
                                   result_id, box["x"], box["y"], box["width"], box["height"])
                print(f"3. Đã lưu {len(bounding_boxes)} bounding boxes")

            conn.commit()
            print(f"--- LƯU DB THÀNH CÔNG ---")
        except Exception as db_e:
            conn.rollback()
            print(f"❌ LỖI KHI LƯU DB: {db_e}")
            raise db_e
        finally:
            conn.close()

        return {
            "status": "success", "label": label, "confidence": confidence, 
            "severity": severity, "heatmap_url": heatmap_url
        }

    except Exception as e:
        print(f"Lỗi xử lý AI: {e}")
        return {"status": "failed", "error": str(e)}