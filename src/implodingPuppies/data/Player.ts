import { cards, CardTypes } from "./Cards";
import { Game } from "./Game";

export class Player {
    private cards_: CardTypes[];

    private alive_: boolean = true;

    constructor(initialCards: CardTypes[]) {
        this.cards_ = initialCards;
    }

    get cards() {
        return this.cards_;
    }

    get alive() {
        return this.alive_;
    }

    find(type: CardTypes) {
        return cards.get(this.cards_.find(c => c === type)!);
    }

    async useCard(type: CardTypes, game: Game) {
        const card = this.find(type);
        if (card === undefined) {
            throw new Error('Trying to play a card you dont have!');
        }

        this.cards_.splice(this.cards_.indexOf(type), 1);
        game.log(`uses a ${card.name}`, this);

        await card.playEffect(this, game);
    }

    async drawCard(type: CardTypes, game: Game) {
        const card = cards.get(type)!;
        this.cards_.push(type);
        game.log(`Draws a ${card.name}`, this);

        await card.drawEffect(this, game);
    }

    async selectCards(game: Game) {
        return [];
    }

    async playCards(selection: CardTypes[], game: Game) {
        return false;
    }

    async chooseCard() {
        return this.cards_.splice(0, 1)[0]!;
    }

    async die() {
        this.alive_ = false;
    }
}
