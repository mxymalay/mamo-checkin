"""Generate packaged, deterministic OCR practice images. No runtime dependency."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).resolve().parents[1] / 'extension/source-rules/practice/assets'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 28)
bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 30)
rows = {
    'attendance': ('Applied', 'Wednesday, 23 Sep 2026', '01', '6:00PM', '8YG3G'),
    'second': ('Workshop', 'Monday, 21 Sep 2026', '01', '6:00PM', '2GDTP'),
    'quoted': ('Applied', 'Wednesday, 16 Sep 2026', '01', '6:00PM', 'AB123'),
}
for name, values in rows.items():
    image = Image.new('RGB', (1160, 160), '#f1f5f7')
    draw = ImageDraw.Draw(image)
    for x, label in zip([24, 220, 650, 760, 1000], ['Session', 'Date', 'Group', 'Time', 'Code']):
        draw.text((x, 20), label, font=font, fill='#586d7b')
    for x, value in zip([24, 220, 650, 760, 1000], values):
        draw.text((x, 90), value, font=bold if x == 1000 else font, fill='#172d3a')
    image.save(out / (name + '.png'))
image = Image.new('RGB', (1160, 140), '#e7f1ea')
draw = ImageDraw.Draw(image)
draw.text((30, 35), 'DEMO1000 - Course announcement', font=bold, fill='#245341')
draw.text((30, 85), 'The next workshop starts at 6:00PM.', font=font, fill='#245341')
image.save(out / 'unrelated.png')
