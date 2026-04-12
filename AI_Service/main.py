from fastapi import FastAPI
from pydantic import BaseModel
import asyncio
import random
import httpx
from datetime import datetime

app = FastAPI()

# Kết nối DB trực tiếp qua pyodbc
import pyodbc

CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=MSI"          # thay bằng tên server của bạn
    "DATABASE=MedicalDiagnosisDB;"
    "Trusted_Connection=yes;"
)

def get_conn():
    return pyodbc.connect(CONNECTION_STRING)

class AnalyzeRequest(BaseModel):
    imageId: int
    inferenceId: int

# Mock labels và bounding boxes
MOCK_LABELS = [
    ("Pneumonia",    0.87),
    ("Normal",       0.95),
    ("COVID-19",     0.78),
    ("Tuberculosis", 0.82),
    ("Lung Cancer",  0.71),
]

@app.post("/ai/analyze")
async def analyze(req: AnalyzeRequest):
    # Giả lập AI xử lý 2-3 giây
    start = datetime.now()
    await asyncio.sleep(random.uniform(2, 3))
    inference_time = (datetime.now() - start).total_seconds()

    # Random kết quả mock
    label, confidence = random.choice(MOCK_LABELS)

    # Bounding box ngẫu nhiên
    x      = random.randint(50,  200)
    y      = random.randint(50,  150)
    width  = random.randint(60,  120)
    height = random.randint(60,  120)

    try:
        conn   = get_conn()
        cursor = conn.cursor()

        # 1. Cập nhật AI_Inferences → success
        cursor.execute("""
            UPDATE AI_Inferences
            SET status = 'success', inference_time = ?
            WHERE id = ?
        """, inference_time, req.inferenceId)

        # 2. Insert AI_Results
        cursor.execute("""
            INSERT INTO AI_Results (inference_id, prediction_label, confidence_score)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?)
        """, req.inferenceId, label, confidence)
        result_id = cursor.fetchone()[0]

        # 3. Insert AI_Bounding_Boxes
        cursor.execute("""
            INSERT INTO AI_Bounding_Boxes (result_id, x, y, width, height)
            VALUES (?, ?, ?, ?, ?)
        """, result_id, x, y, width, height)

        # 4. Insert AI_Suggestions
        suggestion = f"Kết quả AI phát hiện: {label} với độ tin cậy {confidence*100:.1f}%. Khuyến nghị bác sĩ xem xét vùng được khoanh."
        cursor.execute("""
            INSERT INTO AI_Suggestions (image_id, suggested_text, is_used_by_doctor, created_at)
            VALUES (?, ?, 0, GETDATE())
        """, req.imageId, suggestion)

        # 5. Insert AI_Chat_Responses
        if label == "Normal":
            chat_msg = f"Ảnh X-quang của bạn được AI đánh giá là BÌNH THƯỜNG với độ tin cậy {confidence*100:.1f}%. Tuy nhiên hãy chờ bác sĩ xác nhận."
        else:
            chat_msg = f"AI phát hiện dấu hiệu {label} trong ảnh X-quang với độ tin cậy {confidence*100:.1f}%. Bác sĩ sẽ xem xét và đưa ra kết luận chính xác."

        cursor.execute("""
            INSERT INTO AI_Chat_Responses (image_id, inference_id, message_content, confidence_score, created_at)
            VALUES (?, ?, ?, ?, GETDATE())
        """, req.imageId, req.inferenceId, chat_msg, confidence)

        # 6. Cập nhật Medical_Images status → processed
        cursor.execute("""
            UPDATE Medical_Images SET status = 'processed' WHERE id = ?
        """, req.imageId)

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        # Cập nhật inference status → failed
        try:
            conn   = get_conn()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE AI_Inferences SET status = 'failed' WHERE id = ?
            """, req.inferenceId)
            conn.commit()
            cursor.close()
            conn.close()
        except:
            pass
        return {"error": str(e)}

    return {
        "status":      "success",
        "label":       label,
        "confidence":  confidence,
        "boundingBox": {"x": x, "y": y, "width": width, "height": height}
    }

@app.get("/")
def health():
    return {"status": "AI Service running"}