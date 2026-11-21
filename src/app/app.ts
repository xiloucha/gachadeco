import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AspectRatioOption,
  BackgroundConfig,
  HeiseiPalette,
  PenConfig,
  PenType,
  Point,
  Stroke,
} from './models/deco.model';
import { DecoEngineService } from './services/deco-engine.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  private readonly decoEngine = inject(DecoEngineService);

  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('decoCanvas');

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;

  readonly aspectRatios = this.decoEngine.aspectRatios;
  readonly selectedRatio = signal<AspectRatioOption>(this.aspectRatios[0]);

  readonly strokes = signal<Stroke[]>([]);
  readonly redoStack = signal<Stroke[]>([]);
  private currentStroke: Stroke | null = null;

  readonly canUndo = computed(() => this.strokes().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  readonly uploadedImage = signal<HTMLImageElement | null>(null);
  readonly uploadedFileName = signal<string>('');

  readonly penTypes = this.decoEngine.penTypes;
  readonly heiseiPalettes = this.decoEngine.heiseiPalettes;
  readonly selectedPaletteName = signal<string>(this.heiseiPalettes[0].name);

  readonly currentPen = signal<PenConfig>({
    type: 'outline',
    label: '姫ピンク×白のプリクラ縁取りペン',
    primaryColor: '#FF1493',
    secondaryColor: '#FFFFFF',
    size: 10,
    isEraser: false,
  });

  readonly isGachaAnimating = signal(false);

  readonly presetColors = [
    '#FF1493',
    '#00FFFF',
    '#FFFF00',
    '#9400D3',
    '#39FF14',
    '#FF69B4',
    '#C0C0C0',
    '#000000',
  ];

  readonly backgrounds: BackgroundConfig[] = [
    { type: 'solid', label: '単色ピンク', primaryColor: '#FFE4E1', secondaryColor: '#FFFFFF' },
    { type: 'gradient', label: '平成グラデ', primaryColor: '#FF9A9E', secondaryColor: '#8FD3F4' },
    { type: 'polkadot', label: 'ラブリー水玉', primaryColor: '#FFB6C1', secondaryColor: '#FFFFFF' },
    { type: 'stripe', label: 'ポップしましま', primaryColor: '#E0FFFF', secondaryColor: '#FFFACD' },
    { type: 'sparkle', label: '夜空キラキラ★', primaryColor: '#190033', secondaryColor: '#FFFF00' },
    { type: 'handwritten', label: 'プロフ帳風', primaryColor: '#FFFDF5', secondaryColor: '#ADD8E6' },
  ];

  readonly currentBg = signal<BackgroundConfig>(this.backgrounds[1]);

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      this.ctx = context;
      this.redraw();
    }
  }

  selectAspectRatio(option: AspectRatioOption): void {
    this.selectedRatio.set(option);
    setTimeout(() => this.redraw());
  }

  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);

    this.isDrawing = true;
    const pt = this.getCanvasPoint(event);

    this.currentStroke = {
      id: crypto.randomUUID(),
      points: [pt],
      pen: { ...this.currentPen() },
      seed: Math.random() * 100,
    };

    this.strokes.update((list) => [...list, this.currentStroke!]);
    this.redoStack.set([]);
    this.redraw();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;
    event.preventDefault();

    const pt = this.getCanvasPoint(event);
    this.currentStroke.points.push(pt);
    this.redraw();
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.currentStroke = null;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }

  private getCanvasPoint(event: PointerEvent): Point {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  rollRandomPen(): void {
    const newPen = this.decoEngine.generateRandomPen(this.currentPen().size);
    this.currentPen.set(newPen);
    this.isGachaAnimating.set(true);
    setTimeout(() => this.isGachaAnimating.set(false), 350);
  }

  selectPenType(type: PenType): void {
    const activePalette =
      this.heiseiPalettes.find((p) => p.name === this.selectedPaletteName()) ??
      this.heiseiPalettes[0];

    this.currentPen.update((prev) => ({
      ...this.decoEngine.buildPenConfig(type, activePalette, prev.size),
      primaryColor: prev.primaryColor,
      secondaryColor: activePalette.secondary,
      isEraser: false,
    }));
  }

  selectHeiseiPalette(palette: HeiseiPalette): void {
    this.selectedPaletteName.set(palette.name);
    this.currentPen.update((prev) => ({
      ...prev,
      isEraser: false,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      label: `${palette.name}の${this.decoEngine.getPenDecoLabel(prev.type)}`,
    }));
  }

  setPenColor(color: string): void {
    this.currentPen.update((pen) => ({
      ...pen,
      isEraser: false,
      primaryColor: color,
    }));
  }

  setPenSize(event: Event): void {
    const size = Number((event.target as HTMLInputElement).value);
    this.currentPen.update((pen) => ({
      ...pen,
      size,
    }));
  }

  toggleEraser(): void {
    this.currentPen.update((pen) => ({
      ...pen,
      isEraser: !pen.isEraser,
    }));
  }

  undo(): void {
    const current = this.strokes();
    if (current.length === 0) return;

    const popped = current[current.length - 1];
    this.strokes.set(current.slice(0, -1));
    this.redoStack.update((stack) => [...stack, popped]);
    this.redraw();
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;

    const restored = stack[stack.length - 1];
    this.redoStack.set(stack.slice(0, -1));
    this.strokes.update((list) => [...list, restored]);
    this.redraw();
  }

  clearAll(): void {
    if (this.strokes().length === 0) return;
    if (confirm('描いた落書きを全部消してもいいカナ？(>_<)')) {
      this.strokes.set([]);
      this.redoStack.set([]);
      this.redraw();
    }
  }

  selectBackground(bg: BackgroundConfig): void {
    this.uploadedImage.set(null);
    this.uploadedFileName.set('');
    this.currentBg.set({ ...bg });
    this.redraw();
  }

  changeSolidBgColor(color: string): void {
    this.uploadedImage.set(null);
    this.uploadedFileName.set('');
    this.currentBg.set({
      type: 'solid',
      label: 'カスタム単色',
      primaryColor: color,
      secondaryColor: '#FFFFFF',
    });
    this.redraw();
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        this.uploadedImage.set(img);
        this.uploadedFileName.set(file.name);
        this.redraw();
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearUploadedImage(): void {
    this.uploadedImage.set(null);
    this.uploadedFileName.set('');
    this.redraw();
  }

  saveAsPng(): void {
    const canvas = this.canvasRef().nativeElement;
    const ratio = this.selectedRatio();
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    link.download = `gachadeco_${ratio.id.replace(':', 'x')}_${timestamp}.png`;
    link.href = dataUrl;
    link.click();
  }

  private redraw(): void {
    if (!this.ctx) return;
    const ratio = this.selectedRatio();
    this.decoEngine.renderAll(
      this.ctx,
      ratio.width,
      ratio.height,
      this.currentBg(),
      this.strokes(),
      this.uploadedImage()
    );
  }
}
