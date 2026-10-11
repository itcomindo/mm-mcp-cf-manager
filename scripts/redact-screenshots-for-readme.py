"""One-off helper: redact sensitive text in README screenshots. Not part of app runtime."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "screenshots"
SRC_DIR = OUT_DIR / "source"

UI_SRC = SRC_DIR / "app-ui-original.png"
WARN_SRC = SRC_DIR / "windows-smartscreen-original.png"


def blur_box(im: Image.Image, box: tuple[int, int, int, int], radius: int = 12) -> None:
    x0, y0, x1, y1 = box
    region = im.crop((x0, y0, x1, y1))
    im.paste(region.filter(ImageFilter.GaussianBlur(radius)), (x0, y0))


def fill_box(im: Image.Image, box: tuple[int, int, int, int], fill: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(im)
    draw.rectangle(box, fill=fill)


def label(im: Image.Image, xy: tuple[int, int], text: str, fill: tuple[int, int, int] = (148, 163, 184)) -> None:
    draw = ImageDraw.Draw(im)
    draw.text(xy, text, fill=fill)


def redact_ui(path_in: Path, path_out: Path) -> None:
    im = Image.open(path_in).convert("RGB")
    sidebar_fill = im.getpixel((60, 130))
    main_fill = im.getpixel((400, 200))
    header_fill = im.getpixel((400, 60))

    # Sidebar domain labels (checkboxes stay visible; cover hostname text through FREE badges)
    fill_box(im, (68, 108, 292, 536), sidebar_fill)
    sample_domains = [
        "example-alpha.test",
        "example-bravo.test",
        "example-charlie.test",
        "example-delta.test",
        "example-echo.test",
        "example-foxtrot.test",
        "example-golf.test",
        "example-hotel.test",
    ]
    y = 118
    for name in sample_domains:
        label(im, (52, y), name)
        y += 28

    # Main header + overview hostname fields
    fill_box(im, (332, 52, 820, 86), header_fill)
    label(im, (336, 56), "Opened: example-zone.test")
    label(im, (336, 72), "Last detail refresh: (sample timestamp)")

    fill_box(im, (388, 196, 620, 214), main_fill)
    label(im, (392, 198), "example-zone.test")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im.save(path_out, optimize=True)


def redact_smartscreen(path_in: Path, path_out: Path) -> None:
    im = Image.open(path_in).convert("RGB")
    # "From:" path line (Windows username / folder)
    blur_box(im, (72, 198, 520, 218), radius=10)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im.save(path_out, optimize=True)


def main() -> None:
    redact_ui(UI_SRC, OUT_DIR / "app-overview-redacted.png")
    if WARN_SRC.exists():
        redact_smartscreen(WARN_SRC, OUT_DIR / "windows-run-app-smartscreen-redacted.png")
    print(f"Wrote redacted screenshots under {OUT_DIR}")


if __name__ == "__main__":
    main()
