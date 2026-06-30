import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.createPlayerTexture();
    this.createBuildingTextures();
    this.createDecorTextures();
    this.createCardTextures();
    this.scene.start("TownScene", { spawnX: 514, spawnY: 364 });
  }

  private createPlayerTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x19324f, 1);
    g.fillRect(6, 0, 12, 8);
    g.fillStyle(0xf2c5a0, 1);
    g.fillRect(5, 6, 14, 10);
    g.fillStyle(0x244a6c, 1);
    g.fillRect(4, 4, 16, 5);
    g.fillStyle(0xf7fbff, 1);
    g.fillRect(4, 15, 16, 11);
    g.fillStyle(0x29cfe2, 1);
    g.fillRect(6, 16, 12, 3);
    g.fillStyle(0x83f15f, 1);
    g.fillRect(9, 19, 6, 3);
    g.fillStyle(0x25618e, 1);
    g.fillRect(4, 25, 6, 5);
    g.fillRect(14, 25, 6, 5);
    g.fillStyle(0x153048, 1);
    g.fillRect(8, 10, 2, 2);
    g.fillRect(15, 10, 2, 2);
    g.fillStyle(0xbff6ff, 1);
    g.fillRect(6, 15, 4, 1);
    g.generateTexture("player", 24, 30);
    g.destroy();
  }

  private createBuildingTextures() {
    this.createBuildingTexture("building-tarot", 152, 132, 0xb8f4ff, 0x4ec5ff, 0xb064ff);
    this.createBuildingTexture("building-bakery", 136, 112, 0xcffff7, 0x62d4ff, 0x8cf15e);
    this.createBuildingTexture("building-library", 142, 116, 0xdaf8ff, 0x7fbfff, 0x58f0c7);
    this.createBuildingTexture("building-atelier", 150, 116, 0xe5fff8, 0x6fd5c6, 0x9cf35a);
    this.createBuildingTexture("building-cafe", 146, 120, 0xd8f7ff, 0x6dbdff, 0xfff26e);
  }

  private createBuildingTexture(key: string, width: number, height: number, glass: number, panel: number, accent: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x5d9fc8, 0.28);
    g.fillEllipse(width / 2, height - 8, width - 10, 16);

    g.fillStyle(0xf7fbff, 1);
    g.fillRoundedRect(18, 42, width - 36, height - 50, 16);
    g.fillStyle(0xd7f5ff, 1);
    g.fillRoundedRect(24, 50, width - 48, height - 64, 12);
    g.fillStyle(glass, 0.95);
    g.fillRoundedRect(30, 14, width - 60, 58, 24);
    g.fillStyle(panel, 0.9);
    g.fillRoundedRect(36, 58, width - 72, 34, 10);

    g.fillStyle(0xffffff, 0.82);
    g.fillRect(38, 20, width - 90, 5);
    g.fillRect(42, 28, 18, 3);
    g.fillStyle(0x9cefff, 0.85);
    g.fillRect(width - 58, 26, 22, 4);

    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(32, 82, 24, 22, 6);
    g.fillRoundedRect(width - 56, 82, 24, 22, 6);
    g.fillStyle(0x85e8ff, 0.85);
    g.fillRect(36, 88, 16, 5);
    g.fillRect(width - 52, 88, 16, 5);

    g.fillStyle(0xeefbff, 1);
    g.fillRoundedRect(width / 2 - 17, height - 42, 34, 36, 8);
    g.fillStyle(0x42c9ff, 1);
    g.fillRoundedRect(width / 2 - 10, height - 35, 20, 25, 5);
    g.fillStyle(accent, 1);
    g.fillRoundedRect(width / 2 - 34, 48, 68, 17, 8);
    g.fillStyle(0xffffff, 0.92);
    g.fillCircle(width / 2 - 20, 56, 3);
    g.fillCircle(width / 2 + 20, 56, 3);
    g.lineStyle(2, 0xffffff, 0.95);
    g.strokeRoundedRect(18, 42, width - 36, height - 50, 16);
    g.lineStyle(2, 0x4edcff, 0.55);
    g.strokeRoundedRect(30, 14, width - 60, 58, 24);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private createDecorTextures() {
    const tree = this.make.graphics({ x: 0, y: 0 }, false);
    tree.fillStyle(0x6bd481, 1);
    tree.fillRoundedRect(13, 22, 7, 17, 3);
    tree.fillStyle(0xcaf8ff, 0.95);
    tree.fillCircle(16, 13, 13);
    tree.fillStyle(0x7df06d, 0.85);
    tree.fillCircle(8, 19, 8);
    tree.fillStyle(0x54d8ff, 0.8);
    tree.fillCircle(24, 19, 8);
    tree.fillStyle(0xffffff, 0.9);
    tree.fillCircle(10, 10, 3);
    tree.generateTexture("tree", 32, 40);
    tree.destroy();

    const flower = this.make.graphics({ x: 0, y: 0 }, false);
    flower.fillStyle(0x5df08b, 1);
    flower.fillRect(6, 7, 2, 8);
    flower.fillStyle(0xbffaff, 0.95);
    flower.fillCircle(7, 5, 5);
    flower.fillStyle(0x7af5ff, 0.9);
    flower.fillCircle(4, 8, 3);
    flower.fillCircle(10, 8, 3);
    flower.fillStyle(0xffffff, 1);
    flower.fillCircle(5, 4, 1);
    flower.generateTexture("flower", 14, 16);
    flower.destroy();
  }

  private createCardTextures() {
    const back = this.make.graphics({ x: 0, y: 0 }, false);
    back.fillStyle(0x12324a, 1);
    back.fillRoundedRect(0, 0, 42, 60, 4);
    back.fillStyle(0xb8f4ff, 1);
    back.fillRoundedRect(3, 3, 36, 54, 3);
    back.lineStyle(2, 0x31d7ff, 1);
    back.strokeRoundedRect(6, 7, 30, 46, 2);
    back.fillStyle(0x8df15f, 1);
    back.fillCircle(21, 30, 5);
    back.fillStyle(0xffffff, 0.9);
    back.fillRect(11, 14, 12, 2);
    back.generateTexture("card-back", 42, 60);
    back.destroy();

    const face = this.make.graphics({ x: 0, y: 0 }, false);
    face.fillStyle(0x12324a, 1);
    face.fillRoundedRect(0, 0, 86, 124, 6);
    face.fillStyle(0xf7fbff, 1);
    face.fillRoundedRect(4, 4, 78, 116, 4);
    face.lineStyle(2, 0x42c9ff, 1);
    face.strokeRoundedRect(10, 10, 66, 104, 3);
    face.fillStyle(0xb8f4ff, 1);
    face.fillCircle(43, 46, 18);
    face.fillStyle(0x8df15f, 1);
    face.fillCircle(43, 46, 8);
    face.fillStyle(0x2d7eb2, 1);
    face.fillRect(27, 80, 32, 6);
    face.fillRect(20, 94, 46, 4);
    face.generateTexture("card-face-large", 86, 124);
    face.destroy();
  }
}
