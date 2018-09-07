import * as React from 'react';

import classNames from 'classnames';

import '../css/TextPlaceholder.css';

type paragraphFnType = (index: number) => JSX.Element|JSX.Element[]|string;
export interface Props {
    renderTitle?: boolean;
    paragraphs?: number;
    paragraphSize?: number;
    paragraphFn?: paragraphFnType;
}

function renderParagraph(index: number, paragraphSize?: number, paragraphFn?: paragraphFnType) {
    if (paragraphFn !== undefined) {
        return paragraphFn(index);
    } else {
        return (
            <p key={index} className="placeholder-paragraph">
                {new Array(paragraphSize || 1).fill(null).map((empty, i) => <span key={i} className={i === (paragraphSize || 1) - 1 ? 'last': ''} />)}
            </p>
        );
    }
}

export function TextPlaceholder<T extends React.HTMLAttributes<React.Component>>(props: T & Props) {
    // @ts-ignore Spreading types with generics is not supported (yet).
    const { className, renderTitle, paragraphs, paragraphSize, paragraphFn, ...rest } = props;
    
    return (
        <div className={classNames(className, 'placeholder-text')}>
            {renderTitle !== false ? <div className="placeholder-title" /> : undefined}
            {new Array(paragraphs || 1).fill(null).map((empty, i) => renderParagraph(i, paragraphSize, paragraphFn))}
        </div>
    );
}