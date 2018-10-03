import classNames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { clamp, repeat } from '../Helpers';
import Card from './Card';
import { CardTypes } from './data/Cards';

interface Props {
    type: CardTypes;
    cards: number;
    callback: (position: number) => void;
}

interface State {
    x: number;
    width: number;
}

class DeckInsert extends React.PureComponent<Props & React.HTMLAttributes<HTMLDivElement>, State> {
    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);

        this.state = {
            x: 0,
            width: 100
        }
    }

    componentDidMount() {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        node.addEventListener('mousemove', this.trackMouseX);
        this.setState({
            width: node.clientWidth - 70
        });
    }

    componentWillUnmount() {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        node.removeEventListener('mousemove', this.trackMouseX);
    }

    trackMouseX = (event: MouseEvent) => {
        this.setState({
            x: clamp(0, event.layerX, this.state.width)
        });
    }

    getCardStyle(index: number) {
        const percent = index / this.props.cards;
        return {
            transform: `translateX(${percent * this.state.width + 17}px)`
        };
    }

    renderCards(amount: number, offset: number) {
        return (
            repeat(amount).map((unused, i) => <Card
                key={i + offset}
                interactive={false}
                style={this.getCardStyle(i + offset)}
            />)
        );
    }

    onClick = () => {
        const index = clamp(0, Math.round(this.state.x / this.state.width * this.props.cards), this.props.cards);
        this.props.callback(this.props.cards - index);
    }

    render() {
        const { type, cards, callback, className, ...rest } = this.props;
        const index = clamp(0, Math.ceil(this.state.x / this.state.width * this.props.cards), cards);

        return (
            <div className={classNames('imploding-puppies-card-insert', 'player-overlay', className)} onClick={this.onClick} {...rest}>
                {this.renderCards(index, 0)}
                <Card type={type} style={{ transform: `translate(${this.state.x - 35}px, 20px)` }} />
                {this.renderCards(cards - index, index)}
                <span className="count left-count">{index}</span>
                <span className="count right-count">{this.props.cards - index}</span>
            </div>
        );
    }
}

export default DeckInsert;
