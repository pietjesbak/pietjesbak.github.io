import './css/reset.css';

import './css/animation.css';
import './css/icons.css';
import './css/index.css';

import 'core-js/fn/symbol/iterator.js'; // Edge ლ(ಠ益ಠლ)
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();

export function blendColors(c0: string, c1: string, p: number) {
    const f = parseInt(c0.slice(1), 16);
    const t = parseInt(c1.slice(1), 16);
    const R1 = f >> 16;
    const G1 = (f >> 8) & 0x00FF;
    const B1 = f & 0x0000FF
    const R2 = t >> 16;
    const G2 = (t >> 8) & 0x00FF;
    const B2 = t & 0x0000FF;
    return '#' + (0x1000000 + (Math.round((R2 - R1) * p) + R1) * 0x10000 + (Math.round((G2 - G1) * p) + G1) * 0x100 + (Math.round((B2 - B1) * p) + B1)).toString(16).slice(1);
};

export function readableDate(date: Date, withHour: boolean) {
    return  date.toLocaleString('nl', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: withHour ? 'numeric' : undefined,
        minute: withHour ? 'numeric' : undefined
    });
};
