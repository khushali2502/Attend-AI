# AttendAI AI Models Directory

This directory stores the deep learning models used by AttendAI for facial recognition and surveillance.

## Models Included

- **InsightFace `buffalo_l`**:
  - `1k3d68.onnx` (136.95 MB) - 3D facial landmark detection
  - `2d106det.onnx` (4.68 MB) - 2D 106-point landmark detection
  - `det_10g.onnx` (16.14 MB) - RetinaFace face detection model
  - `genderage.onnx` (1.32 MB) - Gender & age estimation
  - `w600k_r50.onnx` (166.31 MB) - ArcFace 512D face feature embedding model

## Why Models Are Excluded from Git

These models total over 300 MB, exceeding GitHub's 100 MB per-file upload limit. They are excluded via `.gitignore` to keep repository clones lightweight and avoid exceeding Git file size limits.

## Automatic Download

When you start the backend server with `insightface` installed in your Python environment:
1. `app.services.ai_service` automatically initializes `FaceAnalysis(name="buffalo_l", root=...)`.
2. InsightFace automatically downloads `buffalo_l.zip` and extracts the `.onnx` model files into:
   ```
   backend/models/models/buffalo_l/
   ```
3. If an internet connection is available on initial launch, no manual action is needed.

## Manual Download (Offline or Firewall Environments)

If your environment cannot download automatically:
1. Download `buffalo_l.zip` from the official InsightFace release mirrors:
   - [InsightFace Model Releases (GitHub / Google Drive)](https://github.com/deepinsight/insightface/tree/master/python-package#model-zoo)
2. Extract the archive into:
   ```
   backend/models/models/buffalo_l/
   ```
   Verify that `w600k_r50.onnx`, `det_10g.onnx`, and `1k3d68.onnx` are located directly inside `backend/models/models/buffalo_l/`.
