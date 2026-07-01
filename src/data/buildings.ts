import type { BuildingDefinition } from "../types";

export const WORLD_WIDTH = 1040;
export const WORLD_HEIGHT = 960;
export const TILE_SIZE = 32;

export const BUILDINGS: BuildingDefinition[] = [
  {
    id: "tarot",
    name: "云镜占卜舱",
    texture: "building-tarot",
    x: 96,
    y: 78,
    width: 152,
    height: 132,
    collision: { x: 96, y: 92, width: 152, height: 118 },
    entrance: { x: 148, y: 210, width: 48, height: 42 },
    action: "enterTarot",
    prompt: "进入云镜占卜舱"
  },
  {
    id: "bakery",
    name: "空气面包站",
    texture: "building-bakery",
    x: 406,
    y: 82,
    width: 136,
    height: 112,
    collision: { x: 406, y: 94, width: 136, height: 100 },
    entrance: { x: 450, y: 194, width: 48, height: 42 },
    action: "placeholder",
    prompt: "查看空气面包站"
  },
  {
    id: "library",
    name: "水光图书舱",
    texture: "building-library",
    x: 736,
    y: 90,
    width: 142,
    height: 116,
    collision: { x: 736, y: 102, width: 142, height: 104 },
    entrance: { x: 784, y: 206, width: 48, height: 42 },
    action: "placeholder",
    prompt: "查看水光图书舱"
  },
  {
    id: "atelier",
    name: "绿能工坊",
    texture: "building-atelier",
    x: 254,
    y: 474,
    width: 150,
    height: 116,
    collision: { x: 254, y: 486, width: 150, height: 104 },
    entrance: { x: 305, y: 590, width: 48, height: 42 },
    action: "placeholder",
    prompt: "查看绿能工坊"
  },
  {
    id: "cafe",
    name: "漂浮茶吧",
    texture: "building-cafe",
    x: 652,
    y: 462,
    width: 146,
    height: 120,
    collision: { x: 652, y: 474, width: 146, height: 108 },
    entrance: { x: 701, y: 582, width: 48, height: 42 },
    action: "placeholder",
    prompt: "查看漂浮茶吧"
  }
];
