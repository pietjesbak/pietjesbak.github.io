import './css/Card.css';

import classNames from 'classnames';
import * as React from 'react';
import { cards, CardTypes } from './data/Cards';

interface CardProps {
    type?: CardTypes;
    selected?: boolean;
    canSelect?: boolean;
}

export function Card<T extends React.HTMLAttributes<HTMLDivElement>>(props: T & CardProps) {
    // @ts-ignore Spreading types with generics is not supported (yet).
    const { className, type, selected, canSelect, style, ...rest } = props;

    if (type === undefined) {
        return (
            <div className={classNames(className, 'card', 'face-down', { 'selected': selected })} style={style} {...rest} />
        );
    } else {
        const card = cards.get(type)!;

        return (
            <div style={{ color: card.color, ...style }} className={classNames(className, 'card', { 'selected': selected }, { 'disabled': canSelect === false && !selected })} {...rest}>
                <span style={{ color: card.color }} className="card-value">{card.name}</span>
                <span className="card-face">{card.icon}</span>
            </div>
        );
    }
}

export default Card;
