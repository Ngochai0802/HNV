import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import json
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MODEL_PATH = "weights/model_xquang_phoi.pth"
CONFIDENCE_THRESHOLD = 0.70  # Chỉ accept khi >= 70%

# ✅ FIX 1: Load class_names từ file để đảm bảo đúng thứ tự lúc train
# Tạo file class_names.json khi train: json.dump(dataset.classes, open("class_names.json","w"))
CLASS_NAMES_PATH = "weights/class_names.json"

if os.path.exists(CLASS_NAMES_PATH):
    with open(CLASS_NAMES_PATH, "r") as f:
        classes = json.load(f)
    print(f"[FILTER] Loaded classes từ file: {classes}")
else:
    # Fallback - đảm bảo đúng thứ tự alphabet của folder khi train
    classes = ["anh_thuong", "khong_phai_phoi", "phoi"]
    print(f"[FILTER] WARNING: Dùng classes mặc định, kiểm tra lại thứ tự!")

model = models.resnet18()
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, len(classes))  # ✅ Dùng len(classes) thay vì hardcode 3

model.load_state_dict(
    torch.load(MODEL_PATH, map_location=device, weights_only=True)
)
model.to(device)
model.eval()

# ✅ FIX 2: Kiểm tra lại transform - nếu train với grayscale thì dùng 'L' + normalize 1 channel
# Nếu train với RGB (3 channels) thì giữ nguyên
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

def is_lung_xray(image_bytes: bytes) -> bool:
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = transform(image).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = model(tensor)
            probs = torch.softmax(outputs, dim=1)
            conf, pred = torch.max(probs, 1)

        pred_idx = pred.item()
        conf_val = conf.item()
        result = classes[pred_idx]

        # ✅ FIX 3: Log toàn bộ probabilities để debug
        all_probs = {classes[i]: f"{probs[0][i].item():.4f}" for i in range(len(classes))}
        print(f"[FILTER] Predict: {result} | Conf: {conf_val:.4f} | All: {all_probs}")

        # ✅ FIX 3: Thêm ngưỡng confidence
        if conf_val < CONFIDENCE_THRESHOLD:
            print(f"[FILTER] REJECT - confidence {conf_val:.4f} < {CONFIDENCE_THRESHOLD}")
            return False

        return result == "phoi"

    except Exception as e:
        print(f"[FILTER] Lỗi xử lý ảnh: {e}")
        return False  # Nếu lỗi thì reject, không phải accept
    
if __name__ == "__main__":
    # Test với ảnh bất kỳ
    import sys
    with open(sys.argv[1], "rb") as f:
        data = f.read()
    result = is_lung_xray(data)
    print(f"Kết quả: {'✅ Phổi' if result else '❌ Không phải phổi'}")    