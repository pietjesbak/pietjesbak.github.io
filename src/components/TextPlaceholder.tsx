import '../css/TextPlaceholder.css';

import classNames from 'classnames';
import * as React from 'react';

type paragraphFnType = (index: number) => React.ReactNode;
export interface Props {
    /**
     * Render a title as the first element?
     */
    renderTitle?: boolean;

    /**
     * The amount of paragraphs to render.
     */
    paragraphs?: number;

    /**
     * The size (amount of vertical lines) of each paragraph.
     * Default 1.
     */
    paragraphSize?: number;

    /**
     * A custom function to overwrite the paragraph content.
     * When set, paragraphSize is ignored.
     */
    paragraphFn?: paragraphFnType;

    /**
     * An error message to show instead of the placeholder.
     */
    error?: string;
}

function renderParagraph(index: number, paragraphSize?: number, paragraphFn?: paragraphFnType) {
    if (paragraphFn !== undefined) {
        return paragraphFn(index);
    } else {
        return (
            <p key={index} className="placeholder-paragraph">
                {new Array(paragraphSize || 1).fill(null).map((empty, i) => <span key={i} />)}
            </p>
        );
    }
}

export function TextPlaceholder<T extends React.HTMLAttributes<React.Component>>(props: T & Props) {
    // @ts-ignore Spreading types with generics is not supported (yet).
    const { className, renderTitle, paragraphs, paragraphSize, paragraphFn, error, ...rest } = props;

    return (
        <div className={classNames(className, 'placeholder-text', { 'error': error })}>
            {error ? (
                <div className="placeholder-error">
                    <i className="icon-attention placeholder-error-icon" />
                    <span>{error}</span>
                </div>
            ) : null }

            {renderTitle !== false ? <div className="placeholder-title" /> : undefined}
            {new Array(paragraphs || 1).fill(null).map((empty, i) => renderParagraph(i, paragraphSize, paragraphFn))}
        </div>
    );
}