import classNames from 'classnames';
import * as React from 'react';

import '../css/Container.css';

export interface Props {
    test?: string;
    children?: React.ReactNode;
}

export function Container<T extends React.HTMLAttributes<React.Component>>(props: T & Props) {
    // @ts-ignore Spreading types with generics is not supported (yet).
    const { className, ...rest } = props;

    return (
        <div className={classNames(className, 'container')} {...rest} />
    );
}