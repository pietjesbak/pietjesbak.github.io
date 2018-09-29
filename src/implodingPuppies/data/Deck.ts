import { shuffle } from '../../Helpers';
import { Card } from './Cards';

export class Deck {
    private cards_: Card[];

    constructor(initialCards: Card[]) {
        this.cards_ = initialCards;
    }

    get cards() {
        return this.cards_;
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

    updateCards(cards: Card[]) {
        this.cards_ = cards;
    }
}
