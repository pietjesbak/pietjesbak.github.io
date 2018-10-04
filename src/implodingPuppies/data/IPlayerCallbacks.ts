import { CardTypes } from "./Cards";
import { Player } from "./Player";

export interface IPlayerCallbacks {
    drawCallback: () => void;
    playCallback: (selection: CardTypes[]) => void;
    nopeCallback: () => void;
    playerSelectCallback: (player: Player) => void;
    cardSelectCallback: (selection: CardTypes) => void;
    insertCallback: (position: number) => void;
    confirmCallback: () => void;
}
