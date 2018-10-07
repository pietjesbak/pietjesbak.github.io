import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { Player as PlayerData } from './data/Player';

interface Props {
    player: PlayerData;
}

class RemotePlayer extends React.Component<Props & React.ClassAttributes<RemotePlayer>> {
    constructor(props: Props & React.ClassAttributes<RemotePlayer>) {
        super(props);
    }

    getCardStyles(index: number) {
        const count = this.props.player.cards.length - 1;
        const range = Math.sqrt(count / 2) * 36;

        return {
            transform: `translateX(${(-count / 2 + index) * 10}px) rotate(${(-count / 2 + index) * range / count}deg)`
        };
    }

    render() {
        return (
            <div className={classNames('imploding-puppies-player', 'remote-player')}>
                <div className="player player-avatar" style={{ background: this.props.player.color }}>
                    <span className="avatar">{this.props.player.avatar}</span>
                    <span className="name">{this.props.player.name}</span>
                </div>

                <div className="cards">
                    {this.props.player.cards.map((card, i) => <Card
                        style={this.getCardStyles(i)}
                        key={i}
                    />)}
                </div>
            </div>
        );
    }
}

export default RemotePlayer;
