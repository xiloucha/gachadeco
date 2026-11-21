import { Injectable } from '@angular/core';
import {
  AspectRatioOption,
  BackgroundConfig,
  HeiseiPalette,
  PenConfig,
  PenType,
  Point,
  Stroke,
} from '../models/deco.model';

@Injectable({
  providedIn: 'root',
})
export class DecoEngineService {
  readonly aspectRatios: AspectRatioOption[] = [
    { id: '4:3', label: '4:3（お絵描き）', width: 640, height: 480 },
    { id: '3:4', label: '3:4（プリクラ・投稿）', width: 540, height: 720 },
    { id: '9:16', label: '9:16（スマホ待ち受け）', width: 480, height: 854 },
  ];

  readonly heiseiPalettes: HeiseiPalette[] = [
    { primary: '#FF1493', secondary: '#FFFFFF', name: '姫ピンク×白' },
    { primary: '#00FFFF', secondary: '#FF69B4', name: 'サイバー水色×ピンク' },
    { primary: '#FFFF00', secondary: '#FF4500', name: 'ギャルイエロー×オレンジ' },
    { primary: '#9400D3', secondary: '#00FF7F', name: '毒々パープル×ミント' },
    { primary: '#C0C0C0', secondary: '#000080', name: 'シルバー立体×ネイビー' },
    { primary: '#FF69B4', secondary: '#87CEFA', name: 'ゆめかわピンク×水色' },
    { primary: '#39FF14', secondary: '#000000', name: 'ネオングリーン×黒' },
    { primary: '#FF007F', secondary: '#FFD700', name: 'ゴージャスローズ×ゴールド' },
  ];

  readonly penTypes: { type: PenType; shortLabel: string; decoLabel: string }[] = [
    { type: 'normal', shortLabel: 'ノーマル', decoLabel: 'ノーマルペン' },
    { type: 'outline', shortLabel: '縁取り', decoLabel: 'プリクラ縁取りペン' },
    { type: 'polkadot', shortLabel: '水玉', decoLabel: 'ラブリー水玉ペン' },
    { type: 'stripe', shortLabel: 'ストライプ', decoLabel: 'ポップしましまペン' },
    { type: 'sparkle', shortLabel: 'キラキラ', decoLabel: '過剰キラキラペン★' },
    { type: 'neon', shortLabel: 'ネオン', decoLabel: 'ギラギラネオンペン' },
    { type: 'gradient', shortLabel: 'グラデ', decoLabel: '謎の虹色グラデペン' },
  ];

  private lastComboKey = '';

  getPenDecoLabel(type: PenType): string {
    return this.penTypes.find((p) => p.type === type)?.decoLabel ?? 'デコペン';
  }

  buildPenConfig(
    type: PenType,
    palette: HeiseiPalette,
    currentSize: number
  ): PenConfig {
    return {
      type,
      label: `${palette.name}の${this.getPenDecoLabel(type)}`,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      size: currentSize,
      isEraser: false,
    };
  }

  generateRandomPen(currentSize: number): PenConfig {
    let selectedType: PenType = 'sparkle';
    let selectedPalette = this.heiseiPalettes[0];
    let comboKey = '';

    for (let i = 0; i < 10; i++) {
      const typeItem = this.penTypes[Math.floor(Math.random() * this.penTypes.length)];
      selectedType = typeItem.type;
      selectedPalette =
        this.heiseiPalettes[Math.floor(Math.random() * this.heiseiPalettes.length)];
      comboKey = `${selectedType}-${selectedPalette.name}`;
      if (comboKey !== this.lastComboKey) {
        break;
      }
    }
    this.lastComboKey = comboKey;

    return this.buildPenConfig(selectedType, selectedPalette, currentSize);
  }

  renderAll(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bg: BackgroundConfig,
    strokes: Stroke[],
    uploadedImage: HTMLImageElement | null
  ): void {
    ctx.clearRect(0, 0, width, height);

    if (uploadedImage) {
      this.drawUploadedImageBackground(ctx, width, height, uploadedImage);
    } else {
      this.drawBackground(ctx, width, height, bg);
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    for (const stroke of strokes) {
      this.drawStroke(offCtx, stroke);
    }

    ctx.drawImage(offscreen, 0, 0);
  }

  private drawUploadedImageBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    img: HTMLImageElement
  ): void {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bg: BackgroundConfig
  ): void {
    ctx.save();

    switch (bg.type) {
      case 'solid':
        ctx.fillStyle = bg.primaryColor;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'gradient': {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, bg.primaryColor);
        grad.addColorStop(0.5, '#FFFFFF');
        grad.addColorStop(1, bg.secondaryColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        break;
      }

      case 'polkadot': {
        ctx.fillStyle = bg.primaryColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = bg.secondaryColor;
        const step = 36;
        for (let y = 0; y < height + step; y += step) {
          for (let x = 0; x < width + step; x += step) {
            const offsetX = (y / step) % 2 === 0 ? 0 : step / 2;
            ctx.beginPath();
            ctx.arc(x + offsetX, y, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'stripe': {
        const stripeWidth = 24;
        for (let x = -height; x < width + height; x += stripeWidth * 2) {
          ctx.fillStyle = bg.primaryColor;
          ctx.fillRect(x, 0, stripeWidth, height);
          ctx.fillStyle = bg.secondaryColor;
          ctx.fillRect(x + stripeWidth, 0, stripeWidth, height);
        }
        break;
      }

      case 'sparkle': {
        ctx.fillStyle = '#190033';
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 65; i++) {
          const x = ((i * 73) % 100) * (width / 100);
          const y = ((i * 137) % 100) * (height / 100);
          const r = (i % 3) * 3 + 4;
          const color = i % 2 === 0 ? '#FFFF00' : '#FF69B4';
          this.drawStar(ctx, x, y, r, color);
        }
        break;
      }

      case 'handwritten': {
        ctx.fillStyle = '#FFFDF5';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#ADD8E6';
        ctx.lineWidth = 1.5;
        for (let y = 32; y < height; y += 28) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.strokeStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.moveTo(36, 0);
        ctx.lineTo(36, height);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const { points, pen } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pen.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      this.tracePath(ctx, points);
      ctx.lineWidth = pen.size * 1.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    switch (pen.type) {
      case 'normal':
        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.primaryColor;
        ctx.lineWidth = pen.size;
        ctx.stroke();
        break;

      case 'outline':
        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.secondaryColor;
        ctx.lineWidth = pen.size + 8;
        ctx.stroke();

        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.primaryColor;
        ctx.lineWidth = pen.size;
        ctx.stroke();
        break;

      case 'polkadot':
        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.primaryColor;
        ctx.lineWidth = pen.size + 4;
        ctx.stroke();

        this.drawAlongPoints(ctx, points, pen.size + 6, (pt) => {
          ctx.fillStyle = pen.secondaryColor;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(2, pen.size * 0.35), 0, Math.PI * 2);
          ctx.fill();
        });
        break;

      case 'stripe':
        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.primaryColor;
        ctx.lineWidth = pen.size + 4;
        ctx.stroke();

        this.drawAlongPoints(ctx, points, pen.size * 0.9, (pt, angle) => {
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(angle);
          ctx.fillStyle = pen.secondaryColor;
          ctx.fillRect(-2, -(pen.size + 4) / 2, 4, pen.size + 4);
          ctx.restore();
        });
        break;

      case 'sparkle':
        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.primaryColor;
        ctx.lineWidth = pen.size;
        ctx.stroke();

        this.drawAlongPoints(ctx, points, pen.size * 1.4, (pt, _, idx) => {
          const offsetAngle = (stroke.seed + idx * 2.1) % (Math.PI * 2);
          const dist = pen.size * 0.9 + (idx % 3) * 5;
          const sx = pt.x + Math.cos(offsetAngle) * dist;
          const sy = pt.y + Math.sin(offsetAngle) * dist;
          const starColor = idx % 2 === 0 ? '#FFFF00' : pen.secondaryColor;
          this.drawStar(ctx, sx, sy, Math.max(5, pen.size * 0.6), starColor);
        });
        break;

      case 'neon':
        ctx.shadowColor = pen.primaryColor;
        ctx.shadowBlur = 18;
        this.tracePath(ctx, points);
        ctx.strokeStyle = pen.primaryColor;
        ctx.lineWidth = pen.size + 4;
        ctx.stroke();

        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2, pen.size * 0.45);
        ctx.stroke();
        break;

      case 'gradient': {
        const first = points[0];
        const last = points[points.length - 1];
        const grad = ctx.createLinearGradient(
          first.x,
          first.y,
          last.x === first.x ? first.x + 100 : last.x,
          last.y === first.y ? first.y + 100 : last.y
        );
        grad.addColorStop(0, '#FF0080');
        grad.addColorStop(0.25, '#FF8C00');
        grad.addColorStop(0.5, '#FFFF00');
        grad.addColorStop(0.75, '#00FF80');
        grad.addColorStop(1, '#00BFFF');

        this.tracePath(ctx, points);
        ctx.strokeStyle = grad;
        ctx.lineWidth = pen.size + 2;
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  private tracePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 1) {
      ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1);
      return;
    }
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }

  private drawAlongPoints(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    interval: number,
    callback: (pt: Point, angle: number, index: number) => void
  ): void {
    let accDist = 0;
    let stepIndex = 0;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      accDist += dist;
      if (accDist >= interval) {
        callback(p2, angle, stepIndex++);
        accDist = 0;
      }
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const inner = radius * 0.28;
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? radius : inner;
      const angle = (i * Math.PI) / 4;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
