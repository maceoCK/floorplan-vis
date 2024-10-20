export interface Room {
  id: number;
  x: number;
  y: number;
  type: string;
  number: string;
  size: string;
  name: string;
}

export interface Connectivity {
  source: Room;
  target: Room;
  value: number;
}

export interface Boundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ROOM_CLASS = {
  "living_room": 1, "kitchen": 2, "bedroom": 3, "bathroom": 4, "balcony": 5, "entrance": 6,
  "dining room": 7, "study room": 8, "storage": 10, "front door": 11, "unknown": 13, "interior_door": 12
};

export const ROOM_COLORS_DARK = {
  "living_room": "#FF6B6B", "kitchen": "#4ECDC4", "bedroom": "#45B7D1", "bathroom": "#66D7D1", 
  "balcony": "#95E1D3", "entrance": "#FCE38A", "dining room": "#F38181", "study room": "#A8D8EA", 
  "storage": "#AA96DA", "front door": "#FCBAD3", "unknown": "#FFFFD2", "interior_door": "#E3FDFD"
};

