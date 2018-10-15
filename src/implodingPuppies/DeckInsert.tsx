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

    get index() {
        return clamp(0, Math.round((this.state.x - 35) / this.state.width * this.props.cards), this.props.cards);
    }

    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);

        this.state = {
            x: 10,
            width: 10
        }
    }

    componentDidMount() {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        node.addEventListener('mousemove', this.trackMouseX);
        node.addEventListener('touchmove', this.trackMouseX);
        window.addEventListener('resize', this.setWidth);
        this.setWidth();

    }

    componentWillUnmount() {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        node.removeEventListener('mousemove', this.trackMouseX);
        node.removeEventListener('touchmove', this.trackMouseX);
        window.removeEventListener('resize', this.setWidth);
    }

    setWidth = () => {
        const node = (ReactDOM.findDOMNode(this) as HTMLElement);
        this.setState({
            width: node.clientWidth - 160,
            x: node.clientWidth - 160
        });
    }

    trackMouseX = (event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        const clientX = (event as MouseEvent).clientX || (event as TouchEvent).touches[0].clientX;
        const rect = (ReactDOM.findDOMNode(this) as HTMLElement).getBoundingClientRect();
        this.setState({
            x: clamp(35, clientX - rect.left - 15, this.state.width + 35)
        });
    }

    getCardStyle(index: number) {
        const percent = index / this.props.cards;
        return {
            transform: `translateX(${50 + percent * this.state.width}px)`
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
        this.props.callback(this.props.cards - this.index);
    }

    render() {
        const { type, cards, callback, className, ...rest } = this.props;
        const index = this.index;

        return (
            <div className={classNames('imploding-puppies-card-insert', 'player-overlay', className)} onClick={this.onClick} {...rest}>
                {this.renderCards(index, 0)}
                <Card type={type} style={{ transform: `translate(${this.state.x - 50}px, 20px)` }} />
                {this.renderCards(cards - index, index)}
                <span className="count left-count">{index}<span>Bottom</span></span>
                <span className="count right-count">{this.props.cards - index}<span>Top</span></span>
            </div>
        );
    }
}

export default DeckInsert;
