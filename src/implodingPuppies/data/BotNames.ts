import { random, shuffle } from '../../Helpers';

const botNames = [
    'Echo',
    'Beta',
    'Indigo',
    'Juliet',
    'Mike',
    'Oscar',
    'Romeo',
    'Tango',
    'Victor',
    'Zulu'
];
export default botNames;

/**
 * Get a random bot name that is not yet in use.
 * @param blacklist A list of names that is already in use that should be avoided.
 */
export function getBotName(blacklist?: string[]) {
    if (blacklist === undefined || blacklist.length === 0) {
        return random(botNames);
    }

    let name = '';
    const options = shuffle([...botNames]);
    while (options.length > 0) {
        name = options.pop()!;
        if (!blacklist.includes(name)) {
            return name;
        }
    }

    // When all names are already used at least once, add a number.
    const num = blacklist.reduce((all, cur) => cur.includes(name) ? all + 1 : all, 1);
    return `${name} ${num}`;
}
