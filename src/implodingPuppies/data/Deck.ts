import { shuffle } from "../../Helpers";
import { CardTypes } from "./Cards";

export class Deck {
    private cards_: CardTypes[];

    constructor(initialCards: CardTypes[]) {
        this.cards_ = initialCards;
    }

    pick() {
        return this.cards_.splice(0, 1)[0]!;
    }

    shuffle() {
        shuffle(this.cards_);
    }

    seeTop() {
        return this.cards_.slice(-3).reverse();
    }
}
