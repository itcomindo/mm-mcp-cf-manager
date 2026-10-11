"""One-off helper: redact sensitive text in README screenshots. Not part of app runtime."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "screenshots"
SRC_DIR = OUT_DIR / "source"

SS_SRC = SRC_DIR / "ss-original.png"
WARN_SRC = SRC_DIR / "windows-smartscreen-original.png"

# Full-window capture (root ss.png). Boxes are defined in this coordinate space.
APP_REF_SIZE = (1714, 918)

# Blur-only verification on top of a manually redacted ss-original (sidebar + domain rows).
APP_BLUR_BOXES: tuple[tuple[int, int, int, int], ...] = (
    (108, 172, 532, 868),  # sidebar domain labels
    (548, 100, 1480, 158),  # header opened zone + detail refresh line
    (640, 266, 1020, 312),  # overview "Domain" value
    (640, 368, 1040, 408),  # last zone sync (left column)
    (640, 412, 1040, 452),  # last detail refresh (left column)
    (1050, 368, 1600, 520),  # overview right-column sync / refresh timestamps
    (888, 528, 1320, 578),  # copy zone / account id buttons (ids in tooltips or labels)
)


def scale_box(
    box: tuple[int, int, int, int],
    size: tuple[int, int],
    ref: tuple[int, int],
) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = box
    sx = size[0] / ref[0]
    sy = size[1] / ref[1]
    return (int(x0 * sx), int(y0 * sy), int(x1 * sx), int(y1 * sy))


def blur_box(im: Image.Image, box: tuple[int, int, int, int], radius: int = 12) -> None:
    x0, y0, x1, y1 = box
    x0 = max(0, min(x0, im.width - 1))
    x1 = max(x0 + 1, min(x1, im.width))
    y0 = max(0, min(y0, im.height - 1))
    y1 = max(y0 + 1, min(y1, im.height))
    if x1 <= x0 or y1 <= y0:
        return
    region = im.crop((x0, y0, x1, y1))
    im.paste(region.filter(ImageFilter.GaussianBlur(radius)), (x0, y0))


def redact_app_screenshot(path_in: Path, path_out: Path) -> None:
    im = Image.open(path_in).convert("RGB")
    size = im.size
    for box in APP_BLUR_BOXES:
        blur_box(im, scale_box(box, size, APP_REF_SIZE), radius=16)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im.save(path_out, optimize=True)


def redact_smartscreen(path_in: Path, path_out: Path) -> None:
    im = Image.open(path_in).convert("RGB")
    blur_box(im, (72, 198, 520, 218), radius=10)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im.save(path_out, optimize=True)


def main() -> None:
    if not SS_SRC.exists():
        raise SystemExit(
            f"Missing {SS_SRC}. Copy ss.png to docs/screenshots/source/ss-original.png (do not commit).",
        )
    redact_app_screenshot(SS_SRC, OUT_DIR / "app-screenshot.png")
    if WARN_SRC.exists():
        redact_smartscreen(WARN_SRC, OUT_DIR / "windows-run-app-smartscreen-redacted.png")
    print(f"Wrote redacted screenshots under {OUT_DIR}")


if __name__ == "__main__":
    main()
