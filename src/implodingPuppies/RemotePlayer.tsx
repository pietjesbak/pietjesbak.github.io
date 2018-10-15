import classNames from 'classnames';
import * as React from 'react';
import Card from './Card';
import { Player as PlayerData } from './data/Player';

interface Props {
    player: PlayerData;
    small?: boolean;
}

class RemotePlayer extends React.Component<Props & React.HTMLAttributes<HTMLDivElement>> {
    private lastCardCount_ = 0;
    private lastAlive_ = true;

    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);
    }

    shouldComponentUpdate(newProps: Props & React.HTMLAttributes<HTMLDivElement>) {
        const shouldUpdate = this.props.player.cards.length !== this.lastCardCount_ || this.props.player.alive !== this.lastAlive_;
        this.lastCardCount_ = this.props.player.cards.length;
        this.lastAlive_ = this.props.player.alive;

        // Also check the transform prop. If there are more changing props in the future, consider a proper shallow compare.
        if (newProps.style && this.props.style && newProps.style.transform !== this.props.style.transform) {
            return true;
        }

        return shouldUpdate;
    }

    getCardStyles(index: number) {
        const count = this.props.player.cards.length - 1;
        const range = Math.sqrt(count / 2) * 36;

        return {
            transform: `translateX(${(-count / 2 + index) * 10}px) rotate(${(-count / 2 + index) * range / count}deg)`
        };
    }

    renderSmallCards() {
        return <span>🃏 {this.props.player.cards.length}</span>
    }

    renderCards() {
        return this.props.player.cards.map((card, i) => <Card
            style={this.getCardStyles(i)}
            key={i}
        />);
    }

    render() {
        const { player, small, className, ...rest } = this.props;
        return (
            <div className={classNames('imploding-puppies-player', 'remote-player', { 'small': small }, className)} {...rest}>
                <div className={classNames('player', 'player-avatar', { 'dead': !player.alive })} style={{ background: this.props.player.color }}>
                    <span className="avatar">{this.props.player.avatar}</span>
                    <span className="name">{this.props.player.name}</span>
                </div>

                <div className="cards">
                    {small ? this.renderSmallCards() : this.renderCards()}
                </div>
            </div>
        );
    }
}

export default RemotePlayer;
