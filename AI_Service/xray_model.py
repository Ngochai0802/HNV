import tensorflow as tf
import numpy as np
from PIL import Image
import io
import base64
import cv2

class XRayDiagnosisEngine:
    def __init__(self, model_path=None):
        if model_path:
            try:
                self.model = tf.keras.models.load_model(model_path)
                self.last_conv_layer_name = self._find_last_conv_layer()
                print(f"--- Đã load model thành công từ: {model_path}")
            except Exception as e:
                print(f"--- Lỗi load model: {e}")
                self.model = None
        else:
            self.model = None

        # Class 0: no disease, Class 1: bacterial pneumonia, Class 2: viral pneumonia
        self.labels = ["Bình thường", "Viêm phổi (Vi khuẩn)", "Viêm phổi (Virus)"]

    def _find_last_conv_layer(self):
        # Model MobileNetV2 được wrap trong 1 Functional layer
        # Cần đi vào bên trong để tìm conv layer cuối
        for layer in self.model.layers:
            if isinstance(layer, tf.keras.Model):  # Tìm sub-model (MobileNetV2)
                for sublayer in reversed(layer.layers):
                    if isinstance(sublayer, tf.keras.layers.Conv2D) or "conv" in sublayer.name.lower():
                        print(f"--- Tìm thấy last conv layer: {sublayer.name}")
                        return sublayer.name
        return None

    def get_severity(self, class_idx, confidence):
        if class_idx == 0:
            return {
                "level": "An toàn",
                "color": "#28a745",
                "action": "Phổi bình thường. Duy trì lối sống lành mạnh."
            }
        
        if class_idx == 1:
            level = "Nguy hiểm" if confidence > 70.0 else "Cần khám ngay"
            return {
                "level": level,
                "color": "#dc3545",
                "action": "Dấu hiệu VIÊM PHỔI VI KHUẨN. Cần bác sĩ chỉ định kháng sinh gấp!"
            }
        else:
            level = "Cần khám ngay" if confidence > 70.0 else "Theo dõi sát sao"
            return {
                "level": level,
                "color": "#ffc107",
                "action": "Dấu hiệu VIÊM PHỔI VIRUS. Theo dõi nhịp thở và chỉ số SpO2."
            }

    def make_gradcam_heatmap(self, img_array, model, last_conv_layer_name, pred_index):
        try:
            # Tìm MobileNetV2 sub-model
            mobilenet = next(l for l in model.layers if isinstance(l, tf.keras.Model))
            
            # Lấy output của conv layer cuối trong MobileNetV2
            conv_layer = mobilenet.get_layer(last_conv_layer_name)
            
            # Build model: input → conv output + final prediction
            grad_model = tf.keras.models.Model(
                inputs=mobilenet.inputs,
                outputs=[conv_layer.output, mobilenet.output]
            )

            with tf.GradientTape() as tape:
                # Chạy qua MobileNetV2 trước
                conv_output, mobilenet_output = grad_model(img_array)
                # Sau đó chạy qua các layer còn lại (GAP, Dense...)
                x = mobilenet_output
                for layer in model.layers[1:]:  # Bỏ qua mobilenet layer
                    x = layer(x)
                class_channel = x[:, pred_index]

            grads = tape.gradient(class_channel, conv_output)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            conv_output = conv_output[0]
            heatmap = conv_output @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)
            heatmap = tf.maximum(heatmap, 0)
            max_val = tf.math.reduce_max(heatmap)
            if max_val == 0:
                return None
            heatmap = heatmap / max_val
            return heatmap.numpy()
        except Exception as e:
            print(f"--- Lỗi Grad-CAM: {e}")
            return None

    def extract_bounding_boxes(self, heatmap, original_width, original_height, threshold=0.5):
        """
        Tạo bounding box từ Grad-CAM heatmap.
        - threshold: ngưỡng % activation để xác định vùng bệnh (0.5 = 50%)
        """
        # Scale heatmap về [0, 255]
        heatmap_uint8 = np.uint8(255 * heatmap)
        
        # Resize về kích thước ảnh gốc
        heatmap_resized = cv2.resize(heatmap_uint8, (original_width, original_height))
        
        # Threshold: chỉ lấy vùng activation cao (vùng AI "nhìn vào")
        thresh_value = int(255 * threshold)
        _, binary = cv2.threshold(heatmap_resized, thresh_value, 255, cv2.THRESH_BINARY)
        
        # Tìm contours (vùng liên thông)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        boxes = []
        min_area = (original_width * original_height) * 0.01  # Bỏ qua vùng < 1% ảnh
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            boxes.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})
        
        return boxes

    def predict(self, image_bytes):
        if self.model is None:
            return {"summary": "Hệ thống đang chạy demo."}

        # 1. Tiền xử lý ảnh
        img_pil = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        original_width, original_height = img_pil.size
        
        img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2GRAY)
        img_cv = cv2.equalizeHist(img_cv) 
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_GRAY2RGB)
        
        img_resized = Image.fromarray(img_cv).resize((224, 224))
        img_array = np.array(img_resized).astype('float32') / 255.0
        img_input = np.expand_dims(img_array, axis=0)

        # 2. Dự đoán
        preds = self.model.predict(img_input)
        raw = preds[0]
        print(f"--- KẾT QUẢ AI (RAW): {raw}")

        idx_normal = 0
        idx_bacterial = 1
        idx_viral = 2

        if raw[idx_bacterial] > 0.20 or raw[idx_viral] > 0.20:
            class_idx = idx_bacterial if raw[idx_bacterial] > raw[idx_viral] else idx_viral
            confidence = float(raw[class_idx])
        else:
            class_idx = idx_normal
            confidence = float(raw[idx_normal])

        # 3. Thông tin mức độ
        severity = self.get_severity(class_idx, confidence * 100)

        # 4. Tạo Heatmap + Bounding Boxes
        heatmap_base64 = None
        bounding_boxes = []

        if class_idx != 0 and self.last_conv_layer_name:
            heatmap = self.make_gradcam_heatmap(img_input, self.model, self.last_conv_layer_name, class_idx)
            if heatmap is not None:
                # ✅ Trích xuất bounding boxes từ heatmap
                bounding_boxes = self.extract_bounding_boxes(heatmap, original_width, original_height, threshold=0.5)
                print(f"--- BOUNDING BOXES: {bounding_boxes}")

                # Tạo heatmap overlay
                heatmap_uint8 = np.uint8(255 * heatmap)
                jet = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
                jet = cv2.resize(jet, (original_width, original_height))
                original_img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
                superimposed_img = cv2.addWeighted(original_img, 0.7, jet, 0.3, 0)
                _, buffer = cv2.imencode('.jpg', superimposed_img)
                heatmap_base64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "has_finding": class_idx != 0,
            "prediction": {
                "label_vi": self.labels[class_idx],
                "confidence": round(confidence * 100, 2)
            },
            "severity": severity,
            "summary": f"Kết quả: {self.labels[class_idx]}. Tình trạng: {severity['level']}.",
            "recommendation": severity['action'],
            "heatmap_base64": heatmap_base64,
            "bounding_boxes": bounding_boxes  # ✅ Thêm mới
        }
