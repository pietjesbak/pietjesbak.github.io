import { shuffle } from '../../Helpers';
import { Card, cards, CardTypes, OwnerType } from './Cards';
import { Deck } from './Deck';
import { Player } from './Player';

export interface Log {
    timestamp: Date;
    player?: Player;
    msg: string;
}

export enum PlayerActions {
    DRAW = 'draw',
    PLAY = 'play',
    NOPE = 'nope'
}

interface Action {
    type: PlayerActions;
    player: number;
    selection?: Card[];
}

export class Game {
    private players_: Player[] = [];

    private deck_: Deck;

    private discardPile_: Card[] = [];

    private currentPlayer_ = -1;

    private winner_?: Player;

    private logs_: Log[] = [];

    private nextPlayerQueue_: Player[] = [];

    private skip_: boolean;

    private playerDrawPromise_?: Promise<Action>;
    private playerDrawHandler_?: (action: Action) => void;
    private playerPlayPromise_?: Promise<Action>;
    private playerPlayHandler_?: (action: Action) => void;
    private playerNopePromise_?: Promise<Action>;
    private playerNopeHandler_?: (action: Action) => void;

    private waitForNopes_: () => Promise<number|null>;
    private updateView_: () => void;

    constructor(playerCount: number) {
        const deck: Card[] = [];

        Object.values(CardTypes)
            .filter((type: CardTypes) => type !== CardTypes.BOMB && type !== CardTypes.DEFUSE)
            .forEach((type: CardTypes) => {
                const card = cards.get(type)!;
                const count = typeof card.count === 'number' ? card.count : card.count(playerCount);

                for (let i = 0; i < count; i++) {
                    deck.push(new Card(cards.get(type)!));
                }
            });

        shuffle(deck);
        for (let i = 0; i < playerCount; i++) {
            const hand = deck.splice(0, 4);
            hand.push(new Card(cards.get(CardTypes.DEFUSE)!));
            this.players_.push(new Player(hand, i));
        }

        for (let i = 0; i < playerCount - 1; i++) {
            deck.push(new Card(cards.get(CardTypes.BOMB)!));
        }

        for (let i = 0; i < 6 - playerCount; i++) {
            deck.push(new Card(cards.get(CardTypes.DEFUSE)!));
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

    get players() {
        return this.players_;
    }

    get currentPlayer() {
        return this.currentPlayer_;
    }

    playerDraw(player: number) {
        if (this.playerDrawPromise_ !== undefined) {
            this.playerDrawHandler_!({
                type: PlayerActions.DRAW,
                player
            });
        }
    }

    playerPlay(player: number, selection: Card[]) {
        if (this.playerPlayPromise_ !== undefined) {
            this.playerPlayHandler_!({
                type: PlayerActions.PLAY,
                player,
                selection
            });
        }
    }

    playerNope(player: number) {
        if (this.playerNopePromise_ !== undefined) {
            this.playerNopeHandler_!({
                type: PlayerActions.NOPE,
                player
            });
        }
    }

    playerAction() {
        this.playerDrawPromise_ = new Promise(resolve => this.playerDrawHandler_ = resolve);
        this.playerPlayPromise_ = new Promise(resolve => this.playerPlayHandler_ = resolve);
        return Promise.race([this.playerDrawPromise_, this.playerPlayPromise_]);
    }

    async playTurn() {
        this.skip_ = false;
        const player = this.decideNextPlayer();

        let playing: boolean = true;
        do {
            const action = await this.playerAction();
            switch (action.type) {
                case PlayerActions.DRAW:
                    playing = false;
                    break;

                case PlayerActions.PLAY:
                    await this.processSelection(player, action.selection!);
                    if (this.skip_) {
                        playing = false;
                    }
                    break;
            }

            this.updateView_();
        } while (playing);

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

    setCallbacks(waitForNopes: () => Promise<number|null>, updateView: () => void) {
        this.waitForNopes_ = waitForNopes;
        this.updateView_ = updateView;
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

    async processSelection(player: Player, selection: Card[]) {
        let playCard = true;

        let result = null;
        do {
            result = await this.waitForNopes_();
            if (result !== null) {
                this.log(playCard ? 'Nope!' : 'Yup!', this.players[result]);

                this.players[result].useCard(CardTypes.NOPE, this);
                playCard = !playCard;
            }
        } while (result !== null);

        if (playCard) {
            if (selection.length === 1) {
                await player.useCard(selection[0].prototype.type, this);
            } else if (selection.length === 2) {
                // Steal a card.
            } else if (selection.length === 3) {
                // Ask for a card.
            } else if (selection.length === 5) {
                // take a card from the discard pile.
            }
        } else {
            player.discardCard(selection[0], this);
        }

        selection.forEach(card => card.owner = { type: OwnerType.DISCARD });
        player.updateSelection([]);
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
            this.currentPlayer_++;
            this.currentPlayer_ = this.currentPlayer_ % this.players_.length;
            this.nextPlayerQueue_.push(this.players_[this.currentPlayer_]);
            console.log('player', this.currentPlayer_);
        }

        return this.nextPlayerQueue_.pop()!;
    }

    log(msg: string, player?: Player) {
        console.log(msg);
        this.logs_.push({
            timestamp: new Date(),
            msg,
            player
        })
    }
}
