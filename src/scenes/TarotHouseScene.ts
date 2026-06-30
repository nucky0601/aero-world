import Phaser from "phaser";
import { TAROT_DECK } from "../data/tarot";
import type { TarotCard, TarotOrientation, TarotState } from "../types";

type ButtonContainer = Phaser.GameObjects.Container & {
  labelText?: Phaser.GameObjects.Text;
};

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

interface PlacedTarotCard {
  id: number;
  card: TarotCard;
  orientation: TarotOrientation;
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  hotspot: Phaser.GameObjects.Rectangle;
  label?: Phaser.GameObjects.Text;
  revealed: boolean;
  pointerId?: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: number;
}

interface DeckDragState {
  card: TarotCard;
  source: Phaser.GameObjects.Image;
  ghost?: Phaser.GameObjects.Image;
  startedCardDrag: boolean;
}

const CARD_WIDTH = 42;
const CARD_HEIGHT = 60;
const PLACED_CARD_WIDTH = 72;
const PLACED_CARD_HEIGHT = 104;

export class TarotHouseScene extends Phaser.Scene {
  private state: TarotState = "idle";
  private shuffledDeck: TarotCard[] = [...TAROT_DECK];
  private deckCards: Phaser.GameObjects.Image[] = [];
  private placedCards: PlacedTarotCard[] = [];
  private spreadContainer?: Phaser.GameObjects.Container;
  private readingPanel?: Phaser.GameObjects.Container;
  private dragArea!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private shuffleButton!: ButtonContainer;
  private motionButton!: ButtonContainer;
  private lastShakeAt = 0;
  private motionListening = false;
  private spreadOffset = 0;
  private minSpreadOffset = 0;
  private deckPointerId?: number;
  private deckDrag?: DeckDragState;
  private deckDragStartX = 0;
  private deckDragStartY = 0;
  private deckLastX = 0;
  private deckDragDistance = 0;
  private isScrollingDeck = false;
  private nextPlacedId = 1;
  private activePlacedCard?: PlacedTarotCard;
  private isLandscape = false;
  private deckLeft = 32;
  private deckRight = 508;
  private deckWidth = 476;
  private deckY = 802;
  private deckStartX = 53;
  private cardStep = 46;
  private tableBounds = new Phaser.Geom.Rectangle(54, 128, 432, 510);

  private readonly handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.motionListening || this.state === "shuffling") {
      return;
    }

    const acceleration = event.accelerationIncludingGravity;
    const strength = Math.abs(acceleration?.x ?? 0) + Math.abs(acceleration?.y ?? 0) + Math.abs(acceleration?.z ?? 0);
    const now = Date.now();

    if (strength > 30 && now - this.lastShakeAt > 1200) {
      this.lastShakeAt = now;
      this.startShuffle("摇晃完成，牌列正在展开");
    }
  };

  constructor() {
    super("TarotHouseScene");
  }

  create() {
    this.state = "idle";
    this.configureLayout();
    this.drawRoom();
    this.createHud();
    this.createTable();
    this.createDeckDragArea();

    window.addEventListener("devicemotion", this.handleDeviceMotion);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("devicemotion", this.handleDeviceMotion);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  update() {
    this.updateDeckMask();
  }

  private configureLayout() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.isLandscape = width >= height;
    this.deckLeft = this.isLandscape ? 40 : 32;
    this.deckRight = width - this.deckLeft;
    this.deckWidth = this.deckRight - this.deckLeft;
    this.deckY = height - (this.isLandscape ? 76 : 158);
    this.deckStartX = this.deckLeft + CARD_WIDTH / 2;
    this.cardStep = this.isLandscape ? 44 : 46;
    this.tableBounds = this.isLandscape
      ? new Phaser.Geom.Rectangle(60, 96, width - 120, Math.max(250, height - 228))
      : new Phaser.Geom.Rectangle(54, 128, 432, 510);
  }

  private handleResize() {
    const nextLandscape = this.scale.width >= this.scale.height;
    if (nextLandscape !== this.isLandscape) {
      this.scene.restart();
    }
  }

  private drawRoom() {
    const g = this.add.graphics();
    const width = this.scale.width;
    const height = this.scale.height;
    const headerHeight = this.isLandscape ? 72 : 86;
    g.fillStyle(0xd8fbff, 1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x8eeaff, 1);
    g.fillRect(0, 0, width, headerHeight);
    g.fillStyle(0xc8f9e5, 1);
    g.fillRect(0, headerHeight, width, height - headerHeight);

    for (let x = 0; x < width; x += 32) {
      for (let y = headerHeight; y < height; y += 32) {
        g.fillStyle((x / 32 + y / 32) % 2 === 0 ? 0xdffcff : 0xbdf3ff, 1);
        g.fillRect(x, y, 32, 32);
      }
    }

    g.fillStyle(0x58c7e8, 0.28);
    g.fillRoundedRect(this.tableBounds.x - 18, this.tableBounds.y - 18, this.tableBounds.width + 36, this.tableBounds.height + 36, 16);
    g.fillStyle(0xf7fbff, 1);
    g.fillRoundedRect(this.tableBounds.x, this.tableBounds.y, this.tableBounds.width, this.tableBounds.height, 14);
    g.fillStyle(0x9ef7ff, 1);
    g.fillRoundedRect(this.tableBounds.x + 14, this.tableBounds.y + 14, this.tableBounds.width - 28, this.tableBounds.height - 28, 10);
    g.lineStyle(2, 0x8df15f, 0.9);
    g.strokeRoundedRect(this.tableBounds.x + 14, this.tableBounds.y + 14, this.tableBounds.width - 28, this.tableBounds.height - 28, 10);

    g.fillStyle(0xffffff, 0.32);
    g.fillRect(this.tableBounds.x + 42, this.tableBounds.y + 40, this.tableBounds.width - 84, 2);
    g.fillRect(this.tableBounds.x + 42, this.tableBounds.y + 126, this.tableBounds.width - 84, 2);
    g.fillRect(this.tableBounds.x + 42, Math.min(this.tableBounds.y + 210, this.tableBounds.bottom - 42), this.tableBounds.width - 84, 2);

    g.fillStyle(0x42c9ff, 1);
    g.fillRect(this.tableBounds.left - 10, this.tableBounds.y + 26, 10, 42);
    g.fillRect(this.tableBounds.right, this.tableBounds.y + 26, 10, 42);
    g.fillStyle(0x8df15f, 1);
    g.fillCircle(this.tableBounds.left - 5, this.tableBounds.y + 18, 9);
    g.fillCircle(this.tableBounds.right + 5, this.tableBounds.y + 18, 9);

    g.fillStyle(0x12324a, 0.5);
    g.fillRoundedRect(this.deckLeft - 16, this.deckY - 46, this.deckWidth + 32, 92, 12);
    g.lineStyle(2, 0xb8f4ff, 0.88);
    g.strokeRoundedRect(this.deckLeft - 16, this.deckY - 46, this.deckWidth + 32, 92, 12);
  }

  private createHud() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.add
      .text(width / 2, this.isLandscape ? 24 : 28, "塔罗牌占卜屋", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: this.isLandscape ? "24px" : "28px",
        color: "#12324a"
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(width / 2, this.isLandscape ? 56 : 72, "洗牌后，把底部牌列中的牌拖到桌上，自由摆成牌阵", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: this.isLandscape ? "15px" : "17px",
        color: "#25618e",
        align: "center",
        wordWrap: { width: width - 40, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, height - (this.isLandscape ? 20 : 40), "准备好后开始洗牌", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: this.isLandscape ? "15px" : "18px",
        color: "#f8f1d0",
        backgroundColor: "#12324a",
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.shuffleButton = this.createButton(72, this.isLandscape ? 36 : 42, "洗牌", () => this.startShuffle("牌正在洗开"), 96);
    this.motionButton = this.createButton(196, this.isLandscape ? 36 : 42, "启用摇晃", () => void this.enableMotion(), 132);
    this.createButton(width - 78, this.isLandscape ? 36 : 42, "回社区", () => this.scene.start("TownScene", { spawnX: 172, spawnY: 260 }), 116);
  }

  private createTable() {
    this.add
      .rectangle(this.tableBounds.centerX, this.tableBounds.centerY, this.tableBounds.width, this.tableBounds.height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: false });

    this.add
      .text(this.tableBounds.centerX, this.tableBounds.y + 26, "牌桌", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "16px",
        color: "#2b2130"
      })
      .setOrigin(0.5);
  }

  private createDeckDragArea() {
    this.dragArea = this.add
      .rectangle((this.deckLeft + this.deckRight) / 2, this.deckY, this.deckWidth + 32, 92, 0xffffff, 0.001)
      .setDepth(450)
      .setInteractive({ useHandCursor: true });

    this.dragArea.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDeckScroll(pointer));
    this.dragArea.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateDeckPointer(pointer));
    this.dragArea.on("pointerup", (pointer: Phaser.Input.Pointer) => this.finishDeckPointer(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateDeckPointer(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.activePlacedCard) {
        this.movePlacedPointer(pointer, this.activePlacedCard);
      }
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.finishDeckPointer(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.activePlacedCard) {
        this.finishPlacedPointer(pointer, this.activePlacedCard);
      }
    });
    this.input.on(
      "wheel",
      (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
        if (this.state === "spread" && !this.readingPanel) {
          this.scrollDeck(-(deltaY || deltaX) * 0.65);
        }
      }
    );
  }

  private createButton(x: number, y: number, label: string, onClick: () => void, width = 132): ButtonContainer {
    let armed = false;
    const height = 42;
    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
    const bg = this.add.rectangle(0, 0, width, 42, 0x2aaeea, 0.95).setStrokeStyle(2, 0xf7fbff, 1);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "18px",
        color: "#f8f1d0"
      })
      .setOrigin(0.5);

    const button = this.add
      .container(x, y, [bg, text])
      .setSize(width, height)
      .setDepth(1200)
      .setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", () => {
        armed = true;
        bg.setFillStyle(0x83eaff, 1);
      }) as ButtonContainer;

    button.labelText = text;
    button.on("pointerover", () => bg.setFillStyle(0x61dfff, 1));
    button.on("pointerout", () => {
      armed = false;
      bg.setFillStyle(0x2aaeea, 0.95);
    });
    button.on("pointerup", () => {
      if (armed) {
        onClick();
      }
      armed = false;
      bg.setFillStyle(0x61dfff, 1);
    });
    button.on("pointerupoutside", () => {
      armed = false;
      bg.setFillStyle(0x2aaeea, 0.95);
    });
    return button;
  }

  private async enableMotion() {
    const motionConstructor = (window as unknown as { DeviceMotionEvent?: DeviceMotionEventWithPermission }).DeviceMotionEvent;

    try {
      if (motionConstructor?.requestPermission) {
        const result = await motionConstructor.requestPermission();
        if (result !== "granted") {
          this.setStatus("没有获得摇晃权限，仍可点击按钮洗牌");
          return;
        }
      }
      this.motionListening = true;
      this.motionButton.labelText?.setText("摇晃已启用");
      this.setStatus("摇晃手机即可洗牌，也可以继续用按钮");
    } catch {
      this.setStatus("浏览器没有开放摇晃权限，按钮洗牌仍可用");
    }
  }

  private startShuffle(message: string) {
    if (this.state === "shuffling") {
      return;
    }

    this.state = "shuffling";
    this.clearDeck();
    this.clearPlacedCards();
    this.clearReading();
    this.shuffledDeck = Phaser.Utils.Array.Shuffle([...TAROT_DECK]);
    this.setStatus(message);
    this.hintText.setText("洗牌中...");
    this.shuffleButton.labelText?.setText("重新洗牌");

    const centerX = this.scale.width / 2;
    const shuffleY = this.tableBounds.centerY;
    const tempCards = Array.from({ length: 10 }, (_, index) => {
      const card = this.add.image(centerX, shuffleY, "card-back").setDepth(700 + index).setAlpha(0.95);
      this.tweens.add({
        targets: card,
        x: centerX - 66 + index * 14,
        y: shuffleY - 42 + (index % 2) * 66,
        angle: index % 2 === 0 ? -14 : 14,
        duration: 220,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        delay: index * 25
      });
      return card;
    });

    this.time.delayedCall(940, () => {
      tempCards.forEach((card) => card.destroy());
      this.showHorizontalDeck();
    });
  }

  private showHorizontalDeck() {
    this.state = "spread";
    this.spreadOffset = 0;
    this.deckPointerId = undefined;
    this.deckDrag = undefined;
    this.deckDragDistance = 0;
    this.isScrollingDeck = false;
    this.minSpreadOffset = Math.min(0, this.deckWidth - (TAROT_DECK.length - 1) * this.cardStep - CARD_WIDTH);
    this.setStatus("底部牌列可左右滑动，把牌拖到桌上摆阵");
    this.hintText.setText("底部 78 张牌已对齐排开。拖牌到桌上，摆好后点击桌上的牌翻开。");

    this.spreadContainer = this.add.container(this.spreadOffset, 0).setDepth(500);
    this.deckCards = this.shuffledDeck.map((card, index) => {
      const x = this.deckStartX + index * this.cardStep;
      const sprite = this.add
        .image(this.scale.width / 2, this.deckY - 150, "card-back")
        .setAlpha(0)
        .setAngle(0)
        .setData("homeX", x)
        .setData("tarotCard", card)
        .setInteractive({ useHandCursor: true });

      sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDeckCardPointer(pointer, card, sprite));
      sprite.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateDeckPointer(pointer));
      sprite.on("pointerup", (pointer: Phaser.Input.Pointer) => this.finishDeckPointer(pointer));
      sprite.on("pointerover", () => {
        if (this.state === "spread" && !this.isScrollingDeck && !this.deckDrag?.startedCardDrag) {
          sprite.setScale(1.06);
        }
      });
      sprite.on("pointerout", () => {
        if (sprite.input?.enabled) {
          sprite.setScale(1);
        }
      });

      this.spreadContainer?.add(sprite);
      this.tweens.add({
        targets: sprite,
        x,
        y: this.deckY,
        alpha: 1,
        duration: 260,
        delay: index * 3,
        ease: "Cubic.easeOut"
      });
      return sprite;
    });
  }

  private beginDeckScroll(pointer: Phaser.Input.Pointer) {
    if (this.state !== "spread" || this.deckPointerId !== undefined || this.readingPanel) {
      return;
    }

    this.deckPointerId = pointer.id;
    this.deckDragStartX = pointer.x;
    this.deckDragStartY = pointer.y;
    this.deckLastX = pointer.x;
    this.deckDragDistance = 0;
    this.isScrollingDeck = true;
  }

  private beginDeckCardPointer(pointer: Phaser.Input.Pointer, card: TarotCard, source: Phaser.GameObjects.Image) {
    if (this.state !== "spread" || this.deckPointerId !== undefined || this.readingPanel || !source.input?.enabled) {
      return;
    }

    this.deckPointerId = pointer.id;
    this.deckDragStartX = pointer.x;
    this.deckDragStartY = pointer.y;
    this.deckLastX = pointer.x;
    this.deckDragDistance = 0;
    this.isScrollingDeck = false;
    this.deckDrag = { card, source, startedCardDrag: false };
    source.setScale(1.08);
  }

  private updateDeckPointer(pointer: Phaser.Input.Pointer) {
    if (this.state !== "spread" || pointer.id !== this.deckPointerId || this.readingPanel) {
      return;
    }

    const dx = pointer.x - this.deckLastX;
    const totalX = pointer.x - this.deckDragStartX;
    const totalY = pointer.y - this.deckDragStartY;
    this.deckLastX = pointer.x;
    this.deckDragDistance = Math.max(this.deckDragDistance, Math.hypot(totalX, totalY));

    if (this.deckDrag) {
      if (!this.deckDrag.startedCardDrag && Math.abs(totalX) > 8 && Math.abs(totalX) > Math.abs(totalY)) {
        this.isScrollingDeck = true;
      }

      if (!this.deckDrag.startedCardDrag && totalY < -14 && Math.abs(totalY) > Math.abs(totalX) * 0.7) {
        this.beginCardDragFromDeck(pointer);
      }

      if (this.deckDrag.startedCardDrag && this.deckDrag.ghost) {
        this.deckDrag.ghost.setPosition(pointer.x, pointer.y);
        return;
      }
    }

    if (this.isScrollingDeck) {
      this.deckCards.forEach((sprite) => {
        if (sprite.input?.enabled) {
          sprite.setScale(1);
        }
      });
      this.scrollDeck(dx);
    }
  }

  private beginCardDragFromDeck(pointer: Phaser.Input.Pointer) {
    if (!this.deckDrag || this.deckDrag.startedCardDrag) {
      return;
    }

    this.deckDrag.startedCardDrag = true;
    this.isScrollingDeck = false;
    this.deckDrag.source.setAlpha(0.42).setScale(1);
    this.deckDrag.ghost = this.add
      .image(pointer.x, pointer.y, "card-back")
      .setDisplaySize(PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT)
      .setDepth(980)
      .setAlpha(0.96);
    this.setStatus("把牌放到桌面任意位置");
  }

  private finishDeckPointer(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.deckPointerId) {
      return;
    }

    const drag = this.deckDrag;
    this.deckPointerId = undefined;

    if (drag?.startedCardDrag) {
      if (Phaser.Geom.Rectangle.Contains(this.tableBounds, pointer.x, pointer.y)) {
        this.placeCardFromDeck(drag.card, drag.source, pointer.x, pointer.y);
      } else {
        drag.source.setAlpha(1).setScale(1);
        drag.ghost?.destroy();
        this.setStatus("牌没有放到桌上，已回到牌列");
      }
      this.deckDrag = undefined;
      return;
    }

    if (drag && this.deckDragDistance <= 8) {
      const slot = this.getNextAutoSlot();
      this.placeCardFromDeck(drag.card, drag.source, slot.x, slot.y);
    }

    this.deckDrag?.source.setScale(1);
    this.deckDrag = undefined;
    this.time.delayedCall(30, () => {
      this.isScrollingDeck = false;
    });
  }

  private scrollDeck(deltaX: number) {
    if (!this.spreadContainer) {
      return;
    }

    this.spreadOffset = Phaser.Math.Clamp(this.spreadOffset + deltaX, this.minSpreadOffset, 0);
    this.spreadContainer.x = this.spreadOffset;
  }

  private placeCardFromDeck(card: TarotCard, source: Phaser.GameObjects.Image, x: number, y: number) {
    source.disableInteractive();
    source.setAlpha(0.16).setScale(1).setTint(0x6b5f78);
    this.deckDrag?.ghost?.destroy();

    const position = this.clampToTable(x, y);
    const image = this.add.image(0, 0, "card-back").setDisplaySize(PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT);
    const hotspot = this.add
      .rectangle(0, 0, PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT, 0xffffff, 0.001)
      .setInteractive(new Phaser.Geom.Rectangle(-PLACED_CARD_WIDTH / 2, -PLACED_CARD_HEIGHT / 2, PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT), Phaser.Geom.Rectangle.Contains);
    const container = this.add
      .container(position.x, position.y, [image, hotspot])
      .setDepth(820 + this.nextPlacedId)
      .setSize(PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT);

    const placed: PlacedTarotCard = {
      id: this.nextPlacedId++,
      card,
      orientation: Phaser.Math.Between(0, 1) === 0 ? "upright" : "reversed",
      container,
      image,
      hotspot,
      revealed: false,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      moved: 0
    };

    this.placedCards.push(placed);
    this.attachPlacedCardInput(placed);
    this.setStatus("牌已放到桌上，可拖动摆位，也可点击翻牌");
    this.hintText.setText("可以继续从底部抽牌。桌上的牌能任意拖动，点击背面牌翻开。");
  }

  private attachPlacedCardInput(placed: PlacedTarotCard) {
    placed.hotspot.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.readingPanel || placed.pointerId !== undefined) {
        return;
      }
      placed.pointerId = pointer.id;
      placed.startX = pointer.x;
      placed.startY = pointer.y;
      placed.originX = placed.container.x;
      placed.originY = placed.container.y;
      placed.moved = 0;
      this.activePlacedCard = placed;
      placed.container.setDepth(980 + placed.id);
    });

    placed.hotspot.on("pointermove", (pointer: Phaser.Input.Pointer) => this.movePlacedPointer(pointer, placed));

    placed.hotspot.on("pointerup", (pointer: Phaser.Input.Pointer) => this.finishPlacedPointer(pointer, placed));
  }

  private movePlacedPointer(pointer: Phaser.Input.Pointer, placed: PlacedTarotCard) {
    if (pointer.id !== placed.pointerId || this.readingPanel) {
      return;
    }

    const dx = pointer.x - placed.startX;
    const dy = pointer.y - placed.startY;
    placed.moved = Math.max(placed.moved, Math.hypot(dx, dy));

    if (placed.moved > 4) {
      const next = this.clampToTable(placed.originX + dx, placed.originY + dy);
      placed.container.setPosition(next.x, next.y);
    }
  }

  private finishPlacedPointer(pointer: Phaser.Input.Pointer, placed: PlacedTarotCard) {
    if (pointer.id !== placed.pointerId) {
      return;
    }

    placed.pointerId = undefined;
    this.activePlacedCard = undefined;
    if (placed.moved > 6) {
      this.setStatus("牌阵位置已调整");
      return;
    }

    if (!placed.revealed) {
      this.flipPlacedCard(placed);
      return;
    }

    this.showReading(placed);
  }

  private flipPlacedCard(placed: PlacedTarotCard) {
    placed.revealed = true;
    placed.hotspot.disableInteractive();
    const orientationLabel = this.getOrientationLabel(placed.orientation);
    this.setStatus(`${placed.card.name} ${orientationLabel}已翻开，再点击查看牌义`);
    this.hintText.setText("翻开的牌仍可拖动摆位。再次点击它，可以查看这张牌的正逆位牌义。");

    this.tweens.add({
      targets: placed.image,
      scaleX: 0.03,
      duration: 150,
      ease: "Cubic.easeIn",
      onComplete: () => {
        placed.image.setTexture("card-face-large");
        placed.image.setDisplaySize(PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT);
        placed.image.setAngle(placed.orientation === "reversed" ? 180 : 0);
        const targetScaleX = placed.image.scaleX;
        placed.image.scaleX = 0.03;
        this.addPlacedCardLabel(placed);
        this.tweens.add({
          targets: placed.image,
          scaleX: targetScaleX,
          duration: 170,
          ease: "Back.easeOut",
          onComplete: () => {
            placed.hotspot.setInteractive(
              new Phaser.Geom.Rectangle(-PLACED_CARD_WIDTH / 2, -PLACED_CARD_HEIGHT / 2, PLACED_CARD_WIDTH, PLACED_CARD_HEIGHT),
              Phaser.Geom.Rectangle.Contains
            );
            placed.container.bringToTop(placed.hotspot);
          }
        });
      }
    });
  }

  private addPlacedCardLabel(placed: PlacedTarotCard) {
    placed.label?.destroy();
    placed.label = this.add
      .text(0, 28, `${placed.card.name}\n${this.getOrientationLabel(placed.orientation)}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "12px",
        color: "#2b2130",
        fixedWidth: PLACED_CARD_WIDTH - 10,
        align: "center"
      })
      .setOrigin(0.5);
    placed.container.add(placed.label);
    placed.container.bringToTop(placed.hotspot);
  }

  private showReading(placed: PlacedTarotCard) {
    if (!placed.revealed || this.readingPanel) {
      return;
    }

    this.state = "revealed";
    const card = placed.card;
    const orientationLabel = this.getOrientationLabel(placed.orientation);
    const meaning = this.getMeaning(placed);
    this.setStatus(`${card.name} ${orientationLabel}的牌义已经展开`);
    this.hintText.setText("收起牌义后，可以继续摆牌、抽牌或翻其他牌。");

    const panelBg = this.add.rectangle(0, 0, 500, 360, 0x12324a, 0.94).setStrokeStyle(2, 0x8df15f, 1).setInteractive();
    const face = this.add.image(-168, -34, "card-face-large").setAngle(placed.orientation === "reversed" ? 180 : 0);
    const cardName = this.add
      .text(-168, 54, `${card.name}\n${orientationLabel}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "16px",
        color: "#2b2130",
        fixedWidth: 76,
        align: "center"
      })
      .setOrigin(0.5);
    const title = this.add
      .text(-104, -144, `${card.name} · ${orientationLabel}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "24px",
        color: "#f8f1d0"
      })
      .setOrigin(0, 0.5);
    const keywords = this.add
      .text(-104, -102, `关键词：${meaning.keywords.join(" / ")}`, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "16px",
        color: "#f0cf6b"
      })
      .setOrigin(0, 0.5);
    const reading = this.add
      .text(-104, -62, meaning.reading, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "18px",
        color: "#f8f1d0",
        wordWrap: { width: 320, useAdvancedWrap: true },
        lineSpacing: 7
      })
      .setOrigin(0, 0);
    const reshuffle = this.createButton(-72, 146, "重新洗牌", () => this.startShuffle("牌正在重新洗开"), 140);
    const close = this.createButton(100, 146, "收起牌义", () => this.hideReadingPanel(), 140);

    this.readingPanel = this.add
      .container(this.scale.width / 2, this.scale.height / 2 + 10, [panelBg, face, cardName, title, keywords, reading, reshuffle, close])
      .setDepth(1200)
      .setAlpha(0);

    this.tweens.add({
      targets: this.readingPanel,
      alpha: 1,
      y: this.scale.height / 2,
      duration: 220,
      ease: "Cubic.easeOut"
    });
  }

  private hideReadingPanel() {
    this.clearReading();
    this.state = "spread";
    this.setStatus("牌义已收起，可以继续摆牌阵");
    this.hintText.setText("继续从底部抽牌，或拖动桌上的牌调整牌阵。");
  }

  private getNextAutoSlot() {
    const count = this.placedCards.length;
    const col = count % 5;
    const row = Math.floor(count / 5) % 4;
    return {
      x: this.tableBounds.x + 56 + col * 80,
      y: this.tableBounds.y + 70 + row * 108
    };
  }

  private clampToTable(x: number, y: number) {
    return {
      x: Phaser.Math.Clamp(x, this.tableBounds.left + PLACED_CARD_WIDTH / 2, this.tableBounds.right - PLACED_CARD_WIDTH / 2),
      y: Phaser.Math.Clamp(y, this.tableBounds.top + PLACED_CARD_HEIGHT / 2, this.tableBounds.bottom - PLACED_CARD_HEIGHT / 2)
    };
  }

  private clearDeck() {
    this.deckCards = [];
    this.spreadContainer?.destroy(true);
    this.spreadContainer = undefined;
    this.deckDrag?.ghost?.destroy();
    this.deckDrag = undefined;
  }

  private clearPlacedCards() {
    this.placedCards.forEach((placed) => placed.container.destroy(true));
    this.placedCards = [];
    this.nextPlacedId = 1;
  }

  private clearReading() {
    this.readingPanel?.destroy(true);
    this.readingPanel = undefined;
  }

  private updateDeckMask() {
    if (!this.spreadContainer) {
      return;
    }

    this.spreadContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (!(child instanceof Phaser.GameObjects.Image)) {
        return;
      }

      const worldX = this.spreadContainer!.x + child.x;
      child.setVisible(worldX > this.deckLeft - 70 && worldX < this.deckRight + 70);
    });
  }

  private getMeaning(placed: PlacedTarotCard) {
    return placed.orientation === "upright" ? placed.card.upright : placed.card.reversed;
  }

  private getOrientationLabel(orientation: TarotOrientation) {
    return orientation === "upright" ? "正位" : "逆位";
  }

  private setStatus(message: string) {
    this.statusText.setText(message);
  }
}
