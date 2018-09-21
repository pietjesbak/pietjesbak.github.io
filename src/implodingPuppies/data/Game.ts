import { shuffle } from "../../Helpers";
import { cards, CardTypes } from "./Cards";
import { Deck } from "./Deck";
import { Player } from "./Player";

export interface Log {
    timestamp: Date;
    player?: Player;
    msg: string;
}

export class Game {
    private players_: Player[] = [];

    private deck_: Deck;

    private discardPile_: CardTypes[] = [];

    private currentPlayer_ = 0;

    private winner_?: Player;

    private logs_: Log[] = [];

    private nextPlayerQueue_: Player[] = [];

    private skip_: boolean;

    constructor(playerCount: number) {
        const deck: CardTypes[] = [];

        Object.values(CardTypes)
            .filter((type: CardTypes) => type !== CardTypes.BOMB && type !== CardTypes.DEFUSE)
            .forEach((type: CardTypes) => {
                const card = cards.get(type)!;
                const count = typeof card.count === 'number' ? card.count : card.count(playerCount);

                for (let i = 0; i < count; i++) {
                    deck.push(type);
                }
            });

        shuffle(deck);
        for (let i = 0; i < playerCount; i++) {
            const hand = deck.splice(0, 4);
            hand.push(CardTypes.DEFUSE);
            this.players_.push(new Player(hand));
        }

        for (let i = 0; i < playerCount - 1; i++) {
            deck.push(CardTypes.BOMB);
        }

        for (let i = 0; i < 6 - playerCount; i++) {
            deck.push(CardTypes.DEFUSE);
        }

        shuffle(deck);
        this.deck_ = new Deck(deck);
    }

    get logs() {
        return this.logs_;
    }

    get deck() {
        return this.deck_;
    }

    get discardPile() {
        return this.discardPile_;
    }

    async playTurn() {
        this.skip_ = false;
        const player = this.decideNextPlayer();

        let selection: CardTypes[];
        do {
            selection = await player.selectCards(this);
            if (selection.length > 0 && !await this.waitForNopes()) {
                await player.playCards(selection, this);
            }
        } while (selection.length !== 0)

        if (!this.skip_) {
            const card = this.deck_.pick();
            await player.drawCard(card, this);
        }

        this.currentPlayer_ = (this.currentPlayer_++) % this.players_.length;

        const remainingPlayers = this.players_.filter(p => p.alive);
        if (remainingPlayers.length === 1) {
            this.winner_ = remainingPlayers[0];
        }

        return this.winner_;
    }

    async waitForNopes() {
        return false;
    }

    async insertIntoDeck(player: Player, type: CardTypes) {
        // Todo.
    }

    async choosePlayer(source: Player) {
        return this.players_[0];
    }

    processSkip() {
        this.skip_ = true;
    }

    processAttack() {
        this.processSkip();
        this.nextPlayerQueue_.push(this.players_[this.currentPlayer_]);
    }

    decideNextPlayer() {
        if (this.nextPlayerQueue_.length === 0) {
            this.nextPlayerQueue_.push(this.players_[(this.currentPlayer_++) % this.players_.length]);
        }

        return this.nextPlayerQueue_.pop()!;
    }

    log(msg: string, player?: Player) {
        this.logs_.push({
            timestamp: new Date(),
            msg,
            player
        })
    }
}
