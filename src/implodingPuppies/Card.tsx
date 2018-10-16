import './css/Card.css';

import classNames from 'classnames';
import * as React from 'react';
import { cards, CardTypes } from './data/Cards';

interface Props {
    type?: CardTypes;
    selected?: boolean;
    canSelect?: boolean;
    interactive?: boolean;
}

class Card extends React.PureComponent<Props & React.HTMLAttributes<HTMLDivElement>> {
    render() {
        let { className, type, selected, canSelect, interactive, style, ...rest } = this.props;

        if (type === undefined) {
            return (
                <div
                    className={classNames(className, 'card', 'face-down', { 'selected': selected })}
                    style={style}
                    {...rest} />
            );
        } else {
            const card = cards.get(type)!;

            return (
                <div
                    style={{ color: card.color, ...style }} className={classNames(className, 'card', { 'selected': selected }, { 'disabled': canSelect === false && !selected }, { 'interactive': interactive !== false })}
                    {...rest} >
                    <span style={{ color: card.color }} className="card-value">{card.icon} {card.name}</span>
                    <span className="card-face">{card.icon}</span>
                </div>
            );
        }
    };
}

export default Card;
