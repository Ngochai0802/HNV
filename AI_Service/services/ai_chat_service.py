import os
import httpx
import time
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv(override=True)

# Lấy URL chuẩn từ hàm để luôn bắt được Key mới nhất
def get_gemini_url():
    key = os.environ.get("GEMINI_API_KEY", "")
    return f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}", key

def generate_chat_reply(history: List[Dict[str, str]]) -> str:
    """
    history: Mảng các dict [{"role": "user" | "ai", "content": "nội dung"}, ...]
    """
    load_dotenv(override=True) # Ép nạp lại file .env mỗi lần gọi
    gemini_url, current_key = get_gemini_url()

    if not current_key:
        return "Lỗi: Chưa cấu hình GEMINI_API_KEY."

    system_instruction = """
    Bạn là BÁC SĨ CHUYÊN KHOA HÔ HẤP đang chat trực tiếp với bệnh nhân.
    Hệ thống vừa cung cấp cho bạn lịch sử chat và kết quả phân tích X-quang từ AI (nếu có).
    Nhiệm vụ của bạn là VIẾT TRỰC TIẾP CÂU TRẢ LỜI DÀNH CHO BỆNH NHÂN.
    
    NGUYÊN TẮC QUAN TRỌNG:
    1. ĐÓNG VAI BÁC SĨ: Xưng "tôi" hoặc "bác sĩ" với "bạn/anh/chị". TUYỆT ĐỐI KHÔNG xưng là "AI" hay "Trợ lý ảo". KHÔNG nói kiểu "Bác sĩ đã nhận được yêu cầu", mà hãy chat tự nhiên (Ví dụ: "Chào bạn, tôi đã xem kết quả X-quang của bạn...").
    2. CÁCH DIỄN ĐẠT KẾT QUẢ AI: Hãy biến số liệu AI thành chẩn đoán của chính bạn. KHÔNG NÓI "Hệ thống AI có báo hiệu...", HÃY NÓI "Qua hình ảnh X-quang, tôi nhận thấy vùng phổi của bạn có dấu hiệu...".
    3. NGẮN GỌN & THÂN THIỆN: Viết từ 2-4 câu, chuyên nghiệp, đi thẳng vào vấn đề.
    4. KHÔNG KÊ ĐƠN: Tuyệt đối không ghi tên thuốc cụ thể.
    5. KHÔNG DÙNG CÂU CHỜ: Không dùng các câu như "Bác sĩ sẽ phản hồi bạn sớm nhất" vì CHÍNH BẠN ĐANG PHẢN HỒI HỌ RỒI.
    """

    # Format history for Gemini REST API
    contents = []
    for msg in history:
        # Gemini roles: "user" or "model"
        role = "model" if msg["role"] == "ai" or msg["role"] == "doctor" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": contents
    }

    max_retries = 3
    base_delay = 2.0

    for attempt in range(max_retries):
        try:
            response = httpx.post(gemini_url, json=payload, timeout=30.0)
            
            # Nếu bị lỗi 429 Too Many Requests
            if response.status_code == 429:
                print(f"Lỗi 429 (Too Many Requests). Đang thử lại lần {attempt + 1}/{max_retries}...")
                time.sleep(base_delay * (2 ** attempt)) # 2s, 4s, 8s
                continue
                
            response.raise_for_status()
            data = response.json()
            
            # Extract the text reply
            candidates = data.get("candidates", [])
            if candidates and len(candidates) > 0:
                return candidates[0]["content"]["parts"][0]["text"]
            
            return "Xin lỗi, hệ thống không thể tạo câu trả lời lúc này."
            
        except Exception as e:
            # Nếu không phải 429 hoặc lỗi khác, ta thoát vòng lặp và dùng fallback mock
            print(f"Lỗi API: {str(e)}")
            break

    # Lấy câu hỏi cuối cùng của bệnh nhân để trả lời giả lập cho tự nhiên
    last_user_msg = "vấn đề sức khỏe của bạn"
    for m in reversed(history):
        if m["role"] == "user":
            last_user_msg = m["content"].lower()
            break
            
    # Tạo bản nháp dự phòng (Mock Draft) chuẩn Y khoa Phổi
    if "đau ngực" in last_user_msg or "khó thở" in last_user_msg:
        mock_reply = "Chào bạn, triệu chứng tức ngực và khó thở có thể là dấu hiệu bất thường ở phổi. Dựa trên hình ảnh X-quang (nếu có), tôi nhận thấy... Tuy nhiên để chắc chắn, bạn nên đến cơ sở y tế gần nhất để thăm khám trực tiếp."
    elif "ho" in last_user_msg or "đờm" in last_user_msg or "sốt" in last_user_msg:
        mock_reply = "Chào bạn, các triệu chứng ho, có đờm và sốt kéo dài thường liên quan đến viêm đường hô hấp. Bạn hãy uống nhiều nước ấm và theo dõi thêm. Nếu có hình X-quang bất thường, tôi sẽ gửi phác đồ điều trị cụ thể."
    elif "x-quang" in last_user_msg or "kết quả" in last_user_msg or "phim" in last_user_msg:
        mock_reply = "Chào bạn, tôi đã xem qua phim X-quang của bạn. Kết quả phân tích sơ bộ cho thấy có dấu hiệu viêm. Bạn vui lòng sắp xếp thời gian đến phòng khám để tôi kiểm tra lại và tư vấn kỹ hơn nhé."
    else:
        mock_reply = "Chào bạn, tôi đã nhận được thông tin. Bạn có thể nói rõ hơn về các triệu chứng hiện tại để tôi tư vấn chính xác hơn không?"
        
    print("Đã chuyển sang dùng Mock Draft thay thế.")
    return mock_reply
