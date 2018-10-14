import { repeat } from '../../Helpers';
import { Card, CardTypes } from './Cards';
import { Deck } from './Deck';
import { AsyncActions, Game } from './Game';
import { Player } from './Player';

function startServer(count: number = 3, deck?: CardTypes[], playerCards?: CardTypes[], discardPile?: CardTypes[]) {
    deck = deck || repeat(10).map(() => CardTypes.PUPPY_1);
    playerCards = playerCards || [CardTypes.DEFUSE];
    discardPile = discardPile || [];

    const server = new Game(true);
    const players = repeat(count).map((unused, i) => new Player('', i));
    server.setPlayers(players);

    const round = server.gameLoop();
    server['deck_'] = new Deck(deck!.map(type => new Card(type)));
    server.setDiscardClient(discardPile!.map(type => new Card(type)!));
    server.players.forEach(player => player.cards = playerCards!.map(type => new Card(type)));

    server.forceStart()!.catch(reject => reject);

    return {
        server,
        players,
        round
    };
}

describe('Server', () => {
    Game.NOPE_TIMEOUT_MILLIS = 10;

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Works when 9 players join the server', (callback) => {
        const server = new Game(true);
        server['startKey_'] = server.createPromise(AsyncActions.START);
        server.waitForPlayers().then(players => {
            server.shutDown();
            callback();
        });

        for (let i = 0; i < 9; i++) {
            server.join(new Player());
        }
    });

    it('Works when force start is called with less than 5 players.', (callback) => {
        const server = new Game(true);
        server['startKey_'] = server.createPromise(AsyncActions.START);
        server.waitForPlayers().then(players => {
            callback();
        });

        for (let i = 0; i < 3; i++) {
            server.join(new Player());
        }

        server.forceStart();
    });

    it('A player can draw a card', async () => {
        const { server, round } = startServer();

        let first = true;
        jest.spyOn(Game.prototype, 'playerDraw');
        jest.spyOn(Game.prototype, 'playerPlay');
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void) => {
            first ? drawFn() : server.shutDown();
            first = false;
        });

        await round;
        expect(server.playerDraw).toBeCalled();
        expect(server.playerPlay).not.toBeCalled();
    });

    it('A player can play one or more cards', async () => {
        const { server, round } = startServer(3, undefined, [CardTypes.ATTACK, CardTypes.SKIP]);

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

        await round;
        expect(server.playerDraw).not.toBeCalled();
        expect(server.playerPlay).toHaveBeenCalledTimes(2);
        expect(server.playerPlay).toBeCalledWith([CardTypes.ATTACK]);
        expect(server.playerPlay).toBeCalledWith([CardTypes.SKIP]);

    });

    it('Noping should only be possible during the timeout', (callback) => {
        const { server } = startServer(3, undefined, [CardTypes.NOPE]);

        jest.spyOn(Player.prototype, 'allowNope');

        server.processNopes([CardTypes.SKIP]).then(noped => {
            expect(noped).toBe(false);
            expect(Player.prototype.allowNope).toHaveBeenCalledTimes(2);

            server.shutDown();
            callback();
        });
    });

    it('It should be possible to nope a card', (callback) => {
        const { server } = startServer(3, undefined, [CardTypes.NOPE]);
        const nopes: Array<() => void> = [];

        jest.spyOn(Player.prototype, 'allowNope').mockImplementation((fn: () => void) => nopes.push(fn));

        const promise = server.processNopes([CardTypes.SKIP]);

        expect(nopes).toHaveLength(2);
        nopes[0]();

        promise.then(noped => {
            expect(noped).toBe(true);

            server.shutDown();
            callback();
        });
    });

    it('It should be possible to nope a nope', (callback) => {
        const { server } = startServer(3, undefined, [CardTypes.NOPE]);
        const nopes = new Map<number, () => void>();

        jest.spyOn(Player.prototype, 'allowNope').mockImplementation(function (this: Player, fn: () => void) { nopes.set(this.id, fn) });

        const promise = server.processNopes([CardTypes.SKIP]);

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

    it('A player plays a defuse when drawing a bomb', async () => {
        const { server, round } = startServer(3, [CardTypes.BOMB, CardTypes.PUPPY_1, CardTypes.PUPPY_2]);

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void) => {
            first ? drawFn() : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowInsertIntoDeck').mockImplementation((maxPosition: number, insertCallback: (position: number) => void) => {
            expect(maxPosition).toBe(2);
            insertCallback(1);
        });

        await round;
        expect(Player.prototype.allowInsertIntoDeck).toBeCalled();
        expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE]);
        expect(server.deck.cards[1].prototype.type).toBe(CardTypes.BOMB);
    });

    it('A player plays a favor to gain a card', async () => {
        const { server, round } = startServer(3, undefined, [CardTypes.FAVOR]);

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void, playCallback: (selection: CardTypes[]) => void) => {
            first ? playCallback([CardTypes.FAVOR]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Player.prototype, 'allowSelectTarget').mockImplementation(function (this: Player, options: Player[], selectCallback: (player: Player) => void) {
            expect(this.id).toBe(0);
            expect(options.map(player => player.id)).toEqual([1, 2]);
            selectCallback(options[0]);
        });
        jest.spyOn(Player.prototype, 'allowSelectCard').mockImplementation(function (this: Player, options: CardTypes[], selectCallback: (selection: CardTypes) => void) {
            expect(this.id).toBe(1);
            expect(options).toEqual([CardTypes.FAVOR]);
            selectCallback(CardTypes.FAVOR);
        });

        await round;
        expect(Player.prototype.allowSelectTarget).toBeCalled();
        expect(Player.prototype.allowSelectCard).toBeCalled();
        expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.FAVOR]);
        expect(server.players[1].cards.map(card => card.prototype.type)).toEqual([]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.FAVOR]);
    });

    it('A player plays a skip to not have to draw a card', async () => {
        const { server, round } = startServer(3, undefined, [CardTypes.SKIP]);

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation((drawFn: () => void, playCallback: (selection: CardTypes[]) => void) => {
            first ? playCallback([CardTypes.SKIP]) : server.shutDown();
            first = false;
        });

        await round;
        expect(server.currentPlayer.id).toBe(1);
        expect(server.players[0].cards.map(card => card.prototype.type)).toEqual([]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.SKIP]);
    });

    it('A player plays an attack to not have to draw a card', async () => {
        const { server, round } = startServer(3, undefined, [CardTypes.ATTACK]);
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

        await round;
        expect(turns).toEqual([0, 1, 1, 2]);
        expect(server.players[1].cards.map(card => card.prototype.type)).toEqual([CardTypes.ATTACK, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.ATTACK]);
    });

    it('A player plays a see the future to see the top 3 cards', async () => {
        const { server, round } = startServer(3, [CardTypes.BOMB, CardTypes.DEFUSE, CardTypes.ATTACK, CardTypes.PUPPY_1], [CardTypes.FUTURE]);

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

        await round;
        expect(Player.prototype.seeFuture).toBeCalled();
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.FUTURE]);
    });

    it('A player plays a shuffle to shuffle the deck', async () => {
        const { server, round } = startServer(3, [CardTypes.BOMB, CardTypes.DEFUSE, CardTypes.ATTACK], [CardTypes.SHUFFLE]);

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.SHUFFLE]) : server.shutDown();
            first = false;
        });
        jest.spyOn(Deck.prototype, 'shuffle');

        await round;
        expect(Deck.prototype.shuffle).toBeCalled();
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.SHUFFLE]);
    });

    it('A player plays 2 puppies to steal a card', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1]);

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

        await round;
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
    });

    it('A player plays 3 puppies to steal a card the target doesnt have', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);

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

        await round;
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
    });

    it('A player plays 3 puppies to steal a card the target has', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.DEFUSE]);

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

        await round;
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE, CardTypes.DEFUSE]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1]);
    });

    it('A player plays 5 different cards to take a card from the discard pile', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5], [CardTypes.DEFUSE, CardTypes.SHUFFLE]);

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

        await round;
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.SHUFFLE, CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5]);
    });

    it('A player nopes another player trying to steal from him', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.DEFUSE, CardTypes.NOPE]);

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

        await round;
        expect(noped).toBe(true);
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.DEFUSE, CardTypes.NOPE]);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.PUPPY_1, CardTypes.NOPE]);
    });

    it('Attacking an attack means you dont have to play twice', async () => {
        const { server, round } = startServer(3, undefined, [CardTypes.ATTACK]);

        let turn = 0;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            turn < 2 ? playCallback([CardTypes.ATTACK]) : server.shutDown();
            turn++;
        });

        await round;
        expect(server.currentPlayer.id).toBe(2);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.ATTACK, CardTypes.ATTACK]);
    });

    it('It is not possible to play a card without effect', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_2]);

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1]) : server.shutDown();
            first = false;
        });

        await round;
        expect(server.currentPlayer.id).toBe(0);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([]);
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_2]);
    });

    it('It is not possible to play incorrect combinations', async () => {
        const { players, server, round } = startServer(3, undefined, [CardTypes.PUPPY_1, CardTypes.PUPPY_2]);

        let first = true;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            first ? playCallback([CardTypes.PUPPY_1, CardTypes.PUPPY_2]) : server.shutDown();
            first = false;
        });

        await round;
        expect(server.currentPlayer.id).toBe(0);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([]);
        expect(players[0].cards.map(card => card.prototype.type)).toEqual([CardTypes.PUPPY_1, CardTypes.PUPPY_2]);
    });

    it('When a player dies by an attack he does not get to draw a second card', async () => {
        const { players, server, round } = startServer(3, [CardTypes.BOMB, CardTypes.BOMB], [CardTypes.ATTACK]);

        let turn = 0;
        jest.spyOn(Player.prototype, 'giveOptions').mockImplementation(function (this: Player, drawFn: () => void, playCallback: (selection: CardTypes[]) => void) {
            if (turn === 0) {
                playCallback([CardTypes.ATTACK]);
            } else if (turn === 1) {
                drawFn();
            } else {
                server.shutDown();
            }
            turn++;
        });

        await round;
        expect(server.currentPlayer.id).toBe(2);
        expect(server.discardPile.map(card => card.prototype.type)).toEqual([CardTypes.ATTACK, CardTypes.BOMB, CardTypes.ATTACK]);
        expect(players[1].alive).toBeFalsy();
    });
});
