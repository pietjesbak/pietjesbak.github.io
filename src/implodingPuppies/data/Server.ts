import { Player } from './Player';
import { AsyncHandler, AsyncActions, AsyncData } from './AsyncHandler';
import { CardTypes, Card, cards } from './Cards';
import { shuffle, repeat } from '../../Helpers';
import { Deck } from './Deck';

export class Server extends AsyncHandler {

    static MAX_PLAYER_COUNT = 5;

    static NOPE_TIMEOUT_MILLIS = 2000;

    private players_: Player[] = [];

    private deck_: Deck;

    private playerCount_ = 0;

    private currentPlayer_ = 0;

    private playerQueue_: number[] = [];

    private slots_: string[];

    private startHandler_: (value: string) => void;

    constructor() {
        super();
    }

    get playerCount() {
        return this.playerCount_;
    }

    get currentPlayer() {
        return this.players_[this.currentPlayer_];
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
            this.startHandler_('Force start');
        }
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
                    deck.push(new Card(cards.get(type)!));
                }
            });

        shuffle(deck);
        for (let i = 0; i < this.playerCount_; i++) {
            const hand = deck.splice(0, 4);
            hand.push(new Card(cards.get(CardTypes.DEFUSE)!));
            this.players_[i].cards = hand;
        }

        for (let i = 0; i < this.playerCount_ - 1; i++) {
            deck.push(new Card(cards.get(CardTypes.BOMB)!));
        }

        for (let i = 0; i < 6 - this.playerCount_; i++) {
            deck.push(new Card(cards.get(CardTypes.DEFUSE)!));
        }

        shuffle(deck);
        this.deck_ = new Deck(deck);
    }

    async waitForPlayers(): Promise<Player[]> {
        this.slots_ = new Array(Server.MAX_PLAYER_COUNT).fill(null).map(() => this.createPromise(AsyncActions.JOIN));
        const forceStart = new Promise((resolve, reject) => this.startHandler_ = reject);
        const copy = [...this.slots_];

        // Wait for all slots to be filled or the force start to be called.
        const promises = this.getPromises(copy);
        await Promise.race([Promise.all(promises), forceStart.catch(reject => reject)]);

        // When the force start button is pressed, we reject the remaining slots, so all promises resolve.
        // Then we filter out the rejected ones.
        this.rejectRemaining(copy);
        let data = await Promise.all(promises.map(promise => promise.catch(reject => reject))) as AsyncData[];
        return data.filter(player => typeof player !== 'string')
            .map(d => d.data!['player']);
    }

    async gameLoop() {
        this.players_ = await this.waitForPlayers();
        this.initDeck();

        let gameOver = false;
        while (!gameOver) {
            const keys = [this.createPromise(AsyncActions.DRAW), this.createPromise(AsyncActions.PLAY)];
            const promises = this.getPromises(keys);
            this.currentPlayer.giveOptions(this.createDrawAction(keys[0]), this.createPlayAction(keys[1]));

            const result = await Promise.race(promises);
            switch (result.action) {
                case AsyncActions.DRAW:
                    this.playerDraw();
                    break;

                case AsyncActions.PLAY:
                    await this.playerPlay(result.data!['selection']);
                    break;
            }

            gameOver = this.nextTurn();
        }
    }

    playerDraw() {
        // this.currentPlayer.drawCard(this.deck_.pick());
    }

    async playerPlay(selection: CardTypes[]) {
        const noped = await this.processNopes();
        console.log('Player play', selection, noped);
    }

    async processNopes() {
        let result = true;

        let player;
        do {
            const keys = repeat(this.playerCount_).map((unused, i) => this.createPromise(AsyncActions.NOPE, { player: this.players_[i] }, Server.NOPE_TIMEOUT_MILLIS));
            const promises = this.getPromises(keys);
            keys.forEach((key, i) => {
                if (this.currentPlayer_ !== i) {
                    this.players_[i].allowNope(this.createNopeAction(key))
                }
            });

            player = await Promise.race(promises);
            console.log('nope handler', player);

            result = !result;

        } while (typeof player === 'string');

        return result;
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

    nextTurn() {
        if (this.playerQueue_.length === 0) {
            this.playerQueue_.push(++this.currentPlayer_ % this.players_.length);
        }

        this.currentPlayer_ = this.playerQueue_.pop()!;

        return false;
    }
}
