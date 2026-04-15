from PIL import Image
from typing import List, Optional

DIMENSIONS = {
    "1:1": (1080, 1080),
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
}

LAYOUTS = [
    {"id": "grid_2x2", "label": "Grid 2×2", "description": "4 images in a 2×2 grid", "min_images": 4},
    {"id": "strip_3", "label": "3-Panel Strip", "description": "3 images stacked vertically", "min_images": 3},
    {"id": "featured", "label": "Featured", "description": "1 large top + 2 small bottom", "min_images": 2},
    {"id": "hero_center", "label": "Hero Center", "description": "1 large center + 4 small in corners", "min_images": 3},
    {"id": "hero_left", "label": "Hero Left", "description": "Hero 60% left + stacked right", "min_images": 2},
    {"id": "hero_top", "label": "Hero Top", "description": "Hero 65% top + 3 images bottom row", "min_images": 2},
    {"id": "mosaic", "label": "Mosaic", "description": "Asymmetric Pinterest-style layout", "min_images": 3},
    {"id": "filmstrip", "label": "Filmstrip", "description": "Horizontal strip of images side by side", "min_images": 2},
    {"id": "auto", "label": "Auto", "description": "Picks best layout based on format and image count", "min_images": 2},
]


def get_layouts():
    return LAYOUTS


def make_collage(
    image_paths: List[str],
    fmt: str,
    output_path: str,
    layout: str = "auto",
    hero_index: int = 0,
    gap: int = 4,
    bg_color: tuple = (0, 0, 0),
) -> str:
    """
    Compose a collage from a list of image paths.
    hero_index determines which image gets the prominent position.
    """
    w, h = DIMENSIONS.get(fmt, (1080, 1080))
    n = len(image_paths)

    # Reorder so hero image is first
    if 0 < hero_index < n:
        paths = [image_paths[hero_index]] + [p for i, p in enumerate(image_paths) if i != hero_index]
    else:
        paths = list(image_paths)

    if layout == "auto":
        if fmt == "1:1":
            layout = "grid_2x2" if n >= 4 else "featured"
        elif fmt == "9:16":
            layout = "strip_3" if n >= 3 else "hero_top"
        else:
            layout = "hero_left" if n >= 3 else "featured"

    canvas = Image.new("RGB", (w, h), bg_color)
    g = gap

    if layout == "grid_2x2":
        cw, ch = (w - g) // 2, (h - g) // 2
        imgs = [_load_fit(p, cw, ch) for p in paths[:4]]
        positions = [(0, 0), (cw + g, 0), (0, ch + g), (cw + g, ch + g)]
        for img, pos in zip(imgs, positions):
            canvas.paste(img, pos)

    elif layout == "strip_3":
        panel_h = (h - g * 2) // 3
        for i, p in enumerate(paths[:3]):
            img = _load_fit(p, w, panel_h)
            canvas.paste(img, (0, i * (panel_h + g)))

    elif layout == "featured":
        top_h = int((h - g) * 0.6)
        bot_h = h - top_h - g
        top = _load_fit(paths[0], w, top_h)
        canvas.paste(top, (0, 0))
        if n >= 2:
            count_bot = min(n - 1, 3)
            bot_w = (w - g * (count_bot - 1)) // count_bot
            for i, p in enumerate(paths[1 : 1 + count_bot]):
                img = _load_fit(p, bot_w, bot_h)
                canvas.paste(img, (i * (bot_w + g), top_h + g))

    elif layout == "hero_center":
        # Hero large center, small images in corners
        margin = int(w * 0.15)
        hero_w, hero_h = w - margin * 2, h - margin * 2
        hero = _load_fit(paths[0], hero_w, hero_h)
        canvas.paste(hero, (margin, margin))
        # Corner images
        cw, ch = margin - g, margin - g
        if cw > 20 and ch > 20:
            corners = [(0, 0), (w - cw, 0), (0, h - ch), (w - cw, h - ch)]
            for i, pos in enumerate(corners):
                if i + 1 < n:
                    img = _load_fit(paths[i + 1], cw, ch)
                    canvas.paste(img, pos)

    elif layout == "hero_left":
        hero_w = int((w - g) * 0.6)
        right_w = w - hero_w - g
        hero = _load_fit(paths[0], hero_w, h)
        canvas.paste(hero, (0, 0))
        # Stack images on the right
        count_right = min(n - 1, 3)
        if count_right > 0:
            rh = (h - g * (count_right - 1)) // count_right
            for i in range(count_right):
                img = _load_fit(paths[i + 1], right_w, rh)
                canvas.paste(img, (hero_w + g, i * (rh + g)))

    elif layout == "hero_top":
        hero_h = int((h - g) * 0.65)
        bot_h = h - hero_h - g
        hero = _load_fit(paths[0], w, hero_h)
        canvas.paste(hero, (0, 0))
        count_bot = min(n - 1, 3)
        if count_bot > 0:
            bw = (w - g * (count_bot - 1)) // count_bot
            for i in range(count_bot):
                img = _load_fit(paths[i + 1], bw, bot_h)
                canvas.paste(img, (i * (bw + g), hero_h + g))

    elif layout == "mosaic":
        # Asymmetric: hero takes left 60% full height, right side has 2 rows
        hero_w = int((w - g) * 0.6)
        right_w = w - hero_w - g
        hero = _load_fit(paths[0], hero_w, h)
        canvas.paste(hero, (0, 0))
        if n >= 2:
            top_rh = int((h - g) * 0.55)
            bot_rh = h - top_rh - g
            img1 = _load_fit(paths[1], right_w, top_rh)
            canvas.paste(img1, (hero_w + g, 0))
            if n >= 3:
                if n >= 4:
                    # Split bottom right into 2
                    half_w = (right_w - g) // 2
                    img2 = _load_fit(paths[2], half_w, bot_rh)
                    img3 = _load_fit(paths[3], half_w, bot_rh)
                    canvas.paste(img2, (hero_w + g, top_rh + g))
                    canvas.paste(img3, (hero_w + g + half_w + g, top_rh + g))
                else:
                    img2 = _load_fit(paths[2], right_w, bot_rh)
                    canvas.paste(img2, (hero_w + g, top_rh + g))

    elif layout == "filmstrip":
        # Horizontal strip — all images side by side
        count = min(n, 5)
        cell_w = (w - g * (count - 1)) // count
        for i in range(count):
            img = _load_fit(paths[i], cell_w, h)
            canvas.paste(img, (i * (cell_w + g), 0))

    canvas.save(output_path, quality=95)
    return output_path


def _load_fit(path: str, w: int, h: int) -> Image.Image:
    img = Image.open(path).convert("RGB")
    img = img.resize((w, h), Image.LANCZOS)
    return img
