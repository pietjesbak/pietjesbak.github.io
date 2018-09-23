import './css/Game.css';

import * as React from 'react';
import { Card } from './Card';
import { Game as GameData } from './data/Game';
import Player from './Player';

interface Props {
    playerCount: number;
}

interface State {
    game: GameData;
}

class Game extends React.Component<Props & React.ClassAttributes<Game>, State> {
    constructor(props: Props & React.ClassAttributes<Game>) {
        super(props);

        this.state = {
            game: new GameData(props.playerCount)
        }
    }

    getCallbacks(index: number) {
        if (index === 0) {
            return { onDraw: () => undefined, onPlay: () => undefined, onNope: () => undefined };
        }

        return undefined;
    }

    render() {
        return (
            <div className="imploding-puppies-game">
                {this.state.game.players.map((player, i) => <Player key={'p' + i} player={player} interactive={this.getCallbacks(i)} />)}
                {this.state.game.deck.cards.map((type, i) => <Card key={'c' + i} type={type} />)}
            </div>
        );
    }
}

export default Game;
