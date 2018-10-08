import { repeat, shuffle } from '../../Helpers';
import { Announcement, AnnouncementTypes } from './Announcement';
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

    get announcement() {
        return this.announcements_[this.announcements_.length - 1];
    }

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

    private startRoundKey_: string;

    private logs_: Logs[] = [];

    private updateCallback_: () => void;

    private announcements_: Announcement[] = [];

    private announcementCallback_?: (announcement: Announcement) => void;

    constructor(isHost: boolean, serializer?: ISerializer) {
        super();

        this.isHost_ = isHost;
        this.serializer_ = serializer || new TestSerializer();
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

    /**
     * Set the players for the client.
     * @param players The players
     */
    setPlayersClient(players: Player[]) {
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
    setDiscardClient(types: CardTypes[]) {
        this.discardPile_ = types.map(type => new Card(type));
    }

    startRound() {
        this.resolve(this.startRoundKey_);
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
        this.startRoundKey_ = this.createPromise(AsyncActions.START);
        this.players_ = await this.waitForPlayers();
        this.initDeck();
        this.waitForUpdates();
        this.update_();

        await this.getPromise(this.startRoundKey_);

        let gameOver = false;
        while (!gameOver) {
            this.clearPlayers_();
            const keys = [this.createPromise(AsyncActions.DRAW), this.createPromise(AsyncActions.PLAY)];
            const promises = this.getPromises(keys);
            this.currentPlayer.giveOptions(this.createDefaultAction(keys[0]), this.createPlayAction(keys[1]));

            let result: AsyncData<AsyncPlay | {}>;
            try {
                result = await Promise.race([...promises, this.getPromise(this.runningKey_)]);
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
            this.announce(new Announcement(AnnouncementTypes.GAME_OVER, undefined, this.currentPlayer));
        }
    }

    async playerDraw() {
        const card = this.deck_.pick();
        this.announce(new Announcement(AnnouncementTypes.DRAW_CARD, undefined, this.currentPlayer))
        await this.currentPlayer.drawCard(card, this);
        this.update_();
    }

    async playerPlay(selection: CardTypes[]) {
        this.currentPlayer.clearSelection();
        if (!this.currentPlayer.canPlay(selection)) {
            return;
        }

        selection.forEach(type => this.currentPlayer.discardCard(type, this));
        this.update_();

        if (selection.length === 1 && cards.get(selection[0])!.playEffect !== undefined) {
            const card = cards.get(selection[0])!;
            this.announce(new Announcement(AnnouncementTypes.PLAY_CARD, selection, this.currentPlayer));

            if (!await this.processNopes(selection)) {
                await card.playEffect!(this.currentPlayer, this);
            }

        } else if (selection.length === 2 && selection[0] === selection[1]) {
            this.announce(new Announcement(AnnouncementTypes.TWO_OF_A_KIND, selection, this.currentPlayer));

            if (!await this.processNopes(selection)) {
                const target = (await this.selectTarget()).data!.target;
                this.announce(new Announcement(AnnouncementTypes.STEAL_FROM, selection, this.currentPlayer, target));

                if (!await this.processNopes(selection)) {
                    const card = target.stealCard(undefined, this);
                    if (card !== undefined) {
                        this.currentPlayer.addCard(card, this);
                        this.announce(new Announcement(AnnouncementTypes.TAKE, undefined, this.currentPlayer, target));
                    }
                }
            }

        } else if (selection.length === 3 && selection.every(type => type === selection[0])) {
            this.announce(new Announcement(AnnouncementTypes.THREE_OF_A_KIND, selection, this.currentPlayer));

            if (!await this.processNopes(selection)) {
                const target = (await this.selectTarget()).data!.target;
                this.announce(new Announcement(AnnouncementTypes.STEAL_FROM, selection, this.currentPlayer, target));

                if (!await this.processNopes(selection)) {
                    const options = Object.values(CardTypes).filter(type => type !== CardTypes.BOMB);
                    const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
                        player: this.currentPlayer,
                        options
                    });
                    this.clearPlayers_();
                    this.currentPlayer.allowSelectCard(options, this.createSelectCardAction(key));
                    const selectedType = (await this.getPromise<AsyncSelectCard>(key)).data!.selection;
                    this.announce(new Announcement(AnnouncementTypes.WANTS, [selectedType], this.currentPlayer, target));

                    const selectedCard = target.stealCard(selectedType, this);
                    if (selectedCard !== undefined) {
                        this.currentPlayer.addCard(selectedCard, this);
                        this.announce(new Announcement(AnnouncementTypes.TAKE, [selectedType], this.currentPlayer, target));
                    }
                }
            }

        } else if (selection.length === 5 && new Set(selection).size === 5 && this.discardPile_.length > 0) {
            this.announce(new Announcement(AnnouncementTypes.FIVE_DIFFERENT, selection, this.currentPlayer));

            if (!await this.processNopes(selection)) {
                const type = (await this.selectCard()).data!.selection;
                const card = this.discardPile_.find(c => c.prototype.type === type)!;
                this.announce(new Announcement(AnnouncementTypes.TAKE, [type], this.currentPlayer));

                this.discardPile_.splice(this.discardPile_.indexOf(card), 1);
                this.currentPlayer.addCard(card, this);
            }
        }

        this.update_();
    }

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

    selectCard() {
        this.clearPlayers_();
        const options = [...new Set(this.discardPile_.map(card => card.prototype.type))].filter(type => type !== CardTypes.BOMB);
        const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
            player: this.currentPlayer,
            options
        });
        this.currentPlayer.allowSelectCard(options, this.createSelectCardAction(key));

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
                if (excludedPlayer.id !== i && this.players[i].find(CardTypes.NOPE) !== undefined) {
                    this.players_[i].allowNope(this.createNopeAction(key))
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

    nextTurn() {
        if (this.playerQueue_.length === 0) {
            this.playerQueue_.push(this.getNextAlivePlayer_());
        }

        this.currentPlayer_ = this.playerQueue_.pop()!;

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

    async processFavor() {
        const target = (await this.selectTarget()).data!.target;
        this.announce(new Announcement(AnnouncementTypes.FAVOR_FROM, undefined, this.currentPlayer, target));

        if (!await this.processNopes([CardTypes.FAVOR]) && target.cards.length > 0) {
            this.clearPlayers_();
            const options = [...new Set(target.cards.map(card => card.prototype.type))];
            const key = this.createPromise<AsyncSelectCard>(AsyncActions.SELECT_CARD, {
                player: this.currentPlayer,
                options
            });
            target.allowSelectCard(options, this.createSelectCardAction(key));
            const type = (await this.getPromise<AsyncSelectCard>(key)).data!.selection;
            const selectedCard = target.stealCard(type, this);
            if (selectedCard !== undefined) {
                this.currentPlayer.addCard(selectedCard, this);
                this.announce(new Announcement(AnnouncementTypes.TAKE, undefined, this.currentPlayer, target));
            }
        }
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
