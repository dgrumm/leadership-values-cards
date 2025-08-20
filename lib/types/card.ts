export interface CardDefinition {
  value_name: string;
  description: string;
}

export interface Card extends CardDefinition {
  id: string;
  position: {
    x: number;
    y: number;
  };
  pile: CardPile;
  owner?: string;
}

export type CardPile = 
  | 'deck'
  | 'staging'
  | 'more'
  | 'less'
  | 'top8'
  | 'top3'
  | 'discard';

export interface CardPosition {
  x: number;
  y: number;
}

export interface CardMovement {
  cardId: string;
  fromPile: CardPile;
  toPile: CardPile;
  position: CardPosition;
  timestamp: number;
}
