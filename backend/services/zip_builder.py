import zipfile
import os
from typing import List


def build_zip(file_paths: List[str], zip_path: str) -> str:
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fp in file_paths:
            if os.path.exists(fp):
                zf.write(fp, os.path.basename(fp))
    return zip_path
