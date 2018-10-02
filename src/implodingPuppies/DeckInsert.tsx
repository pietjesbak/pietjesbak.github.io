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
}

class DeckInsert extends React.PureComponent<Props & React.HTMLAttributes<HTMLDivElement>, State> {

    private width_ = 100;

    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);

        this.state = {
            x: 0
        }
    }

    componentDidMount() {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        node.addEventListener('mousemove', this.trackMouseX);
        this.width_ = node.clientWidth - 70;
    }

    componentWillUnmount() {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        node.removeEventListener('mousemove', this.trackMouseX);
    }

    trackMouseX = (event: MouseEvent) => {
        this.setState({
            x: Math.max(Math.min(event.layerX, this.width_), 0)
        });
    }

    getCardStyle(index: number) {
        const percent = index / this.props.cards;
        return {
            transform: `translateX(${clamp(0, percent * this.width_ * 2 - this.state.x / 2 - 35, this.width_) - 35}px)`
        };
    }

    renderCards(amount: number, offset: number) {
        return (
            repeat(amount).map((unused, i) => <Card
                    key={i+offset}
                    style={this.getCardStyle(i+offset)}
                    />)
        );
    }

    onClick = () => {
        const index = clamp(0, Math.round(this.state.x / this.width_ * this.props.cards), this.props.cards);
        this.props.callback(index);
    }

    render() {
        const { type, cards, callback, className, ...rest } = this.props;
        const index = clamp(0, Math.round(this.state.x / this.width_ * this.props.cards), cards);

        return (
            <div className={classNames('imploding-puppies-card-insert', className)} onClick={this.onClick} {...rest}>
                {this.renderCards(index, 0)}
                <Card type={type} style={{transform: `translate(${this.state.x - 35}px, 30px)`}} />
                {this.renderCards(cards - index, index)}
                <span className="left-count">{index}</span>
                <span className="right-count">{this.props.cards - index}</span>
            </div>
        );
    }
}

export default DeckInsert;
