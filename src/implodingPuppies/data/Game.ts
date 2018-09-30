import { repeat, shuffle } from '../../Helpers';
import { AsyncData, AsyncHandler } from './AsyncHandler';
import { Card, cards, CardTypes } from './Cards';
import { Deck } from './Deck';
import { Player } from './Player';
import { GameState, ISerializer, TestSerializer } from './Serializers';

export enum AsyncActions {
    START = 'start',
    JOIN = 'join',
    PLAY = 'play',
    DRAW = 'draw',
    NOPE = 'nope',
    SELECT_PLAYER = 'select player',
    SELECT_CARD = 'select card',
    INSERT_CARD = 'insert card',
    RUNNING = 'running'
}

export interface AsyncJoin {
    player: Player;
}

export interface AsyncPlay {
    player: Player;
    selection: CardTypes[];
}

export interface AsyncNope {
    player: Player;
}

export interface AsyncSelectPlayer {
    source: Player;
    target: Player;
}

export interface AsyncSelectCard {
    player: Player;
    selection: CardTypes;
    options: CardTypes[];
}

export interface AsyncInsertCard {
    player: Player;
    position: number;
    maxPosition: number;
}

export class Game extends AsyncHandler {

    static MAX_PLAYER_COUNT = 5;

    static NOPE_TIMEOUT_MILLIS = 2000;

    private isHost_: boolean;

    private players_: Player[] = [];

    private deck_: Deck;

    private discardPile_: Card[] = [];

    private playerCount_ = 0;

    private currentPlayer_ = 0;

    private playerQueue_: number[] = [];

    private slots_: string[];

    private serializer_: ISerializer;

    private runningKey_: string;

    private startKey_: string;

    constructor(isHost: boolean, serializer?: ISerializer) {
        super();

        this.isHost_ = isHost;
        this.serializer_ = serializer || new TestSerializer();
        this.runningKey_ = this.createPromise(AsyncActions.RUNNING);
    }

    get playerCount() {
        return this.playerCount_;
    }

    get currentPlayer() {
        return this.players_[this.currentPlayer_];
    }

    get players() {
        return this.players_;
    }

    get deck() {
        return this.deck_;
    }

    get discardPile(){
        return this.discardPile_;
    }

    shutDown() {
        this.getPromise(this.runningKey_).catch(error => error);
        this.rejectRemaining([this.runningKey_], 'Server shut down', true);
    }

    serialize() {
        return this.serializer_.serializeFull(this);
    }

    /**
     * Makes a player join the server.
     */
    join(player: Player) {
        this.playerCount_++;

        const slot = this.slots_.pop()!;
        this.resolve(slot, { player });
    }

    /**
     * Start the game regardless of the amount of players that joined.
     */
    forceStart() {
        if (this.playerCount_ > 1) {
            const promise = this.getPromise(this.startKey_);
            this.rejectRemaining([this.startKey_], 'Force Start');

            return promise;
        }

        return undefined;
    }

    /**
     * Initializes the deck of cards based on the amount of players.
     */
    initDeck() {
        const deck: Card[] = [];

        Object.values(CardTypes)
            .filter((type: CardTypes) => type !== CardTypes.BOMB && type !== CardTypes.DEFUSE)
            .forEach((type: CardTypes) => {
                const card = cards.get(type)!;
                const count = typeof card.count === 'number' ? card.count : card.count(this.playerCount_);

                for (let i = 0; i < count; i++) {
                    deck.push(new Card(type));
                }
            });

        shuffle(deck);
        for (let i = 0; i < this.playerCount_; i++) {
            const hand = deck.splice(0, 4);
            hand.push(new Card(CardTypes.DEFUSE));
            this.players_[i].cards = hand;
        }

        for (let i = 0; i < this.playerCount_ - 1; i++) {
            deck.push(new Card(CardTypes.BOMB));
        }

        for (let i = 0; i < 6 - this.playerCount_; i++) {
            deck.push(new Card(CardTypes.DEFUSE));
        }

        shuffle(deck);
        this.deck_ = new Deck(deck);
    }

    async waitForPlayers(): Promise<Player[]> {
        this.slots_ = new Array(Game.MAX_PLAYER_COUNT).fill(null).map(() => this.createPromise(AsyncActions.JOIN));
        this.startKey_ = this.createPromise(AsyncActions.START);
        const copy = [...this.slots_];

        // Wait for all slots to be filled or the force start to be called.
        const promises = this.getPromises<AsyncJoin>(copy);
        await Promise.race([Promise.all(promises), this.getPromise(this.startKey_).catch(reject => reject)]);

        // When the force start button is pressed, we reject the remaining slots, so all promises resolve.
        // Then we filter out the rejected ones.
        this.rejectRemaining(copy);
        let data = await Promise.all(promises.map(promise => promise.catch(reject => reject))) as Array<AsyncData<AsyncJoin>>;
        return data.filter(player => typeof player !== 'string')
            .map((d, i) => {
                const player = d.data!.player;
                player.id = i; // Assign correct ids.
                return player;
            });
    }

    async waitForUpdates() {
        while (true) {
            let response: GameState;
            try {
                response = await Promise.race([this.serializer_.deserializeFull(), this.getPromise(this.runningKey_)]) as GameState;
            } catch (e) {
                return;
            }

            this.deserialize_(response.players, response.deck, response.discardPile);
        }
    }

    async gameLoop() {
        this.players_ = await this.waitForPlayers();
        this.initDeck();
        this.waitForUpdates();

        let gameOver = false;
        while (!gameOver) {
            const keys = [this.createPromise(AsyncActions.DRAW), this.createPromise(AsyncActions.PLAY)];
            const promises = this.getPromises(keys);
            this.currentPlayer.giveOptions(this.createDrawAction(keys[0]), this.createPlayAction(keys[1]));

            let result: AsyncData<AsyncPlay|{}>;
            try {
                result = await Promise.race([...promises, this.getPromise(this.runningKey_)]);
            } catch (e) {
                // Server shut down.
                this.rejectRemaining(keys);
                return;
            }

            switch (result.action) {
                case AsyncActions.DRAW:
                    this.playerDraw();
                    gameOver = this.nextTurn();
                    break;

                case AsyncActions.PLAY:
                    await this.playerPlay((result as AsyncData<AsyncPlay>).data!.selection);
                    break;
            }

            this.rejectRemaining(keys);
        }
    }

    playerDraw() {
        this.currentPlayer.drawCard(this.deck_.pick(), this);
    }

    async playerPlay(selection: CardTypes[]) {
        let noped = await this.processNopes();
        if (!noped) {
            if (selection.length === 1) {
                await cards.get(selection[0])!.playEffect(this.currentPlayer, this);
            } else if (selection.length === 2 && selection[0] === selection[1]) {
                const target = (await this.selectTarget()).data!.target;
                noped = await this.processNopes();
                if (!noped) {
                    const card = target.stealCard(undefined, this);
                    if (card !== undefined) {
                        this.currentPlayer.addCard(card, this);
                    }
                }

            } else if (selection.length === 3 && selection.every(type => type === selection[0])) {
                const target = (await this.selectTarget()).data!.target;
                noped = await this.processNopes();
                if (!noped) {
                    const options = Object.values(CardTypes).filter(type => type !== CardTypes.BOMB);
                    const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
                        player: this.currentPlayer,
                        options
                    });
                    this.currentPlayer.allowSelectCard(options, this.createSelectCardAction(key));
                    const type = (await this.getPromise<AsyncSelectCard>(key)).data!.selection;
                    const card = target.stealCard(type, this);
                    if (card !== undefined) {
                        this.currentPlayer.addCard(card, this);
                    }
                }

            } else if (selection.length === 5 && new Set(selection).size === 5 && this.discardPile_.length > 0) {
                const type = (await this.selectCard()).data!.selection;
                const card = this.discardPile_.find(c => c.prototype.type === type)!;
                this.discardPile_.splice(this.discardPile_.indexOf(card), 1);
                this.currentPlayer.addCard(card, this);
            }
        }
    }

    selectTarget() {
        const key = this.createPromise<AsyncSelectPlayer>(AsyncActions.SELECT_PLAYER, { source: this.currentPlayer });
        this.currentPlayer.allowSelectTarget(this.createSelectPlayerAction(key));

        return this.getPromise<AsyncSelectPlayer>(key);
    }

    selectCard() {
        const options = [...new Set(this.discardPile_.map(card => card.prototype.type))].filter(type => type !== CardTypes.BOMB);
        const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
            player: this.currentPlayer,
            options
         });
        this.currentPlayer.allowSelectCard(options, this.createSelectCardAction(key));

        return this.getPromise<AsyncSelectCard>(key);
    }

    insertIntoDeck(type: CardTypes) {
        const key = this.createPromise<AsyncInsertCard>(AsyncActions.INSERT_CARD, {
            player: this.currentPlayer,
            maxPosition: this.deck.cards.length
        });

        this.currentPlayer.allowInsertIntoDeck(this.deck.cards.length, this.createInsertCardAction(key));
        return this.getPromise<AsyncInsertCard>(key);
    }

    async processNopes() {
        let result = true;

        let player: AsyncData<AsyncNope>|undefined;
        let excludedPlayer = this.currentPlayer_;
        do {
            const keys = repeat(this.playerCount_).map((unused, i) => this.createPromise(AsyncActions.NOPE, { player: this.players_[i] }, Game.NOPE_TIMEOUT_MILLIS));
            const promises = this.getPromises<AsyncNope>(keys);
            keys.forEach((key, i) => {
                if (excludedPlayer !== i) {
                    this.players_[i].allowNope(this.createNopeAction(key))
                }
            });

            player = undefined;
            try {
                player = await Promise.race(promises);
                excludedPlayer = player.data!.player.id;
                result = !result;
            } catch (e) {
                // Timeout!
            }
        } while (player !== undefined);

        return result;
    }

    nextTurn() {
        if (this.playerQueue_.length === 0) {
            this.playerQueue_.push(this.getNextAlivePlayer());
        }

        this.currentPlayer_ = this.playerQueue_.pop()!;

        return this.players_.filter(player => player.alive).length <= 1;
    }

    processSkip() {
        this.nextTurn();
    }

    processAttack() {
        this.nextTurn();
        this.playerQueue_.push(this.currentPlayer_);
    }

    async processFavor() {
        const target = (await this.selectTarget()).data!.target;
        if (!await this.processNopes() && target.cards.length > 0) {
            const options = [...new Set(target.cards.map(card => card.prototype.type))];
            const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
                player: this.currentPlayer,
                options
            })
            target.allowSelectCard(options, this.createSelectCardAction(key));
            const type = (await this.getPromise<AsyncSelectCard>(key)).data!.selection;
            const card = target.stealCard(type, this);
            if (card !== undefined) {
                this.currentPlayer.addCard(card, this);
            }
        }
    }

    private getNextAlivePlayer() {
        const alivePlayers = this.players_.filter(player => player.alive);
        return alivePlayers[++this.currentPlayer_ % alivePlayers.length].id;
    }

    private deserialize_(players?: Player[], deck?: Card[], discardPile?: Card[]) {
        if (players !== undefined) {
            this.players_.forEach((player, i) => {
                const match = players[i];
                player.cards = match.cards;
                player.id = match.id;
            });
        }

        if (deck !== undefined) {
            this.deck_.updateCards(deck);
        }

        if (discardPile !== undefined) {
            this.discardPile_ = discardPile;
        }
    }

    private createDrawAction(key: string) {
        return () => this.resolve(key);
    }

    private createPlayAction(key: string) {
        return (selection: CardTypes[]) => this.resolve(key, {
            selection
        });
    }

    private createNopeAction(key: string) {
        return () => this.resolve(key);
    }

    private createSelectPlayerAction(key: string) {
        return (target: Player) => this.resolve(key, {
            target
        });
    }

    private createSelectCardAction(key: string) {
        return (target: CardTypes) => this.resolve(key, {
            selection: target
        });
    }

    private createInsertCardAction(key: string) {
        return (position: number) => this.resolve(key, {
            position
        });
    }
}
