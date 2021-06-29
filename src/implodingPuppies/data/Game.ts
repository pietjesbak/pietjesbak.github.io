import { repeat, shuffle, wait } from '../../Helpers';
import { Announcement, AnnouncementTypes } from './Announcement';
import { AsyncData, AsyncHandler } from './AsyncHandler';
import { Card, cards, CardTypes } from './Cards';
import { Deck } from './Deck';
import { Player } from './Player';
import { plays } from './Plays';

export enum AsyncActions {
    START = 'start',
    JOIN = 'join',
    PLAY = 'play',
    DRAW = 'draw',
    NOPE = 'nope',
    SELECT_PLAYER = 'select player',
    SELECT_CARD = 'select card',
    INSERT_CARD = 'insert card',
    SEE_FUTURE = 'see future',
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
    options: Player[];
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

export interface AsyncSeeFuture {
    player: Player;
    cards: CardTypes[];
}

export interface Logs {
    message: string;
    player?: Player;
    timestamp: number;
}

export class Game extends AsyncHandler {

    get playerCount() {
        return this.playerCount_;
    }

    get currentPlayer() {
        return this.players_[this.currentPlayer_];
    }

    get lastTarget() {
        return this.lastTarget_;
    }

    get players() {
        return this.players_;
    }

    get deck() {
        return this.deck_;
    }

    get discardPile() {
        return this.discardPile_;
    }

    get isHost() {
        return this.isHost_;
    }

    get logs() {
        return this.logs_;
    }

    get announcements() {
        return this.announcements_;
    }

    static MAX_PLAYER_COUNT = 9;

    static MIN_PLAYER_COUNT = 2;

    static PLAYERS_PER_DECK = 5;

    static NOPE_TIMEOUT_MILLIS = 4000;

    static getDeckInfo(playerCount: number) {
        const decks = Math.ceil(playerCount / Game.PLAYERS_PER_DECK);
        const cardTypes: { [key in CardTypes]: number } = {} as any;
        let cardCount = 0;
        Object.values(CardTypes).forEach((type: CardTypes) => {
            const card = cards.get(type)!;
            const count = typeof card.count === 'number' ? card.count * decks : card.count(playerCount);
            cardTypes[type] = count;
            cardCount += count;
        });

        // Every player will start with a guaranteed defuse so these won't be in the deck.
        cardTypes.defuse -= playerCount;

        return {
            decks,
            ...cardTypes,
            cards: cardCount,
            deckSize: cardCount - playerCount * 5
        };
    }

    private isHost_: boolean;

    private players_: Player[] = [];

    private deck_: Deck;

    private discardPile_: Card[] = [];

    private playerCount_ = 0;

    private currentPlayer_ = 0;

    private lastTarget_?: { timestamp: number, target: Player };

    private currentPlayerIndex_ = 0;

    private playerQueue_: number[] = [];

    private slots_: string[];

    private runningKey_: string;

    private startKey_?: string;

    private logs_: Logs[] = [];

    private updateCallback_: () => void;

    private announcements_: Announcement[] = [];

    private announcementCallback_?: (announcement: Announcement) => void;

    constructor(isHost: boolean) {
        super();

        this.isHost_ = isHost;
        this.runningKey_ = this.createPromise(AsyncActions.RUNNING);
    }

    setUpdateCallback(callback: () => void) {
        this.updateCallback_ = callback;
    }

    setAnnouncementCallback(callback: (announcement: Announcement) => void) {
        this.announcementCallback_ = callback;
    }

    /**
     * Add an announcement to the game.
     * @param announcement The announcement to add.
     */
    announce(announcement: Announcement) {
        this.announcements_.push(announcement);

        if (this.announcementCallback_ !== undefined) {
            this.announcementCallback_(announcement);
        }

        this.log(announcement.message, announcement.source);
        if (announcement.isStealAction) {
            this.lastTarget_ = { timestamp: announcement.timestamp, target: announcement.target! };
        }

        this.update_();
    }

    shutDown() {
        this.getPromise(this.runningKey_).catch(error => error);
        this.rejectRemaining([this.runningKey_], 'Server shut down', true);
        this.startKey_ = undefined;
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
        if (this.playerCount_ >= Game.MIN_PLAYER_COUNT && this.startKey_ !== undefined) {
            const promise = this.getPromise(this.startKey_);
            this.rejectRemaining([this.startKey_], 'Force Start', true);

            return promise;
        }

        return undefined;
    }

    /**
     * Initializes the deck of cards based on the amount of players.
     */
    initDeck() {
        const deck: Card[] = [];
        const multiplier = Math.ceil(this.playerCount / Game.PLAYERS_PER_DECK); // How many decks are we using?

        Object.values(CardTypes)
            .filter((type: CardTypes) => type !== CardTypes.BOMB && type !== CardTypes.DEFUSE)
            .forEach((type: CardTypes) => {
                const card = cards.get(type)!;
                const count = typeof card.count === 'number' ? card.count : card.count(this.playerCount_);

                for (let i = 0; i < count * multiplier; i++) {
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

        for (let i = 0; i < (6 * multiplier) - this.playerCount_; i++) {
            deck.push(new Card(CardTypes.DEFUSE));
        }

        shuffle(deck);
        this.deck_ = new Deck(deck);
    }

    /**
     * Set the players. This can only be done before the round has started.
     * @param players The players
     */
    setPlayers(players: Player[]) {
        if (this.startKey_ !== undefined) {
            throw new Error('Can not set players on a running game!');
        }

        this.playerCount_ = players.length;
        this.players_ = players;
    }

    /**
     * Set the deck for the client.
     * @param count The amount of cards in the deck.
     */
    setDeckClient(count: number) {
        this.deck_ = new Deck(repeat(count).map(() => new Card(CardTypes.BOMB)));
    }

    /**
     * Set the discard pile for the client.
     * @param types The cards in the discard pile.
     */
    setDiscardClient(types: Card[]) {
        this.discardPile_ = types;
    }

    /**
     * Sets the current player for the client.
     * @param id The id of the current player.
     */
    setCurrentPlayerClient(id: number) {
        this.currentPlayer_ = id;
    }

    async waitForPlayers(): Promise<Player[]> {
        this.slots_ = new Array(Game.MAX_PLAYER_COUNT).fill(null).map(() => this.createPromise(AsyncActions.JOIN));
        const copy = [...this.slots_];

        // Wait for all slots to be filled or the force start to be called.
        const promises = this.getPromises<AsyncJoin>(copy);
        await Promise.race([Promise.all(promises), this.getPromise(this.startKey_!).catch(reject => reject)]);

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

    async gameLoop() {
        this.startKey_ = this.createPromise(AsyncActions.START);
        if (this.players_.length === 0) {
            this.players_ = await this.waitForPlayers();
        }

        this.initDeck();
        this.update_();

        await this.getPromise(this.startKey_!).catch(reject => reject);

        let gameOver = false;
        while (!gameOver) {
            this.clearPlayers_();
            const keys = [this.createPromise(AsyncActions.DRAW), this.createPromise(AsyncActions.PLAY)];
            const promises = this.getPromises(keys);

            this.currentPlayer.giveOptions(this.createDefaultAction(keys[0]), this.createPlayAction(keys[1]));
            this.update_();

            let result: AsyncData<AsyncPlay | {}>;
            try {
                result = await Promise.race([...promises, this.getPromise<AsyncPlay>(this.runningKey_)]);
            } catch (e) {
                // Server shut down.
                this.rejectRemaining(keys);
                return;
            }

            this.update_();
            switch (result.action) {
                case AsyncActions.DRAW:
                    await this.playerDraw();
                    gameOver = this.nextTurn();
                    break;

                case AsyncActions.PLAY:
                    await this.playerPlay((result as AsyncData<AsyncPlay>).data!.selection);
                    break;
            }

            this.rejectRemaining(keys);
        }

        this.clearPlayers_();
        if (gameOver) {
            await wait(500);
            this.announce(new Announcement(AnnouncementTypes.GAME_OVER, undefined, this.currentPlayer));
        }
    }

    async playerDraw() {
        const card = this.deck_.pick();
        this.announce(new Announcement(AnnouncementTypes.DRAW_CARD, card.prototype.type === CardTypes.BOMB ? [CardTypes.BOMB] : undefined, this.currentPlayer))
        await this.currentPlayer.drawCard(card, this);
        this.update_();
    }

    async playerPlay(selection: CardTypes[]) {
        this.currentPlayer.clearSelection();

        let target: Player | undefined;
        const play = plays.find(p => p.test(selection, this.currentPlayer, this));
        if (play !== undefined) {
            selection.forEach(type => this.currentPlayer.discardCard(type, this));
            this.update_();

            if (play.requireTarget(selection, this.currentPlayer, this)) {
                this.announce(new Announcement(AnnouncementTypes.SELECT_TARGET, selection, this.currentPlayer));
                target = (await this.selectTarget()).data!.target;
            }

            play.announce(selection, this.currentPlayer, this, target);
            if (!await this.processNopes(selection)) {
                await play.action(selection, this.currentPlayer, this, target);
            }

            this.update_();
        }
    }

    /**
     * Allows the current player to select a target (player).
     */
    selectTarget() {
        this.clearPlayers_();
        const options = this.players_.filter(player => player.alive && player !== this.currentPlayer);
        const key = this.createPromise<AsyncSelectPlayer>(AsyncActions.SELECT_PLAYER, {
            source: this.currentPlayer,
            options
        });
        this.currentPlayer.allowSelectTarget(options, this.createSelectPlayerAction(key));

        return this.getPromise<AsyncSelectPlayer>(key);
    }

    /**
     * Allows a player to select a card.
     * @param player The player that needs to select a card.
     * @param options The options that the player can choose from.
     */
    selectCard(player: Player, options: CardTypes[]) {
        this.clearPlayers_();
        const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
            player: this.currentPlayer,
            options
        });
        player.allowSelectCard(options, this.createSelectCardAction(key));

        return this.getPromise<AsyncSelectCard>(key);
    }

    async insertIntoDeck(type: CardTypes) {
        this.update_();
        this.clearPlayers_();
        const key = this.createPromise<AsyncInsertCard>(AsyncActions.INSERT_CARD, {
            player: this.currentPlayer,
            maxPosition: this.deck.cards.length
        });
        this.currentPlayer.allowInsertIntoDeck(this.deck.cards.length, this.createInsertCardAction(key));

        const position = (await this.getPromise<AsyncInsertCard>(key)).data!.position;
        this.announce(new Announcement(AnnouncementTypes.PUT_BOMB, undefined, this.currentPlayer));
        this.deck.insertCard(this.discardPile_.pop()!, position);
    }

    /**
     * Checks if anyone wants to nope the cards that are currently being played.
     * @param selection The cards that can be noped.
     */
    async processNopes(selection: CardTypes[]) {
        let result = false;

        let player: AsyncData<AsyncNope> | undefined;
        let excludedPlayer = this.currentPlayer;
        do {
            this.clearPlayers_();
            const keys = repeat(this.playerCount_).map((unused, i) => this.createPromise(AsyncActions.NOPE, { player: this.players_[i] }, Game.NOPE_TIMEOUT_MILLIS));
            const promises = this.getPromises<AsyncNope>(keys);
            keys.forEach((key, i) => {
                const card = this.players_[i].find(CardTypes.NOPE);
                if (excludedPlayer.id !== i && card !== undefined) {
                    this.players_[i].allowNope(this.createNopeAction(key));
                }
            });

            player = undefined;
            try {
                player = await Promise.race(promises);
            } catch (e) {
                // Timeout!
            }

            if (player !== undefined) {
                const target = excludedPlayer;
                excludedPlayer = player.data!.player;
                excludedPlayer.discardCard(CardTypes.NOPE, this);
                result = !result;

                this.announce(new Announcement(result ? AnnouncementTypes.NOPE : AnnouncementTypes.YUP, selection, excludedPlayer, target));
                this.update_();
            }
            selection = [CardTypes.NOPE];
        } while (player !== undefined);

        return result;
    }

    nextTurn(): boolean {
        if (this.playerQueue_.length === 0) {
            this.playerQueue_.push(this.getNextAlivePlayer_().id);
        }

        this.currentPlayer_ = this.playerQueue_.pop()!;

        // If the next player in the queue was dead, skip this turn.
        if (!this.currentPlayer.alive) {
            return this.nextTurn();
        }

        return this.players_.filter(player => player.alive).length <= 1;
    }

    processSkip() {
        this.nextTurn();
    }

    processAttack() {
        // Clear the queue! An attack means the next player has to play twice immidiately.
        this.playerQueue_ = [];

        this.nextTurn();
        this.playerQueue_.push(this.currentPlayer_);
    }

    async processFuture() {
        this.clearPlayers_();
        const future = this.deck.seeTop().map(card => card.prototype.type);
        const key = this.createPromise<AsyncSeeFuture>(AsyncActions.SEE_FUTURE, {
            player: this.currentPlayer,
            cards: future
        });
        this.currentPlayer.seeFuture(future, this.createDefaultAction(key));
        this.announce(new Announcement(AnnouncementTypes.FUTURE, undefined, this.currentPlayer));

        await this.getPromise<AsyncSeeFuture>(key);
    }

    private log(message: string, player?: Player, secret?: boolean) {
        // console.log(message);

        this.logs_.push({
            message,
            player,
            timestamp: Date.now()
        });
    }

    private getNextAlivePlayer_() {
        let currentPlayer: Player;
        do {
            currentPlayer = this.players[++this.currentPlayerIndex_ % this.players.length];
        } while (!currentPlayer.alive);
        return currentPlayer;
    }

    private update_() {
        if (this.updateCallback_) {
            this.updateCallback_();
        }
    }

    private clearPlayers_() {
        this.players_.forEach(player => player.clearCallbacks());
    }

    private createDefaultAction(key: string) {
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
