import classNames from 'classnames';
import * as React from 'react';

import '../css/Container.css';

export interface Props {
    /**
     * Does the container contain an error? Affects the colors.
     */
    error?: boolean;

    /**
     * Required for some reason. Just means you can add children to the container.
     */
    children?: React.ReactNode;
}

export function Container<T extends React.HTMLAttributes<React.Component>>(props: T & Props) {
    // @ts-ignore Spreading types with generics is not supported (yet).
    const { className, error, ...rest } = props;

    return (
        <div className={classNames(className, 'container', {'error': error})} {...rest} />
    );
}