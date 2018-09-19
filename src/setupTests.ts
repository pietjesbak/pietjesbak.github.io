import * as enzyme from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';

enzyme.configure({ adapter: new Adapter() });

// Mock the current date.
const DATE_TO_USE = new Date('September 19 2018 10:20');
const _Date = Date;
(window as any).Date = jest.fn((date) => typeof(date) === 'undefined' ? DATE_TO_USE : new _Date(date));
(window as any).Date.UTC = _Date.UTC;
(window as any).Date.parse = _Date.parse;
(window as any).Date.now = jest.fn(() => DATE_TO_USE.getTime());

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    get() { return this.parentNode; },
});

(window as any).HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
