export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BuildingAction = "enterTarot" | "placeholder";

export interface BuildingDefinition {
  id: string;
  name: string;
  texture: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collision: Rect;
  entrance: Rect;
  action: BuildingAction;
  prompt: string;
}

export type TarotArcana = "major" | "wands" | "cups" | "swords" | "pentacles";
export type TarotOrientation = "upright" | "reversed";

export interface TarotMeaning {
  keywords: string[];
  reading: string;
}

export interface TarotCard {
  id: string;
  arcana: TarotArcana;
  name: string;
  keywords: string[];
  reading: string;
  upright: TarotMeaning;
  reversed: TarotMeaning;
}

export type TarotState = "idle" | "shuffling" | "spread" | "drawn" | "revealed";
