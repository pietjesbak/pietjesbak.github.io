/**
 * Blend to hex color.
 * @param c0 The first hex color.
 * @param c1 The second hex color.
 * @param p The percentage of the first color to blend with the second one.
 */
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

/**
 * Format a date to be humanreadable.
 * @param date The date to format.
 * @param withHour Include the hour and minutes in the output?
 */
export function readableDate(date: Date, withHour: boolean) {
    return date.toLocaleString('nl', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: withHour ? 'numeric' : undefined,
        minute: withHour ? 'numeric' : undefined
    });
};

/**
 * Shuffles an array in place.
 * @param a The array to shuffle.
 */
export function shuffle<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const x = a[i];
        a[i] = a[j];
        a[j] = x;
    }

    return a;
}

/**
 * Creates an empty array with the given amount of spots that can be mapped right away.
 * @param count The size of the array.
 */
export function repeat(count: number): null[] {
    return new Array(count).fill(null);
}

/**
 * Clamps the value between the min and max value.
 * @param min The minimum value.
 * @param value The actual value.
 * @param max The maximum value.
 */
export function clamp(min: number, value: number, max: number) {
    return Math.max(Math.min(value, max), min);
}

/**
 * Get a random element, number or character from the input.
 * @param param An array or string to get a random element from. Or a max value for a random number.
 * @param max When given, a random number between param and max is returned.
 */
export function random<T>(param: T[] | T, max?: number): T {
    if (typeof param === 'number') {
        if (max !== undefined) {
            return Math.floor(Math.random() * (max - param) + param) as any;
        } else {
            return Math.floor(Math.random() * param) as any;
        }
    } else {
        return param[random((param as any).length)];
    }
}

/**
 * Creates a promise that resolves after the given time.
 * @param milis The amount of miliseconds to wait.
 */
export function wait(milis: number) {
    return new Promise(resolve => {
        window.setTimeout(resolve, milis);
    });
}
