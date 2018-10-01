import { Card, CardTypes, OwnerType } from './Cards';
import { Game } from './Game';

export class Player {
    private id_: number;

    private cards_: Card[];

    private alive_: boolean = true;

    private selection_: Card[] = [];

    constructor(initialCards: Card[], id: number) {
        this.cards_ = initialCards.sort(Card.sortFn);
        this.assignCards_();

        this.id = id;
    }

    get id() {
        return this.id_;
    }

    set id(value: number) {
        this.id_ = value;
        this.assignCards_();
    }

    get cards() {
        return this.cards_;
    }

    set cards(value: Card[]) {
        this.cards_ = value;
        this.assignCards_();
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
        // game.log(`uses a ${card.prototype.name}`, this);

        await card.prototype.playEffect(this, game);
        card.owner = { type: OwnerType.DISCARD, data: undefined };
    }

    async drawCard(card: Card, game: Game) {
        this.addCard(card, game);
        await card.prototype.drawEffect(this, game);
    }

    addCard(card: Card, game: Game) {
        card.owner = { type: OwnerType.PLAYER, data: this.id };
        this.cards_.push(card);
        this.cards_.sort(Card.sortFn);
    }

    stealCard(type: CardTypes|undefined, game: Game) {
        let selection: Card|undefined;
        if (type === undefined) {
            selection = this.cards_[Math.floor(Math.random() * this.cards_.length)];
        } else {
            selection = this.cards_.find(card => card.prototype.type === type);
        }

        if (selection !== undefined) {
            this.cards_.splice(this.cards_.indexOf(selection), 1);
        }
        return selection;
    }

    discardCard(type: CardTypes, game: Game) {
        const card = this.find(type);
        if (!card) {
            throw new Error('Trying to use a card you dont have!');
        }

        game.discardPile.push(this.cards_.splice(this.cards_.indexOf(card!), 1)[0]);
    }

    updateSelection(selection: Card[]) {
        this.selection_ = selection;
    }

    giveOptions(drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) {
        // console.log('I was given options', drawCallback, playCallback);
    }

    allowNope(nopeCallback: () => void) {
        // console.log('I am allowed to nope', nopeCallback);
    }

    allowSelectTarget(selectCallback: (player: Player) => void) {
        // console.log('I am allowed to select a player', selectCallback);
    }

    allowSelectCard(options: CardTypes[], selectCallback: (selection: CardTypes) => void) {
        // console.log('I am allowed to select a card', selectCallback);
    }

    allowInsertIntoDeck(maxPosition: number, insertCallback: (position: number) => void) {

    }

    seeFuture(cards: CardTypes[], confirmCallback: () => void) {

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

    private assignCards_() {
        this.cards_.forEach(card => card.owner = { type: OwnerType.PLAYER, data: this.id });
    }
}
