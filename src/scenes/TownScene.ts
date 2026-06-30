import Phaser from "phaser";
import { BUILDINGS, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from "../data/buildings";
import type { BuildingDefinition, Rect } from "../types";
import { getCurrentProfile, getCurrentSessionToken, setChatVisible, type PlayerProfile } from "../ui/account";
import { connectTownRealtime, type TownRealtimeConnection } from "../services/townRealtime";

interface TownSceneData {
  spawnX?: number;
  spawnY?: number;
}

interface RemotePlayerView {
  id: string;
  username: string;
  sprite: Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.Text;
  target: Phaser.Math.Vector2;
  bubble?: Phaser.GameObjects.Container;
}

export class TownScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<"w" | "a" | "s" | "d" | "e" | "space", Phaser.Input.Keyboard.Key>;
  private player!: Phaser.GameObjects.Image;
  private activeBuilding?: BuildingDefinition;
  private promptBox!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private interactButton!: Phaser.GameObjects.Container;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private joystickPointerId?: number;
  private joystickOrigin = new Phaser.Math.Vector2(0, 0);
  private joystickVector = new Phaser.Math.Vector2(0, 0);
  private spawn = new Phaser.Math.Vector2(514, 364);
  private profile: PlayerProfile | null = null;
  private realtime?: TownRealtimeConnection;
  private remotePlayers = new Map<string, RemotePlayerView>();
  private localNameText?: Phaser.GameObjects.Text;
  private localBubble?: Phaser.GameObjects.Container;
  private lastMoveSentAt = 0;
  private lastSentPosition = new Phaser.Math.Vector2(-9999, -9999);
  private readonly chatSubmitHandler = (event: Event) => this.sendChat((event as CustomEvent<{ text: string }>).detail?.text ?? "");

  constructor() {
    super("TownScene");
  }

  init(data: TownSceneData) {
    this.spawn.set(data.spawnX ?? 514, data.spawnY ?? 364);
  }

  create() {
    this.drawTown();
    this.createBuildings();
    this.createDecorations();

    this.player = this.add.image(this.spawn.x, this.spawn.y, "player").setOrigin(0.5, 1).setDepth(900);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.createLocalNameplate();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    }) as Record<"w" | "a" | "s" | "d" | "e" | "space", Phaser.Input.Keyboard.Key>;

    this.createHud();
    this.createTouchControls();
    this.updateHudLayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updateHudLayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.updateHudLayout, this);
    });
    this.startMultiplayer();
  }

  update(time: number, delta: number) {
    this.movePlayer(delta / 1000);
    this.player.setDepth(this.player.y);
    this.updateActiveBuilding();
    this.updateNameplates();
    this.updateRemotePlayers();
    this.sendMoveIfNeeded(time);

    if (Phaser.Input.Keyboard.JustDown(this.keys.e) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.interact();
    }
  }

  private drawTown() {
    const g = this.add.graphics();
    g.fillStyle(0xa9efd6, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    g.fillStyle(0xcffff4, 0.75);
    g.fillCircle(72, 76, 92);
    g.fillCircle(970, 118, 126);
    g.fillCircle(144, 640, 120);
    g.fillCircle(920, 620, 108);

    g.lineStyle(1, 0x75d9ca, 0.45);
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      g.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      g.lineBetween(0, y, WORLD_WIDTH, y);
    }

    this.drawPath(g, -24, 302, WORLD_WIDTH + 48, 96);
    this.drawPath(g, 466, -24, 108, WORLD_HEIGHT + 48);
    this.drawPath(g, 124, 196, 76, 170);
    this.drawPath(g, 750, 200, 78, 166);
    this.drawPath(g, 302, 370, 82, 224);
    this.drawPath(g, 698, 370, 82, 214);

    g.fillStyle(0x7fe8ff, 0.68);
    g.fillRoundedRect(18, 408, 1004, 30, 15);
    g.fillRoundedRect(586, 24, 32, 670, 16);
    g.fillStyle(0xffffff, 0.75);
    g.fillRect(48, 416, 134, 3);
    g.fillRect(654, 416, 150, 3);
    g.fillRect(594, 58, 3, 132);
    g.fillRect(594, 488, 3, 128);

    g.fillStyle(0xffffff, 0.68);
    g.fillCircle(520, 352, 82);
    g.fillStyle(0x9ef7ff, 0.92);
    g.fillCircle(520, 352, 58);
    g.fillStyle(0x35cfff, 0.86);
    g.fillCircle(520, 352, 33);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(504, 338, 10);
    g.fillCircle(536, 366, 6);
    g.lineStyle(2, 0x7df06d, 0.85);
    g.strokeCircle(520, 352, 70);

    const pads = [
      [82, 58, 180, 166],
      [388, 70, 172, 146],
      [720, 76, 176, 152],
      [238, 452, 188, 160],
      [634, 442, 184, 164]
    ];
    pads.forEach(([x, y, w, h]) => {
      g.fillStyle(0xffffff, 0.36);
      g.fillRoundedRect(x, y, w, h, 22);
      g.lineStyle(2, 0xb8f4ff, 0.52);
      g.strokeRoundedRect(x, y, w, h, 22);
    });

    const bubbles = [
      [338, 126, 18],
      [624, 152, 12],
      [914, 288, 16],
      [106, 424, 14],
      [462, 610, 18],
      [842, 510, 12]
    ];
    bubbles.forEach(([x, y, r]) => {
      g.fillStyle(0xffffff, 0.38);
      g.fillCircle(x, y, r);
      g.lineStyle(1, 0x7fe8ff, 0.9);
      g.strokeCircle(x, y, r);
    });
  }

  private drawPath(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number) {
    g.fillStyle(0xf7fbff, 0.92);
    g.fillRoundedRect(x, y, width, height, 24);
    g.fillStyle(0xb8f4ff, 0.42);
    g.fillRoundedRect(x + 10, y + 10, Math.max(0, width - 20), Math.max(0, height - 20), 18);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRoundedRect(x, y, width, height, 24);
  }

  private createBuildings() {
    BUILDINGS.forEach((building) => {
      this.add.image(building.x, building.y, building.texture).setOrigin(0, 0).setDepth(building.y + building.height);
      const label = this.add
        .text(building.x + building.width / 2, building.y + 58, building.name, {
          fontFamily: "Microsoft YaHei, sans-serif",
          fontSize: "13px",
          color: "#12324a",
          align: "center",
          fixedWidth: building.width - 24
        })
        .setOrigin(0.5, 0.5)
        .setDepth(building.y + building.height + 1);
      label.setShadow(1, 1, "#ffffff", 1, false, true);
    });
  }

  private createDecorations() {
    const trees = [
      [44, 80],
      [292, 66],
      [616, 90],
      [936, 120],
      [52, 520],
      [132, 612],
      [500, 604],
      [908, 576],
      [964, 650]
    ];
    trees.forEach(([x, y]) => this.add.image(x, y, "tree").setOrigin(0.5, 1).setDepth(y));

    const flowers = [
      [334, 280],
      [368, 292],
      [626, 286],
      [676, 300],
      [586, 430],
      [610, 448],
      [154, 418],
      [860, 422],
      [420, 236],
      [706, 246]
    ];
    flowers.forEach(([x, y]) => this.add.image(x, y, "flower").setOrigin(0.5, 1).setDepth(y));
  }

  private createHud() {
    this.promptText = this.add
      .text(0, 0, "", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "18px",
        color: "#f7fbff",
        align: "center"
      })
      .setOrigin(0.5);
    const promptBg = this.add.rectangle(0, 0, 380, 46, 0x12324a, 0.72).setStrokeStyle(2, 0x8df15f, 0.95);
    this.promptBox = this.add.container(270, 900, [promptBg, this.promptText]).setDepth(2000).setScrollFactor(0).setVisible(false);

    this.toastText = this.add
      .text(270, 96, "", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "20px",
        color: "#f7fbff",
        backgroundColor: "#12324a",
        padding: { x: 16, y: 10 },
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScrollFactor(0)
      .setVisible(false);

    const buttonWidth = 156;
    const buttonHeight = 64;
    const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2aaeea, 0.92).setStrokeStyle(2, 0xf7fbff, 1);
    const buttonText = this.add
      .text(0, 0, "交互", {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "22px",
        color: "#f7fbff"
      })
      .setOrigin(0.5);
    let interactArmed = false;
    this.interactButton = this.add
      .container(454, 850, [buttonBg, buttonText])
      .setDepth(2000)
      .setScrollFactor(0)
      .setSize(buttonWidth, buttonHeight)
      .setInteractive(new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", () => {
        interactArmed = true;
        buttonBg.setFillStyle(0x83eaff, 1);
      })
      .on("pointerover", () => buttonBg.setFillStyle(0x61dfff, 1))
      .on("pointerout", () => {
        interactArmed = false;
        buttonBg.setFillStyle(0x2aaeea, 0.92);
      })
      .on("pointerup", () => {
        if (interactArmed) {
          this.interact();
        }
        interactArmed = false;
        buttonBg.setFillStyle(0x61dfff, 1);
      })
      .on("pointerupoutside", () => {
        interactArmed = false;
        buttonBg.setFillStyle(0x2aaeea, 0.92);
      });
  }

  private createTouchControls() {
    this.joystickBase = this.add.circle(88, 842, 68, 0x12324a, 0.34).setStrokeStyle(3, 0xf7fbff, 0.75).setDepth(2000).setScrollFactor(0);
    this.joystickKnob = this.add.circle(88, 842, 30, 0x8df15f, 0.72).setStrokeStyle(3, 0xf7fbff, 0.8).setDepth(2001).setScrollFactor(0);
    this.joystickBase.setVisible(false);
    this.joystickKnob.setVisible(false);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.isJoystickZone(pointer) || this.joystickPointerId !== undefined) {
        return;
      }
      this.joystickPointerId = pointer.id;
      this.joystickOrigin.set(pointer.x, pointer.y);
      this.joystickVector.set(0, 0);
      this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
      this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointerId) {
        return;
      }
      const dx = pointer.x - this.joystickOrigin.x;
      const dy = pointer.y - this.joystickOrigin.y;
      const len = Math.min(64, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      this.joystickVector.set(Math.cos(angle) * (len / 64), Math.sin(angle) * (len / 64));
      this.joystickKnob.setPosition(this.joystickOrigin.x + Math.cos(angle) * len, this.joystickOrigin.y + Math.sin(angle) * len);
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointerId) {
        return;
      }
      this.joystickPointerId = undefined;
      this.joystickVector.set(0, 0);
      this.joystickBase.setVisible(false);
      this.joystickKnob.setVisible(false);
    });
  }

  private updateHudLayout() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.promptBox?.setPosition(width / 2, height - 96);
    this.toastText?.setPosition(width / 2, Math.max(56, height * 0.1));
    this.interactButton?.setPosition(width - 100, height - 178);
    if (this.joystickPointerId === undefined) {
      this.joystickBase?.setPosition(96, height - 126);
      this.joystickKnob?.setPosition(96, height - 126);
    }
  }

  private isJoystickZone(pointer: Phaser.Input.Pointer) {
    const maxX = Math.min(300, this.scale.width * 0.48);
    const minY = Math.max(0, this.scale.height - 320);
    return pointer.x <= maxX && pointer.y >= minY;
  }

  private movePlayer(deltaSeconds: number) {
    const direction = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left?.isDown || this.keys.a.isDown) direction.x -= 1;
    if (this.cursors.right?.isDown || this.keys.d.isDown) direction.x += 1;
    if (this.cursors.up?.isDown || this.keys.w.isDown) direction.y -= 1;
    if (this.cursors.down?.isDown || this.keys.s.isDown) direction.y += 1;
    direction.add(this.joystickVector);

    if (direction.lengthSq() === 0) {
      return;
    }
    direction.normalize();
    if (Math.abs(direction.x) > 0.05) {
      this.player.setFlipX(direction.x < 0);
    }

    const speed = 168;
    const stepX = direction.x * speed * deltaSeconds;
    const stepY = direction.y * speed * deltaSeconds;
    this.tryMove(stepX, 0);
    this.tryMove(0, stepY);
  }

  private tryMove(dx: number, dy: number) {
    const nextX = Phaser.Math.Clamp(this.player.x + dx, 18, WORLD_WIDTH - 18);
    const nextY = Phaser.Math.Clamp(this.player.y + dy, 38, WORLD_HEIGHT - 10);
    const nextRect = this.getPlayerRect(nextX, nextY);

    if (BUILDINGS.some((building) => this.overlap(nextRect, building.collision))) {
      return;
    }

    this.player.setPosition(nextX, nextY);
  }

  private updateActiveBuilding() {
    const playerRect = this.getPlayerRect(this.player.x, this.player.y);
    this.activeBuilding = BUILDINGS.find((building) => this.overlap(playerRect, building.entrance));

    if (!this.activeBuilding) {
      this.promptBox.setVisible(false);
      return;
    }

    this.promptText.setText(`${this.activeBuilding.prompt}  E`);
    this.promptBox.setVisible(true);
  }

  private interact() {
    if (!this.activeBuilding) {
      this.showToast("靠近建筑入口再交互");
      return;
    }

    if (this.activeBuilding.action === "enterTarot") {
      this.scene.start("TarotHouseScene");
      return;
    }

    this.showToast(`${this.activeBuilding.name} 还没有开放`);
  }

  private createLocalNameplate() {
    this.profile = getCurrentProfile();
    const username = this.profile?.username ?? "我";
    this.localNameText = this.add
      .text(this.player.x, this.player.y - 44, username, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "14px",
        color: "#12324a",
        backgroundColor: "#f7fbff",
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5)
      .setDepth(1200);
  }

  private startMultiplayer() {
    setChatVisible(true);
    window.addEventListener("pixel-town-chat-submit", this.chatSubmitHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setChatVisible(false);
      window.removeEventListener("pixel-town-chat-submit", this.chatSubmitHandler);
      this.realtime?.close();
      this.realtime = undefined;
      this.remotePlayers.clear();
    });

    if (!this.profile) {
      return;
    }

    this.realtime = connectTownRealtime(this.profile, getCurrentSessionToken(), this.player.x, this.player.y, {
      onToast: (message) => this.showToast(message),
      onSnapshot: (players) => {
        const nextIds = new Set(players.map((player) => player.id));
        for (const id of this.remotePlayers.keys()) {
          if (!nextIds.has(id)) {
            this.removeRemotePlayer(id);
          }
        }
        players.forEach((player) => this.upsertRemotePlayer(player));
      },
      onPlayerJoined: (player) => this.upsertRemotePlayer(player),
      onPlayerMoved: (id, x, y) => {
        const remote = this.remotePlayers.get(id);
        if (remote) {
          remote.target.set(Number(x) || remote.target.x, Number(y) || remote.target.y);
        }
      },
      onPlayerLeft: (id) => this.removeRemotePlayer(id),
      onChat: (id, _username, text) => {
        if (!text) {
          return;
        }
        if (id === this.profile?.id) {
          this.showBubble("local", text);
        } else {
          const remote = this.remotePlayers.get(id);
          if (remote) {
            this.showBubble(remote, text);
          }
        }
      }
    });
  }

  private upsertRemotePlayer(player: any) {
    if (!player || player.id === this.profile?.id) {
      return;
    }

    const id = String(player.id);
    const username = String(player.username ?? "玩家").slice(0, 16);
    const x = Number(player.x) || 514;
    const y = Number(player.y) || 364;
    const existing = this.remotePlayers.get(id);
    if (existing) {
      existing.username = username;
      existing.nameText.setText(username);
      existing.target.set(x, y);
      return;
    }

    const sprite = this.add.image(x, y, "player").setOrigin(0.5, 1).setTint(0x7fe8ff).setDepth(y);
    const nameText = this.add
      .text(x, y - 44, username, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "14px",
        color: "#f7fbff",
        backgroundColor: "#25618e",
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5)
      .setDepth(1200);

    this.remotePlayers.set(id, {
      id,
      username,
      sprite,
      nameText,
      target: new Phaser.Math.Vector2(x, y)
    });
  }

  private sendMoveIfNeeded(time: number) {
    if (!this.realtime?.isConnected() || time - this.lastMoveSentAt < 90) {
      return;
    }

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lastSentPosition.x, this.lastSentPosition.y) < 3) {
      return;
    }

    this.lastMoveSentAt = time;
    this.lastSentPosition.set(this.player.x, this.player.y);
    this.realtime.sendMove(this.player.x, this.player.y);
  }

  private sendChat(text: string) {
    const message = text.trim().slice(0, 80);
    if (!message) {
      return;
    }

    if (!this.realtime?.isConnected()) {
      this.showToast("聊天服务未连接");
      return;
    }

    this.realtime.sendChat(message);
  }

  private updateRemotePlayers() {
    for (const remote of this.remotePlayers.values()) {
      remote.sprite.x = Phaser.Math.Linear(remote.sprite.x, remote.target.x, 0.25);
      remote.sprite.y = Phaser.Math.Linear(remote.sprite.y, remote.target.y, 0.25);
      remote.sprite.setDepth(remote.sprite.y);
    }
  }

  private updateNameplates() {
    this.localNameText?.setPosition(this.player.x, this.player.y - 44).setDepth(this.player.y + 20);
    this.localBubble?.setPosition(this.player.x, this.player.y - 72).setDepth(this.player.y + 40);

    for (const remote of this.remotePlayers.values()) {
      remote.nameText.setPosition(remote.sprite.x, remote.sprite.y - 44).setDepth(remote.sprite.y + 20);
      remote.bubble?.setPosition(remote.sprite.x, remote.sprite.y - 72).setDepth(remote.sprite.y + 40);
    }
  }

  private showBubble(owner: "local" | RemotePlayerView, message: string) {
    const target = owner === "local" ? this.player : owner.sprite;
    const previous = owner === "local" ? this.localBubble : owner.bubble;
    previous?.destroy(true);

    const text = this.add
      .text(0, 0, message, {
        fontFamily: "Microsoft YaHei, sans-serif",
        fontSize: "14px",
        color: "#12324a",
        align: "center",
        wordWrap: { width: 170, useAdvancedWrap: true }
      })
      .setOrigin(0.5);
    const width = Phaser.Math.Clamp(text.width + 20, 48, 190);
    const height = text.height + 16;
    const bg = this.add.rectangle(0, 0, width, height, 0xf7fbff, 0.94).setStrokeStyle(2, 0x42c9ff, 0.9);
    const bubble = this.add.container(target.x, target.y - 72, [bg, text]).setDepth(target.y + 40);

    if (owner === "local") {
      this.localBubble = bubble;
    } else {
      owner.bubble = bubble;
    }

    this.tweens.add({
      targets: bubble,
      alpha: 0,
      delay: 3200,
      duration: 360,
      onComplete: () => {
        bubble.destroy(true);
        if (owner === "local" && this.localBubble === bubble) {
          this.localBubble = undefined;
        } else if (owner !== "local" && owner.bubble === bubble) {
          owner.bubble = undefined;
        }
      }
    });
  }

  private removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    remote?.sprite.destroy();
    remote?.nameText.destroy();
    remote?.bubble?.destroy(true);
    this.remotePlayers.delete(id);
  }

  private showToast(message: string) {
    this.toastText.setText(message).setVisible(true);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1200,
      duration: 400,
      onComplete: () => this.toastText.setVisible(false)
    });
  }

  private getPlayerRect(x: number, y: number): Rect {
    return { x: x - 8, y: y - 20, width: 16, height: 18 };
  }

  private overlap(a: Rect, b: Rect) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }
}
