import { shuffle } from '../../Helpers';
import { Card } from './Cards';

export class Deck {
    private cards_: Card[];

    constructor(initialCards: Card[]) {
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

    get cards() {
        return this.cards_;
    }
}
