import { Card, cards, CardTypes, OwnerType } from './Cards';
import { Game } from './Game';

export interface PlayerOptions {
    giveOptions: (drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) => void;
    allowNope: (nopeCallback: () => void) => void;
    allowSelectTarget: (options: Player[], playerSelectCallback: (player: Player) => void) => void;
    allowSelectCard: (options: CardTypes[], cardSelectCallback: (selection: CardTypes) => void) => void;
    allowInsertIntoDeck: (maxPosition: number, insertCallback: (position: number) => void) => void;
    seeFuture: (cards: CardTypes[], confirmCallback: () => void) => void;
    clearCallbacks: () => void;
}

export class Player {
    static colors = ['#5bc0eb', '#fde74c', '#9bc53d', '#e55934', '#fa7921'];

    static avatars = ['🐕', '🐈', '🐦', '🐟', '🐔'];

    private id_: number;

    private name_?: string;

    private cards_: Card[];

    private alive_: boolean = true;

    private selection_: Card[] = [];

    constructor(name?: string, id?: number) {
        this.cards_ = [];
        this.name_ = name;
        this.id_ = id !== undefined ? id : -1;
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
        this.cards_ = value.sort(Card.sortFn);
        this.assignCards_();
    }

    get alive() {
        return this.alive_;
    }

    get selection() {
        return this.selection_;
    }

    get name() {
        return this.name_ || `Player ${this.id}`;
    }

    set name(name: string) {
        this.name_ = name;
    }

    set alive(alive: boolean) {
        this.alive_ = alive;
    }

    get color() {
        return Player.colors[this.id % Player.colors.length] || '#000';
    }

    get avatar() {
        return Player.avatars[this.id % Player.avatars.length] || '🤡';
    }

    //#region Callbacks

    /**
     * Used to draw or play a card.
     * @param drawCallback Callback to draw a card.
     * @param playCallback Callback to play 1 or more cards.
     */
    giveOptions(drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) {
        // Callback
    }

    /**
     * Used to nope the currently played card.
     * @param nopeCallback Callback for when the player wants to nope the currently played card.
     */
    allowNope(nopeCallback: () => void) {
        // Callback
    };

    /**
     * Used to select a player.
     * @param options All possible players to choose from.
     * @param playerSelectCallback Callback to pass the selected player back to the game logic.
     */
    allowSelectTarget(options: Player[], playerSelectCallback: (player: Player) => void) {
        // Callback
    }

    /**
     * Used to select a card type.
     * @param options All possible card types to choose from.
     * @param cardSelectCallback Callback to pass the selected type back to the game logic.
     */
    allowSelectCard(options: CardTypes[], cardSelectCallback: (selection: CardTypes) => void) {
        // Callback
    }

    /**
     * Used to select a position to put a card back in the deck.
     * @param maxPosition The size of the deck.
     * @param insertCallback Callback to pass the selected position back to the game logic.
     */
    allowInsertIntoDeck(maxPosition: number, insertCallback: (position: number) => void) {
        // Callback
    }

    /**
     * Used to pass show the future to this player.
     * @param future The future cards.
     * @param confirmCallback Callback when done seeing the future.
     */
    seeFuture(future: CardTypes[], confirmCallback: () => void) {
        // Callback
    }

    /**
     * Used to reset the player state / clear previous callbacks.
     */
    clearCallbacks() {
        // Callback
    }
    //#endregion

    /**
     * Sets the callbacks for this player object.
     * @param options An object containing all callbacks.
     */
    setCallbacks(options: PlayerOptions) {
        for (let key in options) {
            this[key] = options[key];
        }
    }

    /**
     * Finds a card in the player's hand that matches the card type.
     * @param type The card type to look for.
     */
    find(type: CardTypes) {
        return this.cards_.find(c => c.prototype.type === type);
    }

    /**
     * Clears the player's selected cards.
     */
    clearSelection() {
        this.selection_ = [];
    }

    /**
     * Checks if the player can play the current selection.
     */
    canPlay(selection?: CardTypes[]) {
        selection = selection === undefined ? this.selection.map(card => card.prototype.type)! : selection;

        if (selection.length === 1 && cards.get(selection[0])!.playEffect !== undefined) {
            return true;
        } else if ((selection.length === 2 || selection.length === 3) &&
            selection.every(type => type === selection![0])) {
            return true;
        } else if (selection.length === 5 && new Set(selection).size === 5) {
            return true;
        }

        return false;
    }

    /**
     * The player uses a single card.
     * @param type The type of the card that the player wants to use.
     * @param game The game.
     */
    async useCard(type: CardTypes, game: Game) {
        const card = this.find(type);
        if (!card) {
            throw new Error('Trying to play a card you dont have!');
        }

        if (card.prototype.playEffect === undefined) {
            throw new Error('Trying to play a card without effect!');
        }

        this.discardCard(type, game);
        await card.prototype.playEffect(this, game);

    }

    /**
     * The player draws a card.
     * @param card The card that's being drawn.
     * @param game The game.
     */
    async drawCard(card: Card, game: Game) {
        this.addCard(card, game);
        if (card.prototype.drawEffect !== undefined) {
            await card.prototype.drawEffect(this, game);
        }
    }

    /**
     * Add a card to the player's hand.
     * @param card The card to add to the player's hand.
     * @param game The game.
     */
    addCard(card: Card, game: Game) {
        card.owner = { type: OwnerType.PLAYER, data: this.id };
        this.cards_.push(card);
        this.cards_.sort(Card.sortFn);
    }

    /**
     * Tries stealing a card from the player's hand.
     * @param type Optional type of the card to steal.
     * @param game The game.
     */
    stealCard(type: CardTypes | undefined, game: Game) {
        let selection: Card | undefined;
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

    /**
     * Removes a card from the player's hand and adds it to the discard pile.
     * @param type The card type to discard.
     * @param game The game.
     */
    discardCard(type: CardTypes, game: Game) {
        const card = this.find(type);
        if (!card) {
            throw new Error('Trying to discard a card you dont have!');
        }

        game.discardPile.push(this.cards_.splice(this.cards_.indexOf(card!), 1)[0]);
    }

    /**
     * Kills the player.
     */
    async die() {
        this.alive_ = false;
    }

    /**
     * Makes sure all cards in the player's hand are assigned to him.
     */
    private assignCards_() {
        this.cards_.forEach(card => card.owner = { type: OwnerType.PLAYER, data: this.id });
    }
}
