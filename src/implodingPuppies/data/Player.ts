import { Card, CardTypes, OwnerType } from './Cards';
import { Game } from './Game';

export class Player {
    id: number;

    private cards_: Card[];

    private alive_: boolean = true;

    private selection_: Card[] = [];

    constructor(initialCards: Card[], id: number) {
        this.cards_ = initialCards.sort(Card.sortFn);
        this.cards_.forEach(card => card.owner = { type: OwnerType.PLAYER, data: id });
        this.id = id;
    }

    get cards() {
        return this.cards_;
    }

    set cards(value: Card[]) {
        this.cards_ = value;
    }

    get alive() {
        return this.alive_;
    }

    get selection() {
        return this.selection_;
    }

    find(type: CardTypes) {
        return this.cards_.find(c => c.prototype.type === type);
    }

    async useCard(type: CardTypes, game: Game) {
        const card = this.find(type);
        if (!card) {
            throw new Error('Trying to play a card you dont have!');
        }

        game.discardPile.push(this.cards_.splice(this.cards_.indexOf(card), 1)[0]);
        game.log(`uses a ${card.prototype.name}`, this);

        await card.prototype.playEffect(this, game);
    }

    async drawCard(card: Card, game: Game) {
        card.owner = { type: OwnerType.PLAYER, data: this.id };
        this.cards_.push(card);
        game.log(`Draws a ${card.prototype.name}`, this);

        this.cards_.sort(Card.sortFn);
        await card.prototype.drawEffect(this, game);
    }

    discardCard(type: Card, game: Game) {
        game.discardPile.push(this.cards_.splice(this.cards_.indexOf(type), 1)[0]);
    }

    updateSelection(selection: Card[]) {
        this.selection_ = selection;
    }

    giveOptions(drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) {
        console.log('I was given options', drawCallback, playCallback);
    }

    allowNope(nopeCallback: () => void) {
        console.log('I am allowed to nope', nopeCallback);
    }

    async selectCards(game: Game) {
        return [];
    }

    async chooseCard() {
        return this.cards_.splice(0, 1)[0]!;
    }

    async die() {
        this.alive_ = false;
    }
}
