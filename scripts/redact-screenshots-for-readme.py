"""One-off helper: redact sensitive text in README screenshots. Not part of app runtime."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "screenshots"
SRC_DIR = OUT_DIR / "source"

SS_SRC = SRC_DIR / "ss-original.png"
WARN_SRC = SRC_DIR / "windows-smartscreen-original.png"

# Layout reference size (first full-window capture); boxes scale to actual image size.
REF_SIZE = (1024, 548)


def scale_box(
    box: tuple[int, int, int, int],
    size: tuple[int, int],
    ref: tuple[int, int] = REF_SIZE,
) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = box
    sx = size[0] / ref[0]
    sy = size[1] / ref[1]
    return (int(x0 * sx), int(y0 * sy), int(x1 * sx), int(y1 * sy))


def blur_box(im: Image.Image, box: tuple[int, int, int, int], radius: int = 12) -> None:
    x0, y0, x1, y1 = box
    if x1 <= x0 or y1 <= y0:
        return
    region = im.crop((x0, y0, x1, y1))
    im.paste(region.filter(ImageFilter.GaussianBlur(radius)), (x0, y0))


def fill_box(im: Image.Image, box: tuple[int, int, int, int], fill: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(im)
    draw.rectangle(box, fill=fill)


def label(
    im: Image.Image,
    xy: tuple[int, int],
    text: str,
    fill: tuple[int, int, int] = (148, 163, 184),
) -> None:
    draw = ImageDraw.Draw(im)
    draw.text(xy, text, fill=fill)


def redact_app_screenshot(path_in: Path, path_out: Path) -> None:
    im = Image.open(path_in).convert("RGB")
    w, h = im.size

    # Sample from chrome areas (avoid blurred domain pixels in ss-original)
    sidebar_fill = im.getpixel(scale_box((24, 200, 25, 201), (w, h))[:2])
    main_fill = im.getpixel(scale_box((520, 320, 521, 321), (w, h))[:2])
    header_fill = im.getpixel(scale_box((520, 100, 521, 101), (w, h))[:2])

    # Sidebar domain names (between checkbox and FREE/UAM badges)
    fill_box(im, scale_box((68, 108, 292, 536), (w, h)), sidebar_fill)
    sample_domains = [
        "example-alpha.test",
        "example-bravo.test",
        "example-charlie.test",
        "example-delta.test",
        "example-echo.test",
        "example-foxtrot.test",
        "example-golf.test",
        "example-hotel.test",
        "example-india.test",
        "example-juliet.test",
        "example-kilo.test",
        "example-lima.test",
    ]
    y0 = scale_box((52, 118, 53, 119), (w, h))[1]
    step = max(22, scale_box((52, 146, 53, 147), (w, h))[1] - y0)
    x_label = scale_box((52, 118, 53, 119), (w, h))[0]
    y = y0
    for name in sample_domains:
        if y > h - 40:
            break
        label(im, (x_label, y), name)
        y += step

    # Main header "Opened:" + detail refresh line
    fill_box(im, scale_box((332, 52, 980, 88), (w, h)), header_fill)
    hx = scale_box((336, 56, 337, 57), (w, h))[0]
    hy = scale_box((336, 56, 337, 57), (w, h))[1]
    label(im, (hx, hy), "Opened: example-zone.test")
    label(im, (hx, hy + step), "Last detail refresh: (sample timestamp)")

    # Overview "Domain" value (left column)
    fill_box(im, scale_box((388, 196, 640, 218), (w, h)), main_fill)
    label(im, scale_box((392, 198, 393, 199), (w, h))[:2], "example-zone.test")

    # ISO timestamps in overview (optional metadata redaction)
    blur_box(im, scale_box((388, 248, 720, 272), (w, h)), radius=14)
    blur_box(im, scale_box((900, 248, 1180, 272), (w, h)), radius=14)
    blur_box(im, scale_box((900, 320, 1180, 344), (w, h)), radius=14)
    fill_box(im, scale_box((900, 318, 1210, 348), (w, h)), main_fill)
    label(im, scale_box((908, 324, 909, 325), (w, h))[:2], "(sample sync time)")

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
