import { repeat } from '../../Helpers';
import { Card, CardTypes } from './Cards';
import { Deck } from './Deck';
import { Game } from './Game';
import { Player } from './Player';
import { TestSerializer } from './Serializers';

function startServer(server: Game, players: Player[], count: number = 3, deck?: CardTypes[], playerCards?: CardTypes[], discardPile?: CardTypes[]) {
    for (let i = 0; i < count; i++) {
        players[i] = new Player();
        server.join(players[i]);
    }

    return server.forceStart()!
        .catch(reject => reject)
        .then(() => {
            deck = deck || repeat(10).map(() => CardTypes.PUPPY_1);
            playerCards = playerCards || [CardTypes.DEFUSE];
            discardPile = discardPile || [];

            const newPlayers = repeat(count).map((unused, i) => {
                const player = new Player();
                player.cards = playerCards!.map(type => new Card(type));
                return player;
            });

            (server['serializer_'] as TestSerializer).queueState({
                players: newPlayers,
                deck: deck!.map(type => new Card(type)),
                discardPile: discardPile!.map(type => new Card(type))
            });

            // Wait for the next event loop.
            return new Promise(resolve => setTimeout(resolve, 0));
        });
}

describe('Server', () => {
    Game.NOPE_TIMEOUT_MILLIS = 10;

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Works when 5 players join the server', (callback) => {
        const server = new Game(true);
        server.waitForPlayers().then(players => {
            server.shutDown();
            callback();
        });

        for (let i = 0; i < 5; i++) {
            server.join(new Player());
        }
    });

    it('Works when force start is called with less than 5 players.', (callback) => {
        const server = new Game(true);
        server.waitForPlayers().then(players => {
            callback();
        });

        for (let i = 0; i < 3; i++) {
            server.join(new Player());
        }

        server.forceStart();
    });

    it('A player can draw a card', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Game.prototype, 'playerDraw');
        jest.spyOn(Game.prototype, 'playerPlay');
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void) => {
            first ? drawFn() : server.shutDown();
            first = false;
        });

        server.gameLoop().then(() => {
            expect(server.playerDraw).toBeCalled();
            expect(server.playerPlay).not.toBeCalled();

            callback();
        });

        startServer(server, players);
    });

    it('A player can play one or more cards', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let turn = 0;
        jest.spyOn(Game.prototype, 'playerDraw');
        jest.spyOn(Game.prototype, 'playerPlay');
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void, playFn: (selection: CardTypes[]) => void) => {
            if (turn === 0) {
                playFn([CardTypes.ATTACK]);
            } else if (turn === 1) {
                playFn([CardTypes.SKIP]);
            } else {
                server.shutDown();
            }
            turn++;
        });

        server.gameLoop().then(() => {
            expect(server.playerDraw).not.toBeCalled();
            expect(server.playerPlay).toHaveBeenCalledTimes(2);
            expect(server.playerPlay).toBeCalledWith([CardTypes.ATTACK]);
            expect(server.playerPlay).toBeCalledWith([CardTypes.SKIP]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.ATTACK, CardTypes.SKIP]);
    });

    it('Noping should only be possible during the timeout', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        jest.spyOn(Player.prototype, 'allowNope');

        server.gameLoop();
        startServer(server, players, 3, undefined, [CardTypes.NOPE]).then(() => {
            server.processNopes().then(noped => {
                expect(noped).toBe(false);
                expect(Player.prototype.allowNope).toHaveBeenCalledTimes(2);

                server.shutDown();
                callback();
            });
        });
    });

    it('It should be possible to nope a card', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];
        const nopes: Array<() => void> = [];

        jest.spyOn(Player.prototype, 'allowNope').mockImplementation((fn: () => void) => nopes.push(fn));

        server.gameLoop();
        startServer(server, players, 3, undefined, [CardTypes.NOPE]).then(() => {
            const promise = server.processNopes();

            expect(nopes).toHaveLength(2);
            nopes[0]();

            promise.then(noped => {
                expect(noped).toBe(true);

                server.shutDown();
                callback();
            });
        });
    });

    it('It should be possible to nope a nope', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];
        const nopes = new Map<number, () => void>();

        jest.spyOn(Player.prototype, 'allowNope').mockImplementation(function (this: Player, fn: () => void) { nopes.set(this.id, fn) });

        server.gameLoop();
        startServer(server, players, 3, undefined, [CardTypes.NOPE]).then(() => {
            const promise = server.processNopes();

            expect([...nopes.keys()]).toEqual([1, 2]);
            nopes.get(1)!.call(null);
            nopes.clear();

            setTimeout(() => {
                expect([...nopes.keys()]).toEqual([0, 2]);
                nopes.get(0)!.call(null);
                nopes.clear();
            }, 0);

            promise.then(nope => {
                expect([...nopes.keys()]).toEqual([2]);
                expect(Player.prototype.allowNope).toHaveBeenCalledTimes(5);
                expect(nope).toBe(false);

                server.shutDown();
                callback();
            });
        });
    });

    it('A player plays a defuse when drawing a bomb', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void) => {
            first ? drawFn() : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowInsertIntoDeck').mockImplementation((maxPosition: number, insertCallback: (position: number) => void) => {
            expect(maxPosition).toBe(2);
            insertCallback(1);
        });

        server.gameLoop().then(() => {
            expect(Player.prototype.allowInsertIntoDeck).toBeCalled();
            expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE]);
            expect(server.deck.cards[1].prototype.type).toBe(CardTypes.BOMB);

            callback();
        });

        startServer(server, players, 3, [CardTypes.BOMB, CardTypes.PUPPY_1, CardTypes.PUPPY_2]);
    });

    it('A player plays a favor to gain a card', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void, playCallback: (selection: CardTypes[]) => void) => {
            first ? playCallback([CardTypes.FAVOR]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectTarget').mockImplementation(function (this: Player, options: Player[], selectCallback: (player: Player) => void) {
            expect(this.id).toBe(0);
            expect(options.map(player => player.id)).toEqual([1, 2]);
            selectCallback(players[1]);
        });
        jest.spyOn(Player.prototype, 'allowSelectCard').mockImplementation(function (this: Player, options: CardTypes[], selectCallback: (selection: CardTypes) => void) {
            expect(this.id).toBe(1);
            expect(options).toEqual([CardTypes.FAVOR]);
            selectCallback(CardTypes.FAVOR);
        });

        server.gameLoop().then(() => {
            expect(Player.prototype.allowSelectTarget).toBeCalled();
            expect(Player.prototype.allowSelectCard).toBeCalled();
            expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.FAVOR]);
            expect(server.players[1].cards.map(card => card.prototype.type)).toEqual([]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.FAVOR]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.FAVOR]);
    });

    it('A player plays a skip to not have to draw a card', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void, playCallback: (selection: CardTypes[]) => void) => {
            first ? playCallback([CardTypes.SKIP]) : server.shutDown();
            first = false;
        });

        server.gameLoop().then(() => {
            expect(server.currentPlayer.id).toBe(1);
            expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.SKIP]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.SKIP]);
    });

    it('A player plays an attack to not have to draw a card', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];
        const turns: number[] = [];

        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            turns.push(this.id);

            if (turns.length === 1) {
                playCallback([CardTypes.ATTACK]);
            } else if (turns.length <= 3) {
                drawFn();
            } else {
                server.shutDown();
            }
        });

        server.gameLoop().then(() => {
            expect(turns).toEqual([0, 1, 1, 2]);
            expect(server.players[1].cards.map(card => card.prototype.type)).toEqual([ CardTypes.ATTACK, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.ATTACK]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.ATTACK]);
    });

    it('A player plays a see the future to see the top 3 cards', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.FUTURE]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'seeFuture').mockImplementation(function (this: Player, cards: CardTypes, confirmFn: () => void) {
            expect(this.id).toBe(0);
            expect(cards).toEqual([CardTypes.BOMB, CardTypes.DEFUSE, CardTypes.ATTACK]);
            confirmFn();
        });

        server.gameLoop().then(() => {
            expect(Player.prototype.seeFuture).toBeCalled();
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.FUTURE]);

            callback();
        });

        startServer(server, players, 3, [CardTypes.BOMB, CardTypes.DEFUSE, CardTypes.ATTACK, CardTypes.PUPPY_1], [CardTypes.FUTURE]);
    });

    it('A player plays a shuffle to shuffle the deck', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.SHUFFLE]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Deck.prototype, 'shuffle');

        server.gameLoop().then(() => {
            expect(Deck.prototype.shuffle).toBeCalled();
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.SHUFFLE]);

            callback();
        });

        startServer(server, players, 3, [CardTypes.BOMB, CardTypes.DEFUSE, CardTypes.ATTACK], [CardTypes.SHUFFLE]);
    });

    it('A player plays 2 puppies to steal a card', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1, CardTypes.PUPPY_1]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectTarget').mockImplementation(function (this: Player, options: Player[], selectCallback: (player: Player) => void) {
            expect(this.id).toBe(0);
            expect(options.map(player => player.id)).toEqual([1, 2]);
            selectCallback(players[1]);
        });

        server.gameLoop().then(() => {
            expect(players[2].cards.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
    });

    it('A player plays 3 puppies to steal a card the target doesnt have', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectTarget').mockImplementation(function (this: Player, options: Player[], selectCallback: (player: Player) => void) {
            expect(this.id).toBe(0);
            expect(options.map(player => player.id)).toEqual([1, 2]);
            selectCallback(players[1]);
        });
        jest.spyOn(Player.prototype, 'allowSelectCard').mockImplementation(function (this: Player, options: CardTypes[], selectCallback: (selection: CardTypes) => void) {
            expect(this.id).toBe(0);
            expect(options).toEqual([CardTypes.DEFUSE, CardTypes.SHUFFLE, CardTypes.NOPE, CardTypes.SKIP, CardTypes.ATTACK, CardTypes.FAVOR, CardTypes.FUTURE, CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5]);
            selectCallback(CardTypes.DEFUSE);
        });

        server.gameLoop().then(() => {
            expect(players[2].cards.map(card => card.prototype.type)).toEqual([]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
    });

    it('A player plays 3 puppies to steal a card the target has', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectTarget').mockImplementation(function (this: Player, options: Player[], selectCallback: (player: Player) => void) {
            expect(this.id).toBe(0);
            expect(options.map(player => player.id)).toEqual([1, 2]);
            selectCallback(players[1]);
        });
        jest.spyOn(Player.prototype, 'allowSelectCard').mockImplementation(function (this: Player, options: CardTypes[], selectCallback: (selection: CardTypes) => void) {
            expect(this.id).toBe(0);
            expect(options).toEqual([CardTypes.DEFUSE, CardTypes.SHUFFLE, CardTypes.NOPE, CardTypes.SKIP, CardTypes.ATTACK, CardTypes.FAVOR, CardTypes.FUTURE, CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5]);
            selectCallback(CardTypes.DEFUSE);
        });

        server.gameLoop().then(() => {
            expect(players[2].cards.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE, CardTypes.DEFUSE]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.DEFUSE]);
    });

    it('A player plays 5 different cards to take a card from the discard pile', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectCard').mockImplementation(function (this: Player, options: CardTypes[], selectCallback: (selection: CardTypes) => void) {
            expect(this.id).toBe(0);
            expect(options).toEqual([CardTypes.DEFUSE, CardTypes.SHUFFLE, CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5]);
            selectCallback(CardTypes.DEFUSE);
        });

        server.gameLoop().then(() => {
            expect(players[2].cards.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.SHUFFLE, CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5], [CardTypes.DEFUSE, CardTypes.SHUFFLE]);
    });

    it('A player nopes another player trying to steal from him', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let first = true;
        let noped = false;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectTarget').mockImplementation(function (this: Player, options: Player[], selectCallback: (player: Player) => void) {
            expect(this.id).toBe(0);
            expect(options.map(player => player.id)).toEqual([1, 2]);
            selectCallback(players[1]);
        });
        jest.spyOn(Player.prototype, 'allowNope').mockImplementation(function (this: Player, nopeCallback: () => void) {
            if (this.id === 1 && !first && !noped) {
                noped = true;
                nopeCallback();
            }
        });

        server.gameLoop().then(() => {
            expect(players[2].cards.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE, CardTypes.NOPE]);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.NOPE]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.DEFUSE, CardTypes.NOPE]);
    });

    it('Attacking an attack means you dont have to play twice', (callback) => {
        const server = new Game(true);
        let players: Player[] = [];

        let turn = 0;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            turn < 2 ? playCallback([CardTypes.ATTACK]) : server.shutDown();
            turn++;
        });

        server.gameLoop().then(() => {
            expect(server.currentPlayer.id).toBe(2);
            expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.ATTACK, CardTypes.ATTACK]);

            callback();
        });

        startServer(server, players, 3, undefined, [CardTypes.ATTACK]);
    });
});
